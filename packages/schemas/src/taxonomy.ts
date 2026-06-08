import type {
  Audience,
  Capability,
  Category,
  Constraint,
  Deliverable,
  Strategy,
  StrategyEvidence,
  StrategyMaturity,
  StrategyRisk,
  TaxonomyCatalog,
  TaxonomyEntity,
  TaxonomyValidationIssue,
  TaxonomyValidationResult,
} from "@adrenai/domain";

const ID = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/;
const NAMESPACE = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const LICENSE = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;
const MATURITY = new Set<StrategyMaturity>([
  "experimental",
  "emerging",
  "stable",
  "established",
]);
const RISK = new Set<StrategyRisk>(["low", "medium", "high"]);
const ROOT_KEYS = new Set([
  "schemaVersion",
  "namespace",
  "categories",
  "strategies",
  "capabilities",
  "constraints",
  "deliverables",
  "audiences",
]);
const ENTITY_KEYS = new Set(["id", "version", "title", "description"]);
const CATEGORY_KEYS = new Set([...ENTITY_KEYS, "parentId"]);
const STRATEGY_KEYS = new Set([
  ...ENTITY_KEYS,
  "categoryId",
  "capabilityIds",
  "constraintIds",
  "deliverableIds",
  "audienceIds",
  "prerequisites",
  "conflicts",
  "compatibleWith",
  "evidence",
  "maturity",
  "license",
  "risk",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(issues: TaxonomyValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function text(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: TaxonomyValidationIssue[],
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issue(issues, `${path}.${key}`, "must be a non-empty string");
    return "";
  }
  return value.trim();
}

function ids(
  value: unknown,
  path: string,
  issues: TaxonomyValidationIssue[],
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issue(issues, path, "must be an array of ids");
    return [];
  }
  const result = [...new Set(value as string[])];
  for (const id of result) {
    if (!ID.test(id)) issue(issues, path, `contains invalid id ${id}`);
  }
  return result;
}

function entity(
  value: unknown,
  path: string,
  allowedKeys: Set<string>,
  issues: TaxonomyValidationIssue[],
): TaxonomyEntity | undefined {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return undefined;
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) issue(issues, `${path}.${key}`, "is not supported");
  }
  const id = text(value, "id", path, issues);
  const version = text(value, "version", path, issues);
  if (id && !ID.test(id)) issue(issues, `${path}.id`, "must be a namespaced lowercase id");
  if (version && !SEMVER.test(version)) issue(issues, `${path}.version`, "must be full semver");
  return {
    id,
    version,
    title: text(value, "title", path, issues),
    description: text(value, "description", path, issues),
  };
}

function entities<T extends TaxonomyEntity>(
  value: unknown,
  path: string,
  issues: TaxonomyValidationIssue[],
): T[] {
  if (!Array.isArray(value)) {
    issue(issues, path, "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const parsed = entity(item, `${path}.${index}`, ENTITY_KEYS, issues);
    return parsed ? [parsed as T] : [];
  });
}

function categories(
  value: unknown,
  issues: TaxonomyValidationIssue[],
): Category[] {
  if (!Array.isArray(value)) {
    issue(issues, "categories", "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const path = `categories.${index}`;
    const parsed = entity(item, path, CATEGORY_KEYS, issues);
    if (!parsed || !isRecord(item)) return [];
    const parentId = item.parentId;
    if (parentId !== undefined && (typeof parentId !== "string" || !ID.test(parentId))) {
      issue(issues, `${path}.parentId`, "must be a namespaced lowercase id");
    }
    return [{ ...parsed, ...(typeof parentId === "string" ? { parentId } : {}) }];
  });
}

function evidence(
  value: unknown,
  path: string,
  issues: TaxonomyValidationIssue[],
): StrategyEvidence[] {
  if (!Array.isArray(value)) {
    issue(issues, path, "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item)) {
      issue(issues, `${path}.${index}`, "must be an object");
      return [];
    }
    return [{
      source: text(item, "source", `${path}.${index}`, issues),
      summary: text(item, "summary", `${path}.${index}`, issues),
    }];
  });
}

