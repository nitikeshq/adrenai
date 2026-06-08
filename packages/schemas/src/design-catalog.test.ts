import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateTaxonomyCatalog, validateWorkflowManifest } from "./index.js";

const catalog = JSON.parse(readFileSync(new URL("../../../catalog/taxonomies/design-animation.json", import.meta.url), "utf8"));
const workflow = JSON.parse(readFileSync(new URL("../../../catalog/workflows/design-delivery.json", import.meta.url), "utf8"));

describe("design and animation catalog", () => {
  it("validates at least 20 original reviewed strategies per major category", () => {
    const result = validateTaxonomyCatalog(catalog);
    expect(result.valid, JSON.stringify(result.issues, null, 2)).toBe(true);
    const visual = result.catalog!.strategies.filter(({ categoryId }) => categoryId === "design/visual-system");
    const motion = result.catalog!.strategies.filter(({ categoryId }) => categoryId === "design/motion-system");
    expect(visual.length).toBeGreaterThanOrEqual(20);
    expect(motion.length).toBeGreaterThanOrEqual(20);
    expect(result.catalog!.strategies.every(({ evidence, license }) => evidence.length > 0 && license === "Apache-2.0")).toBe(true);
  });

  it("covers direction, type, color, background, layout, accessibility, frameworks, and motion", () => {
    const ids = new Set(catalog.strategies.map(({ id }: { id: string }) => id));
    for (const id of [
      "design/high-contrast-blocks", "design/functional-type-scale", "design/semantic-color",
      "design/gradient-backgrounds", "design/grid-layout", "design/responsive-content",
      "design/accessible-contrast", "design/shadcn-composition", "design/radix-primitives",
      "design/material-components", "design/bootstrap-components", "design/framework-neutral-components",
      "design/purposeful-motion-baseline", "design/reduced-motion", "design/animation-performance-budget",
    ]) expect(ids.has(id)).toBe(true);
  });

  it("supports hybrid composition and brand constraints without framework ambiguity", () => {
    const shadcn = catalog.strategies.find(({ id }: { id: string }) => id === "design/shadcn-composition");
    expect(shadcn.compatibleWith).toContain("design/radix-primitives");
    expect(shadcn.conflicts).toContain("design/material-components");
    expect(catalog.strategies.every(({ constraintIds }: { constraintIds: string[] }) =>
      constraintIds.includes("design/brand-constraints"),
    )).toBe(true);
  });

  it("ships a valid design workflow with review and accessibility gates", () => {
    const result = validateWorkflowManifest(workflow);
    expect(result.valid).toBe(true);
    expect(result.workflow?.phases.flatMap(({ gateIds }) => gateIds)).toContain("accessibility-review");
    expect(result.workflow?.phases.filter(({ approvalRequired }) => approvalRequired).length).toBeGreaterThanOrEqual(2);
  });
});
