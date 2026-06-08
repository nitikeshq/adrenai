import type {
  Diagnostic,
  PackResolution,
  RepositoryInspection,
} from "@adrenai/domain";

export { evaluateQualityGateResults } from "@adrenai/domain";
export type { QualityGateEvaluation } from "@adrenai/domain";

export type QualityGateCategory =
  | "build"
  | "lint"
  | "security"
  | "test"
  | "typecheck";

export interface QualityGatePlan {
  id: string;
  title: string;
  category: QualityGateCategory;
  command: {
    executable: string;
    args: string[];
  };
  required: boolean;
  requiresApproval: true;
  timeoutMs: number;
  configuredScript?: string;
}

export interface QualityGatePlanningOptions {
  packageScripts?: string[];
  packageScriptCommands?: Record<string, string>;
}

export interface QualityGatePlanningResult {
  plans: QualityGatePlan[];
  diagnostics: Diagnostic[];
}

const SCRIPT_CHECKS: Record<
  string,
  { category: QualityGateCategory; scripts: string[]; title: string }
> = {
  "configured-python-checks": {
    category: "lint",
    scripts: ["check", "lint", "typecheck"],
    title: "Configured Python checks",
  },
  "configured-tests": {
    category: "test",
    scripts: ["test"],
    title: "Configured repository tests",
  },
  "configured-typecheck": {
    category: "typecheck",
    scripts: ["typecheck", "check"],
    title: "Configured type check",
  },
  "secret-scan": {
    category: "security",
    scripts: ["secret-scan", "security"],
    title: "Configured secret scan",
  },
};

function packageManager(inspection: RepositoryInspection): "bun" | "npm" | "pnpm" | "yarn" {
  const detected = new Set(inspection.technologies.map(({ id }) => id));
  if (detected.has("pnpm")) return "pnpm";
  if (detected.has("yarn")) return "yarn";
  if (detected.has("bun")) return "bun";
  return "npm";
}

function packageScriptCommand(
  manager: ReturnType<typeof packageManager>,
  script: string,
): QualityGatePlan["command"] {
  if (manager === "pnpm" || manager === "yarn") {
    const managerArgs =
      manager === "yarn"
        ? [manager, script]
        : script === "test"
          ? [manager, "test"]
          : [manager, "run", script];
    return { executable: "corepack", args: managerArgs };
  }
  if (script === "test") {
    return { executable: manager, args: ["test"] };
  }
  return { executable: manager, args: ["run", script] };
}

export function planQualityGates(
  inspection: RepositoryInspection,
  resolution: PackResolution,
  options: QualityGatePlanningOptions = {},
): QualityGatePlanningResult {
  const plans: QualityGatePlan[] = [];
  const diagnostics: Diagnostic[] = [];
  const scripts = new Set(options.packageScripts ?? []);
  const checkIds = [
    ...new Set(resolution.resolved.flatMap((pack) => pack.checks)),
  ].sort();
  const manager = packageManager(inspection);

  for (const checkId of checkIds) {
    if (checkId === "existing-ci-workflows") {
      diagnostics.push({
        id: "checks/ci-gate-not-local",
        severity: "info",
        message: "Existing CI workflows remain authoritative and are not executed locally.",
        evidence: [{ path: checkId, reason: "CI-only quality gate" }],
      });
      continue;
    }

    const definition = SCRIPT_CHECKS[checkId];
    if (!definition) {
      diagnostics.push({
        id: "checks/unknown-check",
        severity: "warning",
        message: `No safe executable plan is defined for check ${checkId}.`,
        evidence: [{ path: checkId, reason: "unknown check id" }],
      });
      continue;
    }

    const script = definition.scripts.find((candidate) => scripts.has(candidate));
    if (!script) {
      diagnostics.push({
        id: "checks/missing-configured-command",
        severity: "warning",
        message: `Check ${checkId} requires a recognized configured package script.`,
        evidence: definition.scripts.map((path) => ({
          path,
          reason: "accepted package script",
        })),
      });
      continue;
    }

    plans.push({
      id: checkId,
      title: definition.title,
      category: definition.category,
      command: packageScriptCommand(manager, script),
      required: true,
      requiresApproval: true,
      timeoutMs: definition.category === "test" ? 10 * 60 * 1_000 : 5 * 60 * 1_000,
      configuredScript: options.packageScriptCommands?.[script],
    });
  }

  return { plans, diagnostics };
}