function strategies(value: unknown, issues: TaxonomyValidationIssue[]): Strategy[] {
  if (!Array.isArray(value)) {
    issue(issues, "strategies", "must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    const path = `strategies.${index}`;
    const parsed = entity(item, path, STRATEGY_KEYS, issues);
    if (!parsed || !isRecord(item)) return [];
    const categoryId = text(item, "categoryId", path, issues);
    if (categoryId && !ID.test(categoryId)) issue(issues, `${path}.categoryId`, "must be an id");
    const maturity = text(item, "maturity", path, issues) as StrategyMaturity;
    const risk = text(item, "risk", path, issues) as StrategyRisk;
    const license = text(item, "license", path, issues);
    if (!MATURITY.has(maturity)) issue(issues, `${path}.maturity`, "is not supported");
    if (!RISK.has(risk)) issue(issues, `${path}.risk`, "is not supported");
    if (license && !LICENSE.test(license)) issue(issues, `${path}.license`, "must be an SPDX license id");
    return [{
      ...parsed,
      categoryId,
      capabilityIds: ids(item.capabilityIds ?? [], `${path}.capabilityIds`, issues),
      constraintIds: ids(item.constraintIds ?? [], `${path}.constraintIds`, issues),
      deliverableIds: ids(item.deliverableIds ?? [], `${path}.deliverableIds`, issues),
      audienceIds: ids(item.audienceIds ?? [], `${path}.audienceIds`, issues),
      prerequisites: ids(item.prerequisites ?? [], `${path}.prerequisites`, issues),
      conflicts: ids(item.conflicts ?? [], `${path}.conflicts`, issues),
      compatibleWith: ids(item.compatibleWith ?? [], `${path}.compatibleWith`, issues),
      evidence: evidence(item.evidence ?? [], `${path}.evidence`, issues),
      maturity,
      license,
      risk,
    }];
  });
}

export function validateTaxonomyCatalog(value: unknown): TaxonomyValidationResult {
  const issues: TaxonomyValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  }
  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.has(key)) issue(issues, key, "is not supported");
  }
  if (value.schemaVersion !== 1) issue(issues, "schemaVersion", "must equal 1");
  const namespace = text(value, "namespace", "$", issues);
  if (namespace && !NAMESPACE.test(namespace)) issue(issues, "namespace", "must be lowercase");
  const catalog: TaxonomyCatalog = {
    schemaVersion: 1,
    namespace,
    categories: categories(value.categories, issues),
    strategies: strategies(value.strategies, issues),
    capabilities: entities<Capability>(value.capabilities, "capabilities", issues),
    constraints: entities<Constraint>(value.constraints, "constraints", issues),
    deliverables: entities<Deliverable>(value.deliverables, "deliverables", issues),
    audiences: entities<Audience>(value.audiences, "audiences", issues),
  };

  const allEntities = [
    ...catalog.categories,
    ...catalog.strategies,
    ...catalog.capabilities,
    ...catalog.constraints,
    ...catalog.deliverables,
    ...catalog.audiences,
  ];
  const seen = new Set<string>();
  for (const entry of allEntities) {
    if (seen.has(entry.id)) issue(issues, entry.id, "is declared more than once");
    seen.add(entry.id);
    if (!entry.id.startsWith(`${namespace}/`)) {
      issue(issues, entry.id, `must use catalog namespace ${namespace}`);
    }
  }
  for (const category of catalog.categories) {
    if (category.parentId && !seen.has(category.parentId)) issue(issues, category.id, "has missing parent");
  }
  for (const strategy of catalog.strategies) {
    const references = [
      strategy.categoryId,
      ...strategy.capabilityIds,
      ...strategy.constraintIds,
      ...strategy.deliverableIds,
      ...strategy.audienceIds,
      ...strategy.prerequisites,
      ...strategy.conflicts,
      ...strategy.compatibleWith,
    ];
    for (const reference of references) {
      if (!seen.has(reference)) issue(issues, strategy.id, `references missing id ${reference}`);
    }
    if (strategy.prerequisites.includes(strategy.id) || strategy.conflicts.includes(strategy.id)) {
      issue(issues, strategy.id, "cannot require or conflict with itself");
    }
  }
  return issues.length === 0 ? { valid: true, issues, catalog } : { valid: false, issues };
}
