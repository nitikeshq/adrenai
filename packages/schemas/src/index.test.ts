import { describe, expect, it } from "vitest";
import { validatePackManifest, validateTaxonomyCatalog } from "./index.js";

describe("validatePackManifest", () => {
  it("validates and normalizes a declarative pack", () => {
    const result = validatePackManifest({
      id: "testing/unit-tests",
      version: "1.0.0",
      type: "testing",
      title: "Unit Tests",
      description: "Focused unit testing guidance.",
      appliesWhen: { technologies: ["vitest"], agents: ["codex"] },
      requires: [],
      conflicts: [],
      guidance: ["Test behavior."],
      checks: ["configured-tests"],
    });

    expect(result.valid).toBe(true);
    expect(result.pack?.id).toBe("testing/unit-tests");
  });

  it("rejects invalid ids, versions, agents, and self dependencies", () => {
    const result = validatePackManifest({
      id: "Bad Pack",
      version: "latest",
      type: "Unknown Type",
      title: "Bad",
      description: "Bad pack.",
      appliesWhen: { agents: ["unknown-agent"] },
      requires: ["Bad Pack"],
      conflicts: [],
      guidance: [],
      checks: [],
      unexpected: true,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ path }) => path)).toContain("id");
    expect(result.issues.map(({ path }) => path)).toContain("version");
    expect(result.issues.map(({ path }) => path)).toContain("type");
    expect(result.issues.map(({ path }) => path)).toContain("appliesWhen.agents");
    expect(result.issues.map(({ path }) => path)).toContain("unexpected");
  });

  it("keeps legacy packs valid and supports community category implementations", () => {
    const legacy = validatePackManifest({
      id: "testing/unit-tests",
      version: "1.0.0",
      type: "testing",
      title: "Unit Tests",
      description: "Focused unit testing guidance.",
      appliesWhen: {},
      requires: [],
      conflicts: [],
      guidance: [],
      checks: [],
    });
    const community = validatePackManifest({
      id: "community/design-review",
      version: "1.0.0",
      type: "creative/ui-design",
      title: "Design Review",
      description: "Implements a community design review strategy.",
      appliesWhen: {},
      strategyIds: ["community/design-review"],
      requires: [],
      conflicts: [],
      guidance: [],
      checks: [],
    });

    expect(legacy.valid).toBe(true);
    expect(legacy.pack?.strategyIds).toEqual([]);
    expect(community.valid).toBe(true);
    expect(community.pack?.type).toBe("creative/ui-design");
  });
});

describe("validateTaxonomyCatalog", () => {
  const validCatalog = {
    schemaVersion: 1,
    namespace: "community",
    categories: [
      {
        id: "community/creative",
        version: "1.0.0",
        title: "Creative",
        description: "Creative work.",
      },
      {
        id: "community/ui-design",
        version: "1.0.0",
        title: "UI Design",
        description: "Interface design.",
        parentId: "community/creative",
      },
    ],
    capabilities: [
      {
        id: "community/accessibility",
        version: "1.0.0",
        title: "Accessibility",
        description: "Accessible outcomes.",
      },
    ],
    constraints: [],
    deliverables: [],
    audiences: [],
    strategies: [
      {
        id: "community/design-review",
        version: "1.0.0",
        title: "Design Review",
        description: "Review interfaces before handoff.",
        categoryId: "community/ui-design",
        capabilityIds: ["community/accessibility"],
        constraintIds: [],
        deliverableIds: [],
        audienceIds: [],
        prerequisites: [],
        conflicts: [],
        compatibleWith: [],
        evidence: [{ source: "community-guide", summary: "Reviewed guidance." }],
        maturity: "stable",
        license: "Apache-2.0",
        risk: "low",
      },
    ],
  };

  it("validates hierarchical community categories and strategy metadata", () => {
    const result = validateTaxonomyCatalog(validCatalog);

    expect(result.valid).toBe(true);
    expect(result.catalog?.categories[1]?.parentId).toBe("community/creative");
    expect(result.catalog?.strategies[0]?.capabilityIds).toEqual([
      "community/accessibility",
    ]);
  });

  it("rejects missing references, duplicate ids, and unsupported schema versions", () => {
    const result = validateTaxonomyCatalog({
      ...validCatalog,
      schemaVersion: 2,
      capabilities: [validCatalog.categories[0]],
      strategies: [
        {
          ...validCatalog.strategies[0],
          categoryId: "community/missing",
          conflicts: ["community/design-review"],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some(({ path }) => path === "schemaVersion")).toBe(true);
    expect(result.issues.some(({ message }) => message === "is declared more than once")).toBe(
      true,
    );
    expect(result.issues.some(({ message }) => message.includes("references missing id"))).toBe(
      true,
    );
    expect(result.issues.some(({ message }) => message.includes("conflict with itself"))).toBe(
      true,
    );
  });
});
