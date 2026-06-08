import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateTaxonomyCatalog, validateWorkflowManifest } from "./index.js";

const catalog = JSON.parse(
  readFileSync(new URL("../../../catalog/taxonomies/software-mobile.json", import.meta.url), "utf8"),
);
const workflow = JSON.parse(
  readFileSync(new URL("../../../catalog/workflows/mobile-delivery.json", import.meta.url), "utf8"),
);

describe("software and mobile engineering catalog", () => {
  it("validates with at least 20 reviewed strategies per major engineering category", () => {
    const result = validateTaxonomyCatalog(catalog);
    expect(result.valid).toBe(true);
    const counts = Object.groupBy(result.catalog!.strategies, ({ categoryId }) => categoryId);
    expect(counts["adrenai/software-engineering"]?.length).toBeGreaterThanOrEqual(20);
    expect(counts["adrenai/mobile-engineering"]?.length).toBeGreaterThanOrEqual(20);
    expect(result.catalog!.strategies.every(({ evidence, description }) =>
      evidence.length > 0 && description.length > 30,
    )).toBe(true);
  });

  it("covers required software and mobile concerns with compatibility metadata", () => {
    const ids = new Set(catalog.strategies.map(({ id }: { id: string }) => id));
    for (const id of [
      "adrenai/modular-monolith", "adrenai/api-contract-first", "adrenai/relational-data-modeling",
      "adrenai/unit-testing", "adrenai/threat-modeling", "adrenai/progressive-delivery",
      "adrenai/observability-slos", "adrenai/architecture-decision-records", "adrenai/native-ios",
      "adrenai/native-android", "adrenai/react-native", "adrenai/flutter", "adrenai/mobile-accessibility",
      "adrenai/mobile-offline-first", "adrenai/app-store-release", "adrenai/mobile-ui-testing",
    ]) expect(ids.has(id)).toBe(true);
    expect(catalog.strategies.every(({ conflicts, compatibleWith }: { conflicts: unknown; compatibleWith: unknown }) =>
      Array.isArray(conflicts) && Array.isArray(compatibleWith),
    )).toBe(true);
  });

  it("ships a valid representative mobile workflow", () => {
    const result = validateWorkflowManifest(workflow);
    expect(result.valid).toBe(true);
    expect(result.workflow?.phases.some(({ id }) => id === "device-validation")).toBe(true);
    expect(result.workflow?.phases.some(({ approvalRequired }) => approvalRequired)).toBe(true);
  });
});
