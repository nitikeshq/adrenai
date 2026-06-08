import type {
  Diagnostic,
  Pack,
  PolicyCatalog,
  TaxonomyCatalog,
  WorkflowManifest,
} from "@adrenai/domain";
import { planWorkflow, resolvePolicyLayers } from "@adrenai/domain";
import {
  validatePackManifest,
  validatePolicyCatalog,
  validateTaxonomyCatalog,
  validateWorkflowManifest,
} from "@adrenai/schemas";

export type ExtensionApiStability = "stable" | "experimental";

export interface ContributionMetadata {
  name: string;
  version: string;
  license: string;
  authors: string[];
  originalityConfirmed: boolean;
  evidenceReviewed: boolean;
  testFiles: string[];
}

export interface AdapterDescriptor {
  id: string;
  version: string;
  agent: string;
  outputPath: string;
  format: "markdown";
  stability: ExtensionApiStability;
}

export interface ContributionBundle {
  schemaVersion: 1;
  namespace: string;
  metadata: ContributionMetadata;
  taxonomy: TaxonomyCatalog;
  workflows: WorkflowManifest[];
  policies: PolicyCatalog[];
  packs: Pack[];
  adapters: AdapterDescriptor[];
}

export interface ContributionValidation {
  valid: boolean;
  diagnostics: Diagnostic[];
  bundle?: ContributionBundle;
}

const NAMESPACE = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SPDX = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;

function diagnostic(id: string, message: string, path: string, reason: string): Diagnostic {
  return { id, severity: "error", message, evidence: [{ path, reason }] };
}

export function scaffoldContributionBundle(namespace: string): ContributionBundle {
  if (!NAMESPACE.test(namespace)) throw new Error("Namespace must be lowercase and path-safe.");
  return {
    schemaVersion: 1,
    namespace,
    metadata: {
      name: `${namespace} AdrenAI bundle`,
      version: "0.1.0",
      license: "Apache-2.0",
      authors: [],
      originalityConfirmed: false,
      evidenceReviewed: false,
      testFiles: [],
    },
    taxonomy: {
      schemaVersion: 1,
      namespace,
      categories: [],
      strategies: [],
      capabilities: [],
      constraints: [],
      deliverables: [],
      audiences: [],
    },
    workflows: [],
    policies: [],
    packs: [],
    adapters: [],
  };
}

export function migrateContributionBundle(value: unknown): ContributionBundle {
  if (typeof value !== "object" || value === null || (value as { schemaVersion?: unknown }).schemaVersion !== 1) {
    throw new Error("No deterministic migration exists for this contribution bundle version.");
  }
  return value as ContributionBundle;
}

