import type {
  AgentConfiguration,
  AgentId,
  Diagnostic,
  DoctorReport,
  DriftReport,
  GenerationManifest,
  GeneratedArtifact,
  Evidence,
  InstructionRequirement,
  Pack,
  PackResolution,
  ProjectTechnology,
  ProjectSynthesisInput,
  RepositoryInspection,
  RepositoryRecommendation,
} from "@adrenai/domain";
import { generateAgentArtifacts } from "@adrenai/adapters";
import {
  validateAdrenaiConfig,
  validateGenerationManifest,
  validatePackManifest,
} from "@adrenai/schemas";
import { parse as parseYaml } from "yaml";
import { diagnoseInspectionHardening } from "./inspection-hardening.js";
import { generatePackLockfile } from "./sync.js";

export interface RepositoryFileSystem {
  listFiles(root: string): Promise<string[]>;
  readText(root: string, relativePath: string): Promise<string>;
}

export interface CatalogFileSystem {
  listFiles(root: string): Promise<string[]>;
  readText(root: string, relativePath: string): Promise<string>;
}

export interface CatalogLoadResult {
  packs: Pack[];
  diagnostics: Diagnostic[];
}

export interface ContentHasher {
  hash(content: string): string;
}

interface AgentDefinition {
  id: AgentId;
  configurationPatterns: RegExp[];
  skillPatterns: RegExp[];
}

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "codex",
    configurationPatterns: [/(^|\/)AGENTS\.md$/i, /(^|\/)\.codex\/.+/i],
    skillPatterns: [/(^|\/)\.codex\/skills\/.+\/SKILL\.md$/i],
  },
  {
    id: "claude-code",
    configurationPatterns: [
      /(^|\/)CLAUDE\.md$/i,
      /(^|\/)\.claude\/settings(?:\.local)?\.json$/i,
      /(^|\/)\.claude\/agents\/.+\.md$/i,
    ],
    skillPatterns: [/(^|\/)\.claude\/skills\/.+\/SKILL\.md$/i],
  },
  {
    id: "github-copilot",
    configurationPatterns: [
      /^\.github\/copilot-instructions\.md$/i,
      /^\.github\/instructions\/.+\.instructions\.md$/i,
    ],
    skillPatterns: [],
  },
  {
    id: "cursor",
    configurationPatterns: [/(^|\/)\.cursorrules$/i, /(^|\/)\.cursor\/rules\/.+/i],
    skillPatterns: [],
  },
  {
    id: "kiro",
    configurationPatterns: [
      /(^|\/)\.kiro\/steering\/.+\.md$/i,
      /(^|\/)\.kiro\/specs\/.+\.md$/i,
      /(^|\/)\.kiro\/hooks\/.+/i,
    ],
    skillPatterns: [],
  },
  {
    id: "gemini",
    configurationPatterns: [/(^|\/)GEMINI\.md$/i, /(^|\/)\.gemini\/.+/i],
    skillPatterns: [],
  },
  {
    id: "generic",
    configurationPatterns: [],
    skillPatterns: [/(^|\/)\.agents\/skills\/.+\/SKILL\.md$/i],
  },
];

const normalizePath = (path: string): string => path.replaceAll("\\", "/");
const MARKDOWN_INSTRUCTION = /\.(?:md|mdc)$/i;

function matches(path: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(path));
}

function evidenceFor(paths: string[], reason: string): Evidence[] {
  return paths.map((path) => ({ path, reason }));
}

function inspectAgents(files: string[]): AgentConfiguration[] {
  return AGENT_DEFINITIONS.flatMap((definition) => {
    const configurationFiles = files.filter((file) =>
      matches(file, definition.configurationPatterns),
    );
    const skillFiles = files.filter((file) => matches(file, definition.skillPatterns));

    if (configurationFiles.length === 0 && skillFiles.length === 0) {
      return [];
    }

    return [
      {
        agent: definition.id,
        configurationFiles,
        skillFiles,
        evidence: [
          ...evidenceFor(configurationFiles, "agent configuration file"),
          ...evidenceFor(skillFiles, "agent skill file"),
        ],
      },
    ];
  });
}

function technology(id: string, kind: ProjectTechnology["kind"], path: string): ProjectTechnology {
  return { id, kind, evidence: [{ path, reason: `${id} indicator` }] };
}

