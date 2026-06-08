import { describe, expect, it } from "vitest";
import { validatePackManifest } from "./index.js";

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
      type: "unknown",
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
});