export function validateContributionBundle(value: unknown): ContributionValidation {
  const diagnostics: Diagnostic[] = [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { valid: false, diagnostics: [diagnostic("sdk/invalid-bundle", "Contribution bundle must be an object.", "$", "invalid root")] };
  }
  const candidate = value as Partial<ContributionBundle>;
  if (candidate.schemaVersion !== 1) diagnostics.push(diagnostic("sdk/unsupported-version", "Contribution bundle schemaVersion must equal 1.", "schemaVersion", "unsupported version"));
  if (typeof candidate.namespace !== "string" || !NAMESPACE.test(candidate.namespace)) diagnostics.push(diagnostic("sdk/invalid-namespace", "Contribution bundle namespace is invalid.", "namespace", "invalid namespace"));
  const metadata = candidate.metadata;
  if (!metadata || !SEMVER.test(metadata.version ?? "")) diagnostics.push(diagnostic("sdk/invalid-version", "Contribution metadata version must be full semver.", "metadata.version", "invalid version"));
  if (!metadata?.license || !SPDX.test(metadata.license)) diagnostics.push(diagnostic("sdk/invalid-license", "Contribution metadata requires an SPDX license id.", "metadata.license", "licensing gate"));
  if (!metadata?.originalityConfirmed) diagnostics.push(diagnostic("sdk/originality-unconfirmed", "Contributor must confirm original or properly licensed content.", "metadata.originalityConfirmed", "originality gate"));
  if (!metadata?.evidenceReviewed) diagnostics.push(diagnostic("sdk/evidence-unreviewed", "Contributor must review strategy evidence.", "metadata.evidenceReviewed", "evidence gate"));
  if (!metadata?.testFiles?.length) diagnostics.push(diagnostic("sdk/missing-tests", "Contribution bundle must declare test coverage.", "metadata.testFiles", "test coverage gate"));

  const taxonomy = validateTaxonomyCatalog(candidate.taxonomy);
  if (!taxonomy.valid) diagnostics.push(...taxonomy.issues.map(({ path, message }) => diagnostic("sdk/invalid-taxonomy", message, `taxonomy.${path}`, "schema validation")));
  const workflows = Array.isArray(candidate.workflows) ? candidate.workflows : [];
  for (const [index, workflow] of workflows.entries()) {
    const validation = validateWorkflowManifest(workflow);
    if (!validation.valid) diagnostics.push(...validation.issues.map(({ path, message }) => diagnostic("sdk/invalid-workflow", message, `workflows.${index}.${path}`, "schema validation")));
    if (validation.workflow) diagnostics.push(...planWorkflow(validation.workflow).diagnostics);
  }
  const policies = Array.isArray(candidate.policies) ? candidate.policies : [];
  for (const [index, policy] of policies.entries()) {
    const validation = validatePolicyCatalog(policy);
    if (!validation.valid) diagnostics.push(...validation.issues.map(({ path, message }) => diagnostic("sdk/invalid-policy", message, `policies.${index}.${path}`, "schema validation")));
    if (validation.catalog) diagnostics.push(...resolvePolicyLayers(validation.catalog.layers).diagnostics);
  }
  const packs = Array.isArray(candidate.packs) ? candidate.packs : [];
  for (const [index, pack] of packs.entries()) {
    const validation = validatePackManifest(pack);
    if (!validation.valid) diagnostics.push(...validation.issues.map(({ path, message }) => diagnostic("sdk/invalid-pack", message, `packs.${index}.${path}`, "schema validation")));
  }
  const adapters = Array.isArray(candidate.adapters) ? candidate.adapters : [];
  for (const [index, adapter] of adapters.entries()) {
    if (
      !adapter ||
      typeof adapter.id !== "string" ||
      typeof adapter.version !== "string" ||
      !SEMVER.test(adapter.version) ||
      typeof adapter.agent !== "string" ||
      adapter.format !== "markdown" ||
      !["stable", "experimental"].includes(adapter.stability) ||
      typeof adapter.outputPath !== "string" ||
      adapter.outputPath.startsWith("/") ||
      /^[a-z]:[\\/]/i.test(adapter.outputPath) ||
      adapter.outputPath.replaceAll("\\", "/").split("/").includes("..")
    ) {
      diagnostics.push(diagnostic("sdk/invalid-adapter", "Adapter descriptor must be declarative and use a safe relative output path.", `adapters.${index}`, "adapter security gate"));
    }
  }
  const serialized = JSON.stringify(candidate);
  if (/(?:curl|wget)\s+.+\|\s*(?:sh|bash)|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(serialized)) {
    diagnostics.push(diagnostic("sdk/security-risk", "Contribution bundle contains prohibited executable or secret material.", "$", "security gate"));
  }
  const bundle = candidate as ContributionBundle;
  if (candidate.namespace && taxonomy.catalog && taxonomy.catalog.namespace !== candidate.namespace) {
    diagnostics.push(diagnostic("sdk/namespace-mismatch", "Taxonomy namespace must match the bundle namespace.", "taxonomy.namespace", "compatibility gate"));
  }
  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, diagnostics, bundle };
}

export const stable = {
  scaffoldContributionBundle,
  migrateContributionBundle,
  validateContributionBundle,
} as const;

export const experimental = {} as const;

export type {
  Audience,
  Capability,
  Category,
  Constraint,
  Deliverable,
  PolicyLayer,
  PolicyRule,
  Strategy,
  TaxonomyCatalog,
  WorkflowManifest,
  WorkflowPhase,
} from "@adrenai/domain";