async function inspectTechnologies(
  root: string,
  files: string[],
  fileSystem: RepositoryFileSystem,
): Promise<ProjectTechnology[]> {
  const detected: ProjectTechnology[] = [];
  const fileSet = new Set(files.map((file) => file.toLowerCase()));

  if (fileSet.has("package.json")) {
    detected.push(technology("javascript", "language", "package.json"));
    try {
      const packageJson = JSON.parse(await fileSystem.readText(root, "package.json")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const dependencyDetectors: Array<[string, ProjectTechnology["kind"], string]> = [
        ["typescript", "language", "typescript"],
        ["nextjs", "framework", "next"],
        ["react", "framework", "react"],
        ["vitest", "test-tool", "vitest"],
        ["playwright", "test-tool", "@playwright/test"],
        ["jest", "test-tool", "jest"],
      ];
      for (const [id, kind, dependency] of dependencyDetectors) {
        if (dependency in dependencies) {
          detected.push(technology(id, kind, "package.json"));
        }
      }
    } catch {
      // Invalid package.json is reported by doctor in a later vertical slice.
    }
  }

  const fileDetectors: Array<[string, ProjectTechnology["kind"], string]> = [
    ["python", "language", "pyproject.toml"],
    ["python", "language", "requirements.txt"],
    ["pnpm", "package-manager", "pnpm-lock.yaml"],
    ["npm", "package-manager", "package-lock.json"],
    ["github-actions", "ci", ".github/workflows/"],
  ];

  for (const [id, kind, indicator] of fileDetectors) {
    const match = files.find((file) =>
      indicator.endsWith("/") ? file.startsWith(indicator) : file === indicator,
    );
    if (match && !detected.some((item) => item.id === id && item.kind === kind)) {
      detected.push(technology(id, kind, match));
    }
  }

  return detected;
}

export async function inspectRepository(
  root: string,
  fileSystem: RepositoryFileSystem,
): Promise<RepositoryInspection> {
  const files = (await fileSystem.listFiles(root)).map(normalizePath).sort();

  return {
    root,
    agents: inspectAgents(files),
    technologies: await inspectTechnologies(root, files, fileSystem),
  };
}

function hasTechnology(inspection: RepositoryInspection, id: string): boolean {
  return inspection.technologies.some((technology) => technology.id === id);
}

function technologyEvidence(inspection: RepositoryInspection, ids: string[]): Evidence[] {
  return inspection.technologies
    .filter((technology) => ids.includes(technology.id))
    .flatMap((technology) => technology.evidence);
}

function inferProfile(inspection: RepositoryInspection): string {
  if (hasTechnology(inspection, "nextjs")) {
    return "Next.js project baseline";
  }
  if (hasTechnology(inspection, "react")) {
    return "React project baseline";
  }
  if (hasTechnology(inspection, "typescript")) {
    return "TypeScript project baseline";
  }
  if (hasTechnology(inspection, "python")) {
    return "Python project baseline";
  }
  return "Portable repository baseline";
}

export function recommendRepository(
  inspection: RepositoryInspection,
): RepositoryRecommendation {
  const recommendations: RepositoryRecommendation["recommendations"] = [];

  if (inspection.agents.length === 0) {
    recommendations.push({
      id: "governance/portable-agent-baseline",
      title: "Create a portable agent baseline",
      reason:
        "No supported agent configuration was detected. A small AGENTS.md gives current and future agents shared repository guidance.",
      confidence: "high",
      evidence: [],
      proposedActions: ["Create AGENTS.md after approval", "Keep instructions agent-neutral"],
    });
  } else {
    recommendations.push({
      id: "governance/synchronize-agent-guidance",
      title: "Synchronize detected agent guidance",
      reason:
        "Multiple or existing agent configurations should share the same essential repository requirements.",
      confidence: "high",
      evidence: inspection.agents.flatMap((agent) => agent.evidence),
      proposedActions: [
        "Compare existing agent instructions",
        "Propose shared guidance without overwriting user content",
      ],
    });
  }

  if (hasTechnology(inspection, "typescript")) {
    recommendations.push({
      id: "development/typescript-baseline",
      title: "Add focused TypeScript development guidance",
      reason: "TypeScript is configured in this repository.",
      confidence: "high",
      evidence: technologyEvidence(inspection, ["typescript"]),
      proposedActions: ["Preserve strict typing", "Require type-checking before completion"],
    });
  }

  if (hasTechnology(inspection, "python")) {
    recommendations.push({
      id: "development/python-baseline",
      title: "Add focused Python development guidance",
      reason: "Python project files were detected.",
      confidence: "high",
      evidence: technologyEvidence(inspection, ["python"]),
      proposedActions: ["Preserve project conventions", "Run configured Python checks"],
    });
  }

  const testTools = ["vitest", "jest", "playwright"].filter((id) =>
    hasTechnology(inspection, id),
  );
  if (testTools.length > 0) {
    recommendations.push({
      id: "testing/use-existing-test-tools",
      title: "Require relevant existing tests",
      reason: "The repository already contains configured testing tools.",
      confidence: "high",
      evidence: technologyEvidence(inspection, testTools),
      proposedActions: [
        `Reference existing test tools: ${testTools.join(", ")}`,
        "Require tests proportional to behavioral risk",
      ],
    });
  }

  if (hasTechnology(inspection, "github-actions")) {
    recommendations.push({
      id: "operations/preserve-existing-workflows",
      title: "Preserve existing GitHub Actions workflows",
      reason: "Existing CI workflows should remain the source of truth for required checks.",
      confidence: "high",
      evidence: technologyEvidence(inspection, ["github-actions"]),
      proposedActions: ["Inspect workflow commands before recommending new quality gates"],
    });
  }

  recommendations.push({
    id: "security/secrets-protection",
    title: "Protect secrets and sensitive configuration",
    reason: "Every repository requires a minimum secrets-handling policy.",
    confidence: "high",
    evidence: [],
    proposedActions: ["Never expose or commit secrets", "Add a secret scan gate later"],
  });

  return {
    root: inspection.root,
    profile: inferProfile(inspection),
    recommendations,
  };
}

export function generatePortableSetup(
  inspection: RepositoryInspection,
  recommendation: RepositoryRecommendation = recommendRepository(inspection),
  packResolution?: PackResolution,
  agentTargets: AgentId[] = ["generic"],
): GeneratedArtifact[] {
  const technologyNames = inspection.technologies.map(({ id }) => id);
  const testTools = inspection.technologies
    .filter(({ kind }) => kind === "test-tool")
    .map(({ id }) => id);

  const agentLines = [
    "# Repository Guidance",
    "",
    "<!-- Managed by AdrenAI. Review changes before updating this section. -->",
    "",
    "## Core Rules",
    "",
    "- Understand existing code and instructions before editing.",
    "- Preserve established conventions unless a change is explicitly justified.",
    "- Keep changes scoped to the requested outcome.",
    "- Never expose secrets or claim checks passed unless they were run.",
    "- Add or update tests proportional to behavioral risk.",
  ];

  if (technologyNames.includes("typescript")) {
    agentLines.push("- Preserve strict TypeScript typing and run the configured type-check.");
  }
  if (technologyNames.includes("python")) {
    agentLines.push("- Preserve the repository's existing Python tooling and conventions.");
  }
  if (testTools.length > 0) {
    agentLines.push(`- Use the existing test tools when relevant: ${testTools.join(", ")}.`);
  }
  if (packResolution) {
    for (const guidance of new Set(packResolution.resolved.flatMap((pack) => pack.guidance))) {
      const rule = `- ${guidance}`;
      if (!agentLines.includes(rule)) {
        agentLines.push(rule);
      }
    }
  }

  const selectedPacks = (packResolution?.resolved.map(({ id }) => id) ??
    recommendation.recommendations.map(({ id }) => id)).map((id) => `  - ${id}`);
  const configLines = [
    "version: 1",
    `profile: ${JSON.stringify(recommendation.profile)}`,
    "mode: portable",
    "selected_packs:",
    ...selectedPacks,
    "agents:",
    "  targets:",
    ...agentTargets.map((agent) => `    - ${agent}`),
  ];

  return [
    {
      path: "AGENTS.md",
      purpose: "Portable shared guidance for supported AI coding agents.",
      content: `${agentLines.join("\n")}\n`,
    },
    {
      path: "adrenai.yaml",
      purpose: "Human-editable record of the selected AdrenAI profile.",
      content: `${configLines.join("\n")}\n`,
    },
  ];
}

export function generateManagedSetup(
  inspection: RepositoryInspection,
  recommendation: RepositoryRecommendation,
  packResolution: PackResolution,
  hasher: ContentHasher,
  requestedTargets?: AgentId[],
): GeneratedArtifact[] {
  const targets =
    requestedTargets && requestedTargets.length > 0
      ? requestedTargets
      : inspection.agents.length === 0
      ? (["generic"] as AgentId[])
      : inspection.agents.map(({ agent }) => agent);
  const agentArtifacts = generateAgentArtifacts(targets, { recommendation, packResolution });
  const configArtifact = generatePortableSetup(
    inspection,
    recommendation,
    packResolution,
    targets,
  ).find(({ path }) => path === "adrenai.yaml");
  const managedArtifacts = configArtifact ? [...agentArtifacts, configArtifact] : agentArtifacts;
  const manifest: GenerationManifest = {
    version: 1,
    artifacts: managedArtifacts.map(({ path, purpose, content }) => ({
      path,
      purpose,
      contentHash: hasher.hash(content),
    })),
  };

  return [
    ...managedArtifacts,
    {
      path: ".adrenai/generated.json",
      purpose: "AdrenAI managed-artifact ownership and drift manifest.",
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
  ];
}

export async function detectManagedDrift(
  root: string,
  fileSystem: RepositoryFileSystem,
  hasher: ContentHasher,
): Promise<DriftReport> {
  let value: unknown;
  try {
    value = JSON.parse(await fileSystem.readText(root, ".adrenai/generated.json"));
  } catch {
    return {
      root,
      diagnostics: [{
        id: "generation/missing-manifest",
        severity: "info",
        message: "No valid AdrenAI generation manifest was found.",
        evidence: [{ path: ".adrenai/generated.json", reason: "missing or invalid" }],
      }],
    };
  }

  const validation = validateGenerationManifest(value);
  if (!validation.valid || !validation.manifest) {
    return {
      root,
      diagnostics: [{
        id: "generation/invalid-manifest",
        severity: "error",
        message: "The AdrenAI generation manifest has an unsupported structure.",
        evidence: validation.issues.map(({ path, message }) => ({
          path: `.adrenai/generated.json:${path}`,
          reason: message,
        })),
      }],
    };
  }
  const manifest = validation.manifest;

  const diagnostics: Diagnostic[] = [];
  const repositoryFiles = new Set(
    (await fileSystem.listFiles(root)).map(normalizePath),
  );
  for (const artifact of manifest.artifacts) {
    const normalizedArtifactPath = normalizePath(artifact.path);
    if (
      normalizedArtifactPath.startsWith("/") ||
      /^[a-z]:\//i.test(normalizedArtifactPath) ||
      normalizedArtifactPath.split("/").includes("..")
    ) {
      diagnostics.push({
        id: "generation/unsafe-managed-path",
        severity: "error",
        message: `Managed artifact path ${artifact.path} escapes the repository boundary.`,
        evidence: [{ path: ".adrenai/generated.json", reason: "unsafe artifact path" }],
      });
      continue;
    }
    if (!repositoryFiles.has(normalizePath(artifact.path))) {
      diagnostics.push({
        id: "generation/missing-managed-file",
        severity: "warning",
        message: `Managed file ${artifact.path} is missing.`,
        evidence: [{ path: artifact.path, reason: "listed in generation manifest" }],
      });
      continue;
    }
    try {
      const content = await fileSystem.readText(root, artifact.path);
      if (hasher.hash(content) !== artifact.contentHash) {
        diagnostics.push({
          id: "generation/managed-file-drift",
          severity: "warning",
          message: `Managed file ${artifact.path} differs from its generated content.`,
          evidence: [{ path: artifact.path, reason: "content hash mismatch" }],
        });
      }
    } catch {
      diagnostics.push({
        id: "generation/unreadable-managed-file",
        severity: "warning",
        message: `Managed file ${artifact.path} could not be read.`,
        evidence: [{ path: artifact.path, reason: "read failed" }],
      });
    }
  }
  return { root, diagnostics };
}

export async function validateRepositoryConfiguration(
  root: string,
  fileSystem: RepositoryFileSystem,
): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const files = new Set((await fileSystem.listFiles(root)).map(normalizePath));
  if (!files.has("adrenai.yaml")) {
    return [{
      id: "configuration/missing-config",
      severity: "info",
      message: "No adrenai.yaml configuration was found.",
      evidence: [{ path: "adrenai.yaml", reason: "missing" }],
    }];
  }
  try {
    const content = await fileSystem.readText(root, "adrenai.yaml");
    let value: unknown;
    try {
      value = parseYaml(content);
    } catch {
      diagnostics.push({
        id: "configuration/invalid-yaml",
        severity: "error",
        message: "adrenai.yaml is not valid YAML.",
        evidence: [{ path: "adrenai.yaml", reason: "YAML parsing failed" }],
      });
      return diagnostics;
    }
    const validation = validateAdrenaiConfig(value);
    if (!validation.valid) {
      diagnostics.push({
        id: "configuration/invalid-config",
        severity: "error",
        message: "adrenai.yaml failed schema validation.",
        evidence: validation.issues.map(({ path, message }) => ({
          path: `adrenai.yaml:${path}`,
          reason: message,
        })),
      });
    }
  } catch {
    diagnostics.push({
      id: "configuration/unreadable-config",
      severity: "error",
      message: "adrenai.yaml could not be read.",
      evidence: [{ path: "adrenai.yaml", reason: "read failed" }],
    });
  }
  return diagnostics;
}

export async function validateLockedConfiguration(
  root: string,
  catalog: Pack[],
  fileSystem: RepositoryFileSystem,
  hasher: ContentHasher,
): Promise<Diagnostic[]> {
  const diagnostics = await validateRepositoryConfiguration(root, fileSystem);
  if (diagnostics.some(({ severity }) => severity === "error") || diagnostics.length > 0) {
    return diagnostics;
  }

  const value = parseYaml(await fileSystem.readText(root, "adrenai.yaml"));
  const validation = validateAdrenaiConfig(value);
  if (!validation.config) {
    return diagnostics;
  }
  const resolution = resolvePacks(catalog, validation.config.selectedPacks);
  diagnostics.push(...resolution.diagnostics);
  if (resolution.diagnostics.some(({ severity }) => severity === "error")) {
    return diagnostics;
  }
  const expected = JSON.parse(generatePackLockfile(resolution, hasher).content) as {
    version: number;
    packs: unknown[];
  };
  const files = new Set((await fileSystem.listFiles(root)).map(normalizePath));
  if (!files.has("adrenai.lock.json")) {
    diagnostics.push({
      id: "configuration/missing-lockfile",
      severity: "error",
      message: "adrenai.lock.json is missing.",
      evidence: [{ path: "adrenai.lock.json", reason: "regenerate with adrenai sync" }],
    });
    return diagnostics;
  }
  try {
    const current = JSON.parse(await fileSystem.readText(root, "adrenai.lock.json")) as {
      version?: number;
      packs?: unknown[];
    };
    if (
      current.version !== 1 ||
      JSON.stringify(current.packs) !== JSON.stringify(expected.packs)
    ) {
      diagnostics.push({
        id: "configuration/lockfile-drift",
        severity: "error",
        message: "adrenai.lock.json does not match the selected pack versions and content.",
        evidence: [{ path: "adrenai.lock.json", reason: "regenerate with adrenai sync" }],
      });
    }
  } catch {
    diagnostics.push({
      id: "configuration/unreadable-lockfile",
      severity: "error",
      message: "adrenai.lock.json could not be read.",
      evidence: [{ path: "adrenai.lock.json", reason: "read failed" }],
    });
  }
  return diagnostics;
}

function instructionScope(path: string): string {
  const normalized = normalizePath(path);
  const namedInstruction = /(^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$/i.test(normalized);
  if (!namedInstruction) {
    return "/";
  }
  const separator = normalized.lastIndexOf("/");
  return separator === -1 ? "/" : normalized.slice(0, separator);
}

function normalizeRequirement(text: string): {
  normalized: string;
  polarity: InstructionRequirement["polarity"];
} {
  const cleaned = text
    .replace(/[`*_]/g, "")
    .replace(/[.!;:]+$/g, "")
    .trim()
    .toLowerCase();
  const prohibition = /^(?:do not|don't|never|must not|avoid)\s+/i;
  return {
    normalized: cleaned.replace(prohibition, "").replace(/\s+/g, " "),
    polarity: prohibition.test(cleaned) ? "prohibit" : "require",
  };
}

export function parseInstructionRequirements(
  path: string,
  content: string,
): InstructionRequirement[] {
  const scope = instructionScope(path);
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/);
    if (!match?.[1]) {
      return [];
    }
    const text = match[1].trim();
    const normalized = normalizeRequirement(text);
    if (normalized.normalized.length < 3) {
      return [];
    }
    return [{
      text,
      normalized: normalized.normalized,
      polarity: normalized.polarity,
      source: normalizePath(path),
      scope,
      line: index + 1,
    }];
  });
}

function requirementEvidence(requirement: InstructionRequirement): Evidence {
  return {
    path: `${requirement.source}:${requirement.line}`,
    reason: `${requirement.polarity} rule in scope ${requirement.scope}`,
  };
}

function analyzeRequirements(requirements: InstructionRequirement[]): Diagnostic[] {
  const groups = new Map<string, InstructionRequirement[]>();
  for (const requirement of requirements) {
    const key = `${requirement.scope}\0${requirement.normalized}`;
    groups.set(key, [...(groups.get(key) ?? []), requirement]);
  }

  const diagnostics: Diagnostic[] = [];
  for (const group of groups.values()) {
    const sources = new Set(group.map(({ source }) => source));
    const polarities = new Set(group.map(({ polarity }) => polarity));
    if (polarities.size > 1) {
      diagnostics.push({
        id: "instructions/conflicting-requirements",
        severity: "error",
        message: `Conflicting requirements for "${group[0]?.normalized}" in scope ${group[0]?.scope}.`,
        evidence: group.map(requirementEvidence),
      });
    } else if (sources.size > 1) {
      diagnostics.push({
        id: "instructions/duplicate-requirements",
        severity: "warning",
        message: `Duplicate requirement "${group[0]?.normalized}" appears in multiple files for scope ${group[0]?.scope}.`,
        evidence: group.map(requirementEvidence),
      });
    }
  }
  return diagnostics;
}

function normalizeRelativeReference(source: string, reference: string): string {
  const sourceParts = normalizePath(source).split("/").slice(0, -1);
  const referenceParts = normalizePath(reference).split("/");
  const result = [...sourceParts];
  for (const part of referenceParts) {
    if (part === "." || part === "") {
      continue;
    }
    if (part === "..") {
      result.pop();
    } else {
      result.push(part);
    }
  }
  return result.join("/");
}

function relativeReferences(content: string): string[] {
  const references = new Set<string>();
  for (const match of content.matchAll(/\]\((?!https?:|#)([^)\s]+)\)/gi)) {
    if (match[1]) {
      references.add(match[1]);
    }
  }
  for (const match of content.matchAll(/`((?:\.\.?\/)[^`\s]+)`/g)) {
    if (match[1]) {
      references.add(match[1]);
    }
  }
  return [...references];
}

export async function doctorRepository(
  inspection: RepositoryInspection,
  fileSystem: RepositoryFileSystem,
): Promise<DoctorReport> {
  const repositoryFiles = new Set(
    (await fileSystem.listFiles(inspection.root)).map(normalizePath),
  );
  const paths = [
    ...new Set(
      inspection.agents
        .flatMap(({ configurationFiles, skillFiles }) => [...configurationFiles, ...skillFiles])
        .filter((path) => MARKDOWN_INSTRUCTION.test(path) || /\.cursorrules$/i.test(path)),
    ),
  ];
  const alwaysLoadedPaths = new Set(
    inspection.agents.flatMap(({ configurationFiles }) => configurationFiles),
  );
  const requirements: InstructionRequirement[] = [];
  const diagnostics: Diagnostic[] = await diagnoseInspectionHardening({
    root: inspection.root,
    files: [...repositoryFiles],
    fileSystem,
  });
  let instructionCharacters = 0;

  for (const path of paths) {
    try {
      const content = await fileSystem.readText(inspection.root, path);
      if (alwaysLoadedPaths.has(path)) {
        instructionCharacters += content.length;
      }
      requirements.push(...parseInstructionRequirements(path, content));
      for (const reference of relativeReferences(content)) {
        const resolved = normalizeRelativeReference(path, reference);
        if (!repositoryFiles.has(resolved)) {
          diagnostics.push({
            id: "instructions/broken-reference",
            severity: "warning",
            message: `Instruction file ${path} references missing file ${reference}.`,
            evidence: [{ path, reason: `missing reference resolves to ${resolved}` }],
          });
        }
      }
    } catch {
      diagnostics.push({
        id: "instructions/unreadable-file",
        severity: "error",
        message: `Unable to read instruction file ${path}.`,
        evidence: [{ path, reason: "read failed" }],
      });
    }
  }

  if (paths.length === 0) {
    diagnostics.push({
      id: "instructions/missing-configuration",
      severity: "info",
      message: "No supported Markdown agent instructions were detected.",
      evidence: [],
    });
  }

  diagnostics.push(...analyzeRequirements(requirements));
  const estimatedInstructionTokens = Math.ceil(instructionCharacters / 4);
  if (estimatedInstructionTokens > 700) {
    diagnostics.push({
      id: "instructions/context-budget-exceeded",
      severity: "warning",
      message: `Detected always-loaded instruction content is approximately ${estimatedInstructionTokens} tokens, above the recommended 700-token baseline.`,
      evidence: [...alwaysLoadedPaths].map((path) => ({
        path,
        reason: "included in token estimate",
      })),
    });
  }

  return {
    root: inspection.root,
    requirements,
    diagnostics,
    estimatedInstructionTokens,
  };
}

export async function collectProjectSynthesisInput(
  inspection: RepositoryInspection,
  fileSystem: RepositoryFileSystem,
): Promise<ProjectSynthesisInput> {
  const doctor = await doctorRepository(inspection, fileSystem);
  const files = (await fileSystem.listFiles(inspection.root)).map(normalizePath);
  const projectDocuments = files.filter((path) =>
    /^(?:README|REQUIREMENTS|ARCHITECTURE)\.md$/i.test(path) ||
    /^docs\/.+\.md$/i.test(path),
  );
  const requirements = [...doctor.requirements];
  for (const path of projectDocuments) {
    try {
      requirements.push(
        ...parseInstructionRequirements(path, await fileSystem.readText(inspection.root, path)),
      );
    } catch {
      doctor.diagnostics.push({
        id: "synthesis/unreadable-project-document",
        severity: "warning",
        message: `Unable to read project document ${path}.`,
        evidence: [{ path, reason: "read failed" }],
      });
    }
  }
  const unique = new Map(
    requirements.map((requirement) => [
      `${requirement.source}:${requirement.line}:${requirement.polarity}:${requirement.normalized}`,
      requirement,
    ]),
  );
  return {
    inspection,
    requirements: [...unique.values()],
    diagnostics: doctor.diagnostics,
  };
}

export async function loadPackCatalog(
  root: string,
  fileSystem: CatalogFileSystem,
): Promise<CatalogLoadResult> {
  const files = (await fileSystem.listFiles(root))
    .map(normalizePath)
    .filter((path) => path.endsWith("/pack.json") || path === "pack.json")
    .sort();
  const packs: Pack[] = [];
  const diagnostics: Diagnostic[] = [];
  const ids = new Map<string, string>();

  for (const path of files) {
    let value: unknown;
    try {
      value = JSON.parse(await fileSystem.readText(root, path));
    } catch {
      diagnostics.push({
        id: "catalog/invalid-json",
        severity: "error",
        message: `Pack manifest ${path} is not valid JSON.`,
        evidence: [{ path, reason: "JSON parsing failed" }],
      });
      continue;
    }

    const validation = validatePackManifest(value);
    if (!validation.valid || !validation.pack) {
      diagnostics.push({
        id: "catalog/invalid-pack",
        severity: "error",
        message: `Pack manifest ${path} failed validation.`,
        evidence: validation.issues.map((issue) => ({
          path: `${path}:${issue.path}`,
          reason: issue.message,
        })),
      });
      continue;
    }

    const previous = ids.get(validation.pack.id);
    if (previous) {
      diagnostics.push({
        id: "catalog/duplicate-pack-id",
        severity: "error",
        message: `Pack id ${validation.pack.id} is declared more than once.`,
        evidence: [
          { path: previous, reason: "first declaration" },
          { path, reason: "duplicate declaration" },
        ],
      });
      continue;
    }
    ids.set(validation.pack.id, path);
    packs.push(validation.pack);
  }

  return { packs, diagnostics };
}

export function resolvePacks(catalog: Pack[], requested: string[]): PackResolution {
  const byId = new Map(catalog.map((pack) => [pack.id, pack]));
  const diagnostics: Diagnostic[] = [];
  const resolved: Pack[] = [];
  const resolvedIds = new Set<string>();
  const visiting: string[] = [];

  const visit = (id: string): void => {
    if (resolvedIds.has(id)) {
      return;
    }
    const cycleStart = visiting.indexOf(id);
    if (cycleStart !== -1) {
      const cycle = [...visiting.slice(cycleStart), id];
      diagnostics.push({
        id: "catalog/dependency-cycle",
        severity: "error",
        message: `Pack dependency cycle detected: ${cycle.join(" -> ")}.`,
        evidence: cycle.map((path) => ({ path, reason: "cycle member" })),
      });
      return;
    }
    const pack = byId.get(id);
    if (!pack) {
      diagnostics.push({
        id: "catalog/missing-pack",
        severity: "error",
        message: `Required pack ${id} does not exist in the catalog.`,
        evidence: [{ path: id, reason: "missing pack id" }],
      });
      return;
    }

    visiting.push(id);
    for (const dependency of pack.requires) {
      visit(dependency);
    }
    visiting.pop();
    if (!resolvedIds.has(id)) {
      resolvedIds.add(id);
      resolved.push(pack);
    }
  };

  for (const id of [...new Set(requested)]) {
    visit(id);
  }

  for (const pack of resolved) {
    for (const conflict of pack.conflicts) {
      if (resolvedIds.has(conflict)) {
        diagnostics.push({
          id: "catalog/pack-conflict",
          severity: "error",
          message: `Pack ${pack.id} conflicts with selected pack ${conflict}.`,
          evidence: [
            { path: pack.id, reason: "declares conflict" },
            { path: conflict, reason: "selected conflicting pack" },
          ],
        });
      }
    }
  }

  return { requested: [...new Set(requested)], resolved, diagnostics };
}

export function resolveRecommendedPacks(
  inspection: RepositoryInspection,
  catalog: Pack[],
  recommendation: RepositoryRecommendation = recommendRepository(inspection),
): PackResolution {
  const resolution = resolvePacks(
    catalog,
    recommendation.recommendations.map(({ id }) => id),
  );
  const technologies = new Set(inspection.technologies.map(({ id }) => id));
  const agents = new Set(inspection.agents.map(({ agent }) => agent));

  for (const pack of resolution.resolved) {
    const requiredTechnologies = pack.appliesWhen.technologies ?? [];
    const requiredAgents = pack.appliesWhen.agents ?? [];
    if (
      requiredTechnologies.length > 0 &&
      !requiredTechnologies.some((technology) => technologies.has(technology))
    ) {
      resolution.diagnostics.push({
        id: "catalog/inapplicable-pack",
        severity: "warning",
        message: `Pack ${pack.id} does not match detected repository technologies.`,
        evidence: requiredTechnologies.map((path) => ({
          path,
          reason: "expected technology",
        })),
      });
    }
    if (requiredAgents.length > 0 && !requiredAgents.some((agent) => agents.has(agent))) {
      resolution.diagnostics.push({
        id: "catalog/inapplicable-pack",
        severity: "warning",
        message: `Pack ${pack.id} does not match detected agent configurations.`,
        evidence: requiredAgents.map((path) => ({ path, reason: "expected agent" })),
      });
    }
  }

  return resolution;
}

export * from "./checks.js";
export * from "./ai.js";
export * from "./inspection-hardening.js";
export * from "./selection.js";
export * from "./session.js";
export * from "./synthesis.js";
export * from "./sync.js";
