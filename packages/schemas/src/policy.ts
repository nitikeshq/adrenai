import type {
  PolicyCatalog,
  PolicyEnforcement,
  PolicyLayer,
  PolicyRule,
  PolicyScope,
  TaxonomyValidationIssue,
} from "@adrenai/domain";

const ID = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/;
const KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SCOPES = new Set<PolicyScope>([
  "universal",
  "category",
  "organization",
  "project",
  "workflow",
  "phase",
  "session",
]);
const ENFORCEMENT = new Set<PolicyEnforcement>(["advisory", "enforceable"]);
const ROOT_KEYS = new Set(["schemaVersion", "layers"]);
const LAYER_KEYS = new Set(["id", "version", "scope", "target", "rules"]);
const RULE_KEYS = new Set([
  "id",
  "key",
  "statement",
  "enforcement",
  "overrideAllowed",
  "mandatoryGateIds",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(issues: TaxonomyValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function string(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: TaxonomyValidationIssue[],
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    add(issues, `${path}.${key}`, "must be a non-empty string");
    return "";
  }
  return value.trim();
}

function stringArray(
  value: unknown,
  path: string,
  issues: TaxonomyValidationIssue[],
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    add(issues, path, "must be an array of strings");
    return [];
  }
  return [...new Set(value as string[])];
}

function parseRules(
  value: unknown,
  path: string,
  issues: TaxonomyValidationIssue[],
): PolicyRule[] {
  if (!Array.isArray(value)) {
    add(issues, path, "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const itemPath = `${path}.${index}`;
    if (!isRecord(item)) {
      add(issues, itemPath, "must be an object");
      return [];
    }
    for (const key of Object.keys(item)) {
      if (!RULE_KEYS.has(key)) add(issues, `${itemPath}.${key}`, "is not supported");
    }
    const id = string(item, "id", itemPath, issues);
    const key = string(item, "key", itemPath, issues);
    const enforcement = string(item, "enforcement", itemPath, issues) as PolicyEnforcement;
    if (id && !ID.test(id)) add(issues, `${itemPath}.id`, "must be a namespaced id");
    if (key && !KEY.test(key)) add(issues, `${itemPath}.key`, "must be a dotted lowercase key");
    if (!ENFORCEMENT.has(enforcement)) add(issues, `${itemPath}.enforcement`, "is not supported");
    if (typeof item.overrideAllowed !== "boolean") {
      add(issues, `${itemPath}.overrideAllowed`, "must be a boolean");
    }
    const mandatoryGateIds = stringArray(
      item.mandatoryGateIds ?? [],
      `${itemPath}.mandatoryGateIds`,
      issues,
    );
    if (enforcement === "advisory" && mandatoryGateIds.length > 0) {
      add(issues, `${itemPath}.mandatoryGateIds`, "advisory rules cannot require gates");
    }
    return [{
      id,
      key,
      statement: string(item, "statement", itemPath, issues),
      enforcement,
      overrideAllowed: item.overrideAllowed === true,
      mandatoryGateIds,
    }];
  });
}

function parseLayers(value: unknown, issues: TaxonomyValidationIssue[]): PolicyLayer[] {
  if (!Array.isArray(value)) {
    add(issues, "layers", "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const path = `layers.${index}`;
    if (!isRecord(item)) {
      add(issues, path, "must be an object");
      return [];
    }
    for (const key of Object.keys(item)) {
      if (!LAYER_KEYS.has(key)) add(issues, `${path}.${key}`, "is not supported");
    }
    const id = string(item, "id", path, issues);
    const version = string(item, "version", path, issues);
    const scope = string(item, "scope", path, issues) as PolicyScope;
    if (id && !ID.test(id)) add(issues, `${path}.id`, "must be a namespaced id");
    if (version && !SEMVER.test(version)) add(issues, `${path}.version`, "must be full semver");
    if (!SCOPES.has(scope)) add(issues, `${path}.scope`, "is not supported");
    if (scope !== "universal" && typeof item.target !== "string") {
      add(issues, `${path}.target`, "is required for non-universal scopes");
    }
    return [{
      id,
      version,
      scope,
      ...(typeof item.target === "string" ? { target: item.target } : {}),
      rules: parseRules(item.rules, `${path}.rules`, issues),
    }];
  });
}

export function validatePolicyCatalog(value: unknown): {
  valid: boolean;
  issues: TaxonomyValidationIssue[];
  catalog?: PolicyCatalog;
} {
  const issues: TaxonomyValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.has(key)) add(issues, key, "is not supported");
  }
  if (value.schemaVersion !== 1) add(issues, "schemaVersion", "must equal 1");
  const layers = parseLayers(value.layers, issues);
  const ids = new Set<string>();
  for (const layer of layers) {
    if (ids.has(layer.id)) add(issues, layer.id, "layer id is declared more than once");
    ids.add(layer.id);
    const ruleIds = new Set<string>();
    for (const rule of layer.rules) {
      if (ruleIds.has(rule.id)) add(issues, rule.id, "rule id is declared more than once in layer");
      ruleIds.add(rule.id);
    }
  }
  return issues.length === 0
    ? { valid: true, issues, catalog: { schemaVersion: 1, layers } }
    : { valid: false, issues };
}
