import type {
  AdrenaiConfig,
  AgentId,
  GenerationManifest,
  Pack,
  PackType,
  PackValidationIssue,
  PackValidationResult,
} from "@adrenai/domain";

export { validateTaxonomyCatalog } from "./taxonomy.js";
export { validatePolicyCatalog } from "./policy.js";

const AGENTS = new Set<AgentId>([
  "claude-code",
  "codex",
  "cursor",
  "gemini",
  "github-copilot",
  "kiro",
  "generic",
]);
const PACK_ID = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;
const CATEGORY_ID = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const PACK_KEYS = new Set([
  "id",
  "version",
  "type",
  "title",
  "description",
  "appliesWhen",
  "strategyIds",
  "requires",
  "conflicts",
  "guidance",
  "checks",
]);
const APPLICABILITY_KEYS = new Set(["technologies", "agents"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(
  value: unknown,
  path: string,
  issues: PackValidationIssue[],
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push({ path, message: "must be an array of strings" });
    return [];
  }
  return [...new Set(value)];
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  issues: PackValidationIssue[],
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: key, message: "must be a non-empty string" });
    return "";
  }
  return value.trim();
}

export function validatePackManifest(value: unknown): PackValidationResult {
  const issues: PackValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  for (const key of Object.keys(value)) {
    if (!PACK_KEYS.has(key)) {
      issues.push({ path: key, message: "is not a supported pack field" });
    }
  }

  const id = requiredString(value, "id", issues);
  if (id && !PACK_ID.test(id)) {
    issues.push({ path: "id", message: "must use category/name lowercase format" });
  }
  const version = requiredString(value, "version", issues);
  if (version && !SEMVER.test(version)) {
    issues.push({ path: "version", message: "must be a full semantic version" });
  }
  const typeValue = requiredString(value, "type", issues);
  if (typeValue && !CATEGORY_ID.test(typeValue)) {
    issues.push({ path: "type", message: "must be a lowercase category id" });
  }

  const appliesWhen = isRecord(value.appliesWhen) ? value.appliesWhen : {};
  if (value.appliesWhen !== undefined && !isRecord(value.appliesWhen)) {
    issues.push({ path: "appliesWhen", message: "must be an object" });
  }
  for (const key of Object.keys(appliesWhen)) {
    if (!APPLICABILITY_KEYS.has(key)) {
      issues.push({ path: `appliesWhen.${key}`, message: "is not a supported field" });
    }
  }
  const agents = stringArray(appliesWhen.agents ?? [], "appliesWhen.agents", issues);
  for (const agent of agents) {
    if (!AGENTS.has(agent as AgentId)) {
      issues.push({ path: "appliesWhen.agents", message: `contains unknown agent ${agent}` });
    }
  }

  const pack: Pack = {
    id,
    version,
    type: typeValue as PackType,
    title: requiredString(value, "title", issues),
    description: requiredString(value, "description", issues),
    appliesWhen: {
      technologies: stringArray(
        appliesWhen.technologies ?? [],
        "appliesWhen.technologies",
        issues,
      ),
      agents: agents as AgentId[],
    },
    strategyIds: stringArray(value.strategyIds ?? [], "strategyIds", issues),
    requires: stringArray(value.requires ?? [], "requires", issues),
    conflicts: stringArray(value.conflicts ?? [], "conflicts", issues),
    guidance: stringArray(value.guidance ?? [], "guidance", issues),
    checks: stringArray(value.checks ?? [], "checks", issues),
  };

  for (const [path, ids] of [
    ["strategyIds", pack.strategyIds ?? []],
    ["requires", pack.requires],
    ["conflicts", pack.conflicts],
  ] as const) {
    for (const dependency of ids) {
      if (!PACK_ID.test(dependency)) {
        issues.push({ path, message: `contains invalid id ${dependency}` });
      }
    }
  }
  if (pack.requires.includes(pack.id) || pack.conflicts.includes(pack.id)) {
    issues.push({ path: "id", message: "pack cannot require or conflict with itself" });
  }

  return issues.length === 0
    ? { valid: true, issues, pack }
    : { valid: false, issues };
}

export function validateAdrenaiConfig(value: unknown): {
  valid: boolean;
  issues: PackValidationIssue[];
  config?: AdrenaiConfig;
} {
  const issues: PackValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  if (value.version !== 1) {
    issues.push({ path: "version", message: "must equal 1" });
  }
  const profile = requiredString(value, "profile", issues);
  if (value.mode !== "portable") {
    issues.push({ path: "mode", message: "must equal portable" });
  }
  const selectedPacks = stringArray(value.selected_packs, "selected_packs", issues);
  for (const id of selectedPacks) {
    if (!PACK_ID.test(id)) {
      issues.push({ path: "selected_packs", message: `contains invalid pack id ${id}` });
    }
  }
  const agentsRecord = isRecord(value.agents) ? value.agents : {};
  if (!isRecord(value.agents)) {
    issues.push({ path: "agents", message: "must be an object" });
  }
  const targets = stringArray(agentsRecord.targets, "agents.targets", issues);
  for (const agent of targets) {
    if (!AGENTS.has(agent as AgentId)) {
      issues.push({ path: "agents.targets", message: `contains unknown agent ${agent}` });
    }
  }
  if (targets.length === 0) {
    issues.push({ path: "agents.targets", message: "must contain at least one agent" });
  }
  return issues.length > 0
    ? { valid: false, issues }
    : {
        valid: true,
        issues,
        config: {
          version: 1,
          profile,
          mode: "portable",
          selectedPacks,
          agents: { targets: targets as AgentId[] },
        },
      };
}

export function validateGenerationManifest(value: unknown): {
  valid: boolean;
  issues: PackValidationIssue[];
  manifest?: GenerationManifest;
} {
  const issues: PackValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  if (value.version !== 1) {
    issues.push({ path: "version", message: "must equal 1" });
  }
  if (!Array.isArray(value.artifacts)) {
    issues.push({ path: "artifacts", message: "must be an array" });
    return { valid: false, issues };
  }
  const artifacts = value.artifacts.flatMap((artifact, index) => {
    if (!isRecord(artifact)) {
      issues.push({ path: `artifacts.${index}`, message: "must be an object" });
      return [];
    }
    const path = requiredString(artifact, "path", issues);
    const purpose = requiredString(artifact, "purpose", issues);
    const contentHash = requiredString(artifact, "contentHash", issues);
    if (contentHash && !/^[a-f0-9]{64}$/i.test(contentHash)) {
      issues.push({
        path: `artifacts.${index}.contentHash`,
        message: "must be a SHA-256 hexadecimal hash",
      });
    }
    return [{ path, purpose, contentHash }];
  });
  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, issues, manifest: { version: 1, artifacts } };
}
