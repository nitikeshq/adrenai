import type { Diagnostic } from "./index.js";

export type PolicyScope =
  | "universal"
  | "category"
  | "organization"
  | "project"
  | "workflow"
  | "phase"
  | "session";

export type PolicyEnforcement = "advisory" | "enforceable";

export interface PolicyRule {
  id: string;
  key: string;
  statement: string;
  enforcement: PolicyEnforcement;
  overrideAllowed: boolean;
  mandatoryGateIds: string[];
}

export interface PolicyLayer {
  id: string;
  version: string;
  scope: PolicyScope;
  target?: string;
  rules: PolicyRule[];
}

export interface PolicyCatalog {
  schemaVersion: 1;
  layers: PolicyLayer[];
}

export interface PolicyResolution {
  rules: PolicyRule[];
  mandatoryGateIds: string[];
  diagnostics: Diagnostic[];
}

const SCOPE_PRECEDENCE: Record<PolicyScope, number> = {
  universal: 0,
  category: 1,
  organization: 2,
  project: 3,
  workflow: 4,
  phase: 5,
  session: 6,
};

export function resolvePolicyLayers(layers: PolicyLayer[]): PolicyResolution {
  const ordered = [...layers].sort(
    (left, right) =>
      SCOPE_PRECEDENCE[left.scope] - SCOPE_PRECEDENCE[right.scope] ||
      left.id.localeCompare(right.id),
  );
  const selected = new Map<string, { layer: PolicyLayer; rule: PolicyRule }>();
  const diagnostics: Diagnostic[] = [];

  for (const layer of ordered) {
    for (const rule of layer.rules) {
      const current = selected.get(rule.key);
      if (!current) {
        selected.set(rule.key, { layer, rule });
        continue;
      }
      if (current.layer.scope === layer.scope) {
        diagnostics.push({
          id: "policy/same-scope-conflict",
          severity: "error",
          message: `Policy key ${rule.key} is declared more than once at ${layer.scope} scope.`,
          evidence: [
            { path: current.rule.id, reason: "existing rule" },
            { path: rule.id, reason: "conflicting rule" },
          ],
        });
        continue;
      }
      if (!current.rule.overrideAllowed) {
        diagnostics.push({
          id: "policy/override-blocked",
          severity: "error",
          message: `Policy ${current.rule.id} does not allow override by ${rule.id}.`,
          evidence: [
            { path: current.rule.id, reason: "non-overridable rule" },
            { path: rule.id, reason: "attempted override" },
          ],
        });
        continue;
      }
      selected.set(rule.key, { layer, rule });
    }
  }

  const rules = [...selected.values()].map(({ rule }) => rule);
  return {
    rules,
    mandatoryGateIds: [
      ...new Set(
        rules
          .filter(({ enforcement }) => enforcement === "enforceable")
          .flatMap(({ mandatoryGateIds }) => mandatoryGateIds),
      ),
    ].sort(),
    diagnostics,
  };
}
