import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateTaxonomyCatalog, validateWorkflowManifest } from "./index.js";

const root = new URL("../../../", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("catalog/taxonomies/content-marketing.json", root), "utf8"));
const workflows = ["seo-content-delivery", "email-campaign"].map((name) =>
  JSON.parse(readFileSync(new URL(`catalog/workflows/${name}.json`, root), "utf8")),
);

describe("SEO, content, writing, and email catalog", () => {
  it("validates at least 20 reviewed offline strategies per major category", () => {
    const result = validateTaxonomyCatalog(catalog);
    expect(result.valid, JSON.stringify(result.issues, null, 2)).toBe(true);
    const counts = Object.groupBy(result.catalog!.strategies, ({ categoryId }) => categoryId);
    for (const category of ["technical-seo", "content-seo", "long-form-writing", "email-marketing"]) {
      expect(counts[`content/${category}`]?.length).toBeGreaterThanOrEqual(20);
    }
    expect(result.catalog!.strategies.every(({ evidence, license }) => evidence.length > 0 && license === "Apache-2.0")).toBe(true);
  });

  it("covers required quality, safety, compliance, and measurement strategies", () => {
    const ids = new Set(catalog.strategies.map(({ id }: { id: string }) => id));
    for (const id of [
      "content/technical-seo-acceptance", "content/source-citations", "content/claim-verification",
      "content/originality-review", "content/accessible-language", "content/privacy-minimization",
      "content/unsubscribe-path", "content/campaign-measurement",
    ]) expect(ids.has(id)).toBe(true);
  });

  it("ships valid gated reference workflows", () => {
    for (const workflow of workflows) {
      const result = validateWorkflowManifest(workflow);
      expect(result.valid, JSON.stringify(result.issues, null, 2)).toBe(true);
      expect(result.workflow!.phases.some(({ approvalRequired }) => approvalRequired)).toBe(true);
    }
    const gates = workflows.flatMap(({ phases }) => phases.flatMap(({ gateIds }: { gateIds: string[] }) => gateIds));
    for (const gate of ["source-citation-review", "originality-review", "claims-review", "accessibility-review", "privacy-review", "unsubscribe-review"]) {
      expect(gates).toContain(gate);
    }
  });

  it("includes deterministic offline briefs usable without AI", () => {
    expect(existsSync(new URL("catalog/templates/content-brief.md", root))).toBe(true);
    expect(existsSync(new URL("catalog/templates/email-campaign-brief.md", root))).toBe(true);
  });
});
