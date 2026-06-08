import type {
  TaxonomyValidationIssue,
  WorkflowManifest,
  WorkflowPhase,
} from "@adrenai/domain";

const ID = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/;
const PHASE_ID = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ROOT_KEYS = new Set(["schemaVersion", "id", "version", "title", "phases"]);
const PHASE_KEYS = new Set([
  "id", "title", "dependsOn", "inputs", "outputs", "gateIds",
  "approvalRequired", "optional", "retryLimit", "when",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function add(issues: TaxonomyValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}
function text(value: unknown, path: string, issues: TaxonomyValidationIssue[]): string {
  if (typeof value !== "string" || !value.trim()) {
    add(issues, path, "must be a non-empty string");
    return "";
  }
  return value.trim();
}
function strings(value: unknown, path: string, issues: TaxonomyValidationIssue[]): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    add(issues, path, "must be an array of strings");
    return [];
  }
  return [...new Set(value as string[])];
}

export function validateWorkflowManifest(value: unknown): {
  valid: boolean;
  issues: TaxonomyValidationIssue[];
  workflow?: WorkflowManifest;
} {
  const issues: TaxonomyValidationIssue[] = [];
  if (!record(value)) return { valid: false, issues: [{ path: "$", message: "must be an object" }] };
  for (const key of Object.keys(value)) if (!ROOT_KEYS.has(key)) add(issues, key, "is not supported");
  if (value.schemaVersion !== 1) add(issues, "schemaVersion", "must equal 1");
  const id = text(value.id, "id", issues);
  const version = text(value.version, "version", issues);
  if (id && !ID.test(id)) add(issues, "id", "must be a namespaced id");
  if (version && !SEMVER.test(version)) add(issues, "version", "must be full semver");
  const phases: WorkflowPhase[] = [];
  if (!Array.isArray(value.phases)) add(issues, "phases", "must be an array");
  else value.phases.forEach((item, index) => {
    const path = `phases.${index}`;
    if (!record(item)) return add(issues, path, "must be an object");
    for (const key of Object.keys(item)) if (!PHASE_KEYS.has(key)) add(issues, `${path}.${key}`, "is not supported");
    const phaseId = text(item.id, `${path}.id`, issues);
    if (phaseId && !PHASE_ID.test(phaseId)) add(issues, `${path}.id`, "must be a lowercase id");
    const when = record(item.when)
      ? {
          decisionId: text(item.when.decisionId, `${path}.when.decisionId`, issues),
          equals: text(item.when.equals, `${path}.when.equals`, issues),
        }
      : undefined;
    if (item.when !== undefined && !record(item.when)) add(issues, `${path}.when`, "must be an object");
    if (typeof item.approvalRequired !== "boolean") add(issues, `${path}.approvalRequired`, "must be boolean");
    if (typeof item.optional !== "boolean") add(issues, `${path}.optional`, "must be boolean");
    if (!Number.isInteger(item.retryLimit) || (item.retryLimit as number) < 0 || (item.retryLimit as number) > 10) {
      add(issues, `${path}.retryLimit`, "must be an integer from 0 to 10");
    }
    phases.push({
      id: phaseId,
      title: text(item.title, `${path}.title`, issues),
      dependsOn: strings(item.dependsOn ?? [], `${path}.dependsOn`, issues),
      inputs: strings(item.inputs ?? [], `${path}.inputs`, issues),
      outputs: strings(item.outputs ?? [], `${path}.outputs`, issues),
      gateIds: strings(item.gateIds ?? [], `${path}.gateIds`, issues),
      approvalRequired: item.approvalRequired === true,
      optional: item.optional === true,
      retryLimit: typeof item.retryLimit === "number" ? item.retryLimit : 0,
      ...(when ? { when } : {}),
    });
  });
  const ids = new Set<string>();
  for (const phase of phases) {
    if (ids.has(phase.id)) add(issues, phase.id, "phase id is declared more than once");
    ids.add(phase.id);
  }
  const workflow = { schemaVersion: 1 as const, id, version, title: text(value.title, "title", issues), phases };
  return issues.length ? { valid: false, issues } : { valid: true, issues, workflow };
}
