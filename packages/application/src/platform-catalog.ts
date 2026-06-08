import type {
  Diagnostic,
  PolicyCatalog,
  PolicyLayer,
  PolicyResolution,
  Strategy,
  TaxonomyCatalog,
  WorkflowManifest,
} from "@adrenai/domain";
import { resolvePolicyLayers } from "@adrenai/domain";
import { validatePolicyCatalog, validateTaxonomyCatalog, validateWorkflowManifest } from "@adrenai/schemas";
import type { RepositoryFileSystem } from "./index.js";

export interface PlatformCatalog {
  taxonomies: TaxonomyCatalog[];
  strategies: Strategy[];
  workflows: WorkflowManifest[];
  policyLayers: PolicyLayer[];
  diagnostics: Diagnostic[];
}

export async function loadPlatformCatalog(
  root: string,
  fileSystem: RepositoryFileSystem,
): Promise<PlatformCatalog> {
  const paths = (await fileSystem.listFiles(root)).map((path) => path.replaceAll("\\", "/")).sort();
  const taxonomies: TaxonomyCatalog[] = [];
  const workflows: WorkflowManifest[] = [];
  const policyLayers: PolicyLayer[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const path of paths.filter((path) => path.endsWith(".json"))) {
    let value: unknown;
    try {
      value = JSON.parse(await fileSystem.readText(root, path));
    } catch {
      diagnostics.push({ id: "platform-catalog/invalid-json", severity: "error", message: `${path} is not valid JSON.`, evidence: [{ path, reason: "JSON parsing failed" }] });
      continue;
    }
    if (path.startsWith("taxonomies/")) {
      const result = validateTaxonomyCatalog(value);
      if (result.catalog) taxonomies.push(result.catalog);
      else diagnostics.push(...result.issues.map(({ path: issuePath, message }) => ({ id: "platform-catalog/invalid-taxonomy", severity: "error" as const, message, evidence: [{ path: `${path}:${issuePath}`, reason: message }] })));
    } else if (path.startsWith("workflows/")) {
      const result = validateWorkflowManifest(value);
      if (result.workflow) workflows.push(result.workflow);
      else diagnostics.push(...result.issues.map(({ path: issuePath, message }) => ({ id: "platform-catalog/invalid-workflow", severity: "error" as const, message, evidence: [{ path: `${path}:${issuePath}`, reason: message }] })));
    } else if (path.startsWith("policies/")) {
      const result = validatePolicyCatalog(value);
      if (result.catalog) policyLayers.push(...result.catalog.layers);
      else diagnostics.push(...result.issues.map(({ path: issuePath, message }) => ({ id: "platform-catalog/invalid-policy", severity: "error" as const, message, evidence: [{ path: `${path}:${issuePath}`, reason: message }] })));
    }
  }
  return { taxonomies, strategies: taxonomies.flatMap(({ strategies }) => strategies), workflows, policyLayers, diagnostics };
}

export function resolveCatalogPolicies(catalog: PlatformCatalog, categoryId?: string): PolicyResolution {
  const targets = new Set(categoryId ? [categoryId, categoryId.split("/")[0]!, categoryId.split("/").at(-1)!] : []);
  return resolvePolicyLayers(catalog.policyLayers.filter(({ scope, target }) =>
    scope === "universal" || (scope === "category" && target !== undefined && targets.has(target)),
  ));
}
