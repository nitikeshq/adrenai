import { writeFileSync } from "node:fs";

const groups = {
  poster: [
    "audience-and-purpose", "single-message", "visual-hierarchy", "grid-composition", "brand-tokens",
    "type-scale", "readable-distance", "color-contrast", "image-rights", "image-quality",
    "call-to-action", "content-density", "whitespace", "accessible-color", "alternate-text-plan",
    "print-bleed", "safe-area", "export-resolution", "proof-review", "poster-acceptance",
  ],
  document: [
    "document-purpose", "reader-profile", "document-outline", "heading-hierarchy", "style-system",
    "brand-template", "page-layout", "navigation-aids", "table-design", "figure-captions",
    "source-citations", "cross-references", "accessible-language", "document-accessibility", "metadata",
    "version-control", "editorial-review", "legal-review", "export-review", "document-acceptance",
  ],
  spreadsheet: [
    "workbook-purpose", "data-contract", "input-output-separation", "table-structure", "stable-identifiers",
    "data-validation", "formula-boundaries", "formula-audit", "error-handling", "named-ranges",
    "units-and-formats", "conditional-formatting", "accessible-colors", "worksheet-navigation", "protected-inputs",
    "scenario-modeling", "reconciliation", "sample-data", "export-review", "spreadsheet-acceptance",
  ],
  presentation: [
    "presentation-objective", "audience-decision", "story-arc", "slide-outline", "one-point-per-slide",
    "visual-hierarchy", "brand-template", "type-scale", "color-contrast", "chart-purpose",
    "data-source-notes", "speaker-notes", "accessible-reading-order", "alternate-text", "caption-plan",
    "timing-rehearsal", "handoff-mode", "export-review", "stakeholder-review", "presentation-acceptance",
  ],
};

const title = (id) => id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
const strategies = Object.entries(groups).flatMap(([category, ids]) => ids.map((id) => ({
  id: `media/${category}-${id}`, version: "1.0.0", title: title(id),
  description: `Apply ${id.replaceAll("-", " ")} as a documented and reviewable part of the ${category} deliverable plan.`,
  categoryId: `media/${category}`, capabilityIds: ["media/format-neutral-planning"],
  constraintIds: ["media/brand-accessibility-and-export"], deliverableIds: [`media/${category}-plan`], audienceIds: [],
  prerequisites: [], conflicts: [], compatibleWith: [],
  evidence: [{ source: "adrenai-reviewed-media-rationale", summary: `Use ${id.replaceAll("-", " ")} when preparing and reviewing a ${category} deliverable.` }],
  maturity: "stable", license: "Apache-2.0", risk: ["legal-review", "formula-audit", "image-rights"].includes(id) ? "high" : "low",
})));

const catalog = {
  schemaVersion: 1, namespace: "media",
  categories: Object.keys(groups).map((id) => ({ id: `media/${id}`, version: "1.0.0", title: title(id), description: `Strategies for planning, reviewing, and exporting ${id} deliverables.` })),
  capabilities: [{ id: "media/format-neutral-planning", version: "1.0.0", title: "Format-Neutral Planning", description: "Plan deliverables independently from file-format rendering adapters." }],
  constraints: [{ id: "media/brand-accessibility-and-export", version: "1.0.0", title: "Brand, Accessibility, and Export", description: "Require explicit branding, accessibility, data, review, and export constraints." }],
  deliverables: Object.keys(groups).map((id) => ({ id: `media/${id}-plan`, version: "1.0.0", title: `${title(id)} Plan`, description: `A validated format-neutral plan for a ${id} deliverable.` })),
  audiences: [], strategies,
};
writeFileSync(new URL("../catalog/taxonomies/document-media.json", import.meta.url), `${JSON.stringify(catalog, null, 2)}\n`);
