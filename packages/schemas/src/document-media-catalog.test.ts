import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateTaxonomyCatalog, validateWorkflowManifest } from "./index.js";

const root = new URL("../../../", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("catalog/taxonomies/document-media.json", root), "utf8"));
const workflowNames = ["poster-delivery", "document-delivery", "spreadsheet-delivery", "presentation-delivery"];

describe("document and media catalog", () => {
  it("validates at least 20 reviewed strategies per major category", () => {
    const result = validateTaxonomyCatalog(catalog);
    expect(result.valid, JSON.stringify(result.issues, null, 2)).toBe(true);
    const counts = Object.groupBy(result.catalog!.strategies, ({ categoryId }) => categoryId);
    for (const category of ["poster", "document", "spreadsheet", "presentation"]) {
      expect(counts[`media/${category}`]?.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("ships valid workflows with planning, review, accessibility, and export gates", () => {
    const workflows = workflowNames.map((name) => JSON.parse(readFileSync(new URL(`catalog/workflows/${name}.json`, root), "utf8")));
    for (const workflow of workflows) {
      const result = validateWorkflowManifest(workflow);
      expect(result.valid, JSON.stringify(result.issues, null, 2)).toBe(true);
      const gates = result.workflow!.phases.flatMap(({ gateIds }) => gateIds);
      expect(gates).toContain("template-review");
      expect(gates).toContain("brand-review");
      expect(gates).toContain("accessibility-review");
      expect(gates).toContain("export-review");
      expect(result.workflow!.phases.some(({ approvalRequired }) => approvalRequired)).toBe(true);
    }
    expect(workflows.find(({ id }) => id === "adrenai/spreadsheet-delivery").phases.flatMap(({ gateIds }: { gateIds: string[] }) => gateIds)).toContain("data-validation-review");
    expect(workflows.find(({ id }) => id === "adrenai/poster-delivery").phases.flatMap(({ gateIds }: { gateIds: string[] }) => gateIds)).toContain("image-rights-review");
    expect(workflows.find(({ id }) => id === "adrenai/presentation-delivery").phases.flatMap(({ gateIds }: { gateIds: string[] }) => gateIds)).toContain("data-source-review");
  });

  it("includes representative format-neutral fixtures", () => {
    for (const kind of ["poster", "document", "spreadsheet", "presentation"]) {
      const fixture = new URL(`catalog/fixtures/deliverables/${kind}-plan.json`, root);
      expect(existsSync(fixture)).toBe(true);
      const plan = JSON.parse(readFileSync(fixture, "utf8"));
      expect(plan).toMatchObject({ schemaVersion: 1, kind });
      expect(plan.templateId).toBeTruthy();
      expect(Object.keys(plan.brandTokens).length).toBeGreaterThan(0);
      expect(plan.sections.length).toBeGreaterThan(0);
      expect(plan.accessibilityRequirements.length).toBeGreaterThan(0);
      expect(plan.validationRules.length).toBeGreaterThan(0);
      expect(plan.reviewGateIds.length).toBeGreaterThan(0);
      expect(plan.exportTargets.length).toBeGreaterThan(0);
    }
  });
});
