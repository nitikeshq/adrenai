import type { Diagnostic, Evidence } from "@adrenai/domain";

export interface InspectionHardeningFileSystem {
  readText(root: string, relativePath: string): Promise<string>;
}

export interface InspectionHardeningOptions {
  maxFiles?: number;
  maxInstructionFiles?: number;
  maxInstructionCharacters?: number;
}

export interface InspectionHardeningInput {
  root: string;
  files: string[];
  fileSystem: InspectionHardeningFileSystem;
}

const DEFAULT_MAX_FILES = 50_000;
const DEFAULT_MAX_INSTRUCTION_FILES = 500;
const DEFAULT_MAX_INSTRUCTION_CHARACTERS = 1_000_000;

const PACKAGE_MANAGERS = [
  { id: "npm", patterns: [/^package-lock\.json$/i, /^npm-shrinkwrap\.json$/i] },
  { id: "pnpm", patterns: [/^pnpm-lock\.yaml$/i] },
  { id: "yarn", patterns: [/^yarn\.lock$/i] },
  { id: "bun", patterns: [/^bun\.lockb?$/i] },
] as const;

const INSTRUCTION_PATTERNS = [
  /(^|\/)AGENTS\.md$/i,
  /(^|\/)CLAUDE\.md$/i,
  /(^|\/)GEMINI\.md$/i,
  /^\.github\/copilot-instructions\.md$/i,
  /^\.github\/instructions\/.+\.instructions\.md$/i,
  /^\.cursor\/rules\/.+\.(md|mdc)$/i,
  /^\.kiro\/(steering|specs|hooks)\/.+\.md$/i,
  /^\.claude\/(skills|agents)\/.+\.md$/i,
  /^\.codex\/.+\.md$/i,
  /^\.agents\/skills\/.+\.md$/i,
];

const SUSPICIOUS_INSTRUCTION_PATTERNS = [
  {
    id: "override-instructions",
    pattern: /\b(ignore|disregard|override)\b.{0,40}\b(previous|prior|system|developer)\b.{0,20}\binstructions?\b/i,
    reason: "attempts to override higher-priority instructions",
  },
  {
    id: "secret-exfiltration",
    pattern: /\b(send|upload|post|exfiltrate|transmit)\b.{0,50}\b(secrets?|credentials?|api[-_ ]?keys?|tokens?|\.env)\b/i,
    reason: "requests transmission of secrets or credentials",
  },
  {
    id: "security-bypass",
    pattern: /\b(disable|bypass|skip|evade)\b.{0,40}\b(security|safety|approval|permission|policy|protections?)\b/i,
    reason: "requests bypassing a security or approval control",
  },
] as const;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function evidence(path: string, reason: string): Evidence[] {
  return [{ path, reason }];
}

export function diagnosePackageJson(content: string, path = "package.json"): Diagnostic[] {
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return [{
        id: "inspection/invalid-package-json",
        severity: "warning",
        message: `${path} must contain a JSON object.`,
        evidence: evidence(path, "package manifest is not a JSON object"),
      }];
    }
    return [];
  } catch {
    return [{
      id: "inspection/invalid-package-json",
      severity: "warning",
      message: `${path} contains invalid JSON and could not be inspected safely.`,
      evidence: evidence(path, "package manifest could not be parsed"),
    }];
  }
}

export function diagnoseDuplicatePackageManagers(files: string[]): Diagnostic[] {
  const normalized = files.map(normalizePath);
  const detected = PACKAGE_MANAGERS.flatMap(({ id, patterns }) => {
    const paths = normalized.filter((path) => patterns.some((pattern) => pattern.test(path)));
    return paths.length > 0 ? [{ id, paths }] : [];
  });

  if (detected.length <= 1) {
    return [];
  }

  return [{
    id: "inspection/duplicate-package-managers",
    severity: "warning",
    message: `Multiple JavaScript package managers were detected: ${detected.map(({ id }) => id).join(", ")}.`,
    evidence: detected.flatMap(({ id, paths }) =>
      paths.map((path) => ({ path, reason: `${id} package-manager lockfile` }))),
  }];
}

export function isInstructionFile(path: string): boolean {
  const normalized = normalizePath(path);
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function diagnoseSuspiciousInstructionContent(
  path: string,
  content: string,
): Diagnostic[] {
  return SUSPICIOUS_INSTRUCTION_PATTERNS.flatMap(({ id, pattern, reason }) => {
    if (!pattern.test(content)) {
      return [];
    }
    return [{
      id: `instructions/suspicious-${id}`,
      severity: "warning" as const,
      message: `${path} contains suspicious instruction content that ${reason}.`,
      evidence: evidence(path, reason),
    }];
  });
}

export function diagnoseFileScanLimit(
  files: string[],
  maxFiles = DEFAULT_MAX_FILES,
): Diagnostic[] {
  if (files.length <= maxFiles) {
    return [];
  }
  return [{
    id: "inspection/file-scan-limit-exceeded",
    severity: "warning",
    message: `Repository contains ${files.length} files, above the configured scan limit of ${maxFiles}. Results may be incomplete.`,
    evidence: evidence(".", `${files.length} files exceed the ${maxFiles}-file scan limit`),
  }];
}

export async function diagnoseInspectionHardening(
  input: InspectionHardeningInput,
  options: InspectionHardeningOptions = {},
): Promise<Diagnostic[]> {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxInstructionFiles = options.maxInstructionFiles ?? DEFAULT_MAX_INSTRUCTION_FILES;
  const maxInstructionCharacters =
    options.maxInstructionCharacters ?? DEFAULT_MAX_INSTRUCTION_CHARACTERS;
  const files = input.files.map(normalizePath).sort();
  const diagnostics = [
    ...diagnoseFileScanLimit(files, maxFiles),
    ...diagnoseDuplicatePackageManagers(files),
  ];

  if (files.includes("package.json")) {
    try {
      diagnostics.push(...diagnosePackageJson(
        await input.fileSystem.readText(input.root, "package.json"),
      ));
    } catch {
      diagnostics.push({
        id: "inspection/unreadable-package-json",
        severity: "warning",
        message: "package.json could not be read.",
        evidence: evidence("package.json", "package manifest could not be read"),
      });
    }
  }

  const instructionFiles = files.filter(isInstructionFile);
  if (instructionFiles.length > maxInstructionFiles) {
    diagnostics.push({
      id: "inspection/instruction-file-scan-limit-exceeded",
      severity: "warning",
      message: `Detected ${instructionFiles.length} instruction files, above the configured scan limit of ${maxInstructionFiles}.`,
      evidence: evidence(".", "instruction-file scan limit exceeded"),
    });
  }

  let scannedCharacters = 0;
  let instructionContentLimitExceeded = false;
  for (const path of instructionFiles.slice(0, maxInstructionFiles)) {
    if (scannedCharacters >= maxInstructionCharacters) {
      break;
    }
    try {
      const content = await input.fileSystem.readText(input.root, path);
      const remainingCharacters = maxInstructionCharacters - scannedCharacters;
      const inspectedContent = content.slice(0, remainingCharacters);
      scannedCharacters += inspectedContent.length;
      instructionContentLimitExceeded ||= content.length > remainingCharacters;
      diagnostics.push(...diagnoseSuspiciousInstructionContent(path, inspectedContent));
    } catch {
      // Existing doctor analysis owns unreadable instruction-file diagnostics.
    }
  }

  if (
    instructionContentLimitExceeded ||
    (instructionFiles.length > maxInstructionFiles &&
      scannedCharacters >= maxInstructionCharacters)
  ) {
    diagnostics.push({
      id: "inspection/instruction-content-scan-limit-exceeded",
      severity: "warning",
      message: `Instruction content exceeded the configured scan limit of ${maxInstructionCharacters} characters.`,
      evidence: evidence(".", "instruction-content scan limit exceeded"),
    });
  }

  return diagnostics;
}
