import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PolicyLayer } from "@adrenai/domain";
import { resolvePolicyLayers } from "@adrenai/domain";
import { validatePolicyCatalog } from "./index.js";

const rule = (
  id: string,
  key: string,
  overrideAllowed: boolean,
  enforcement: "advisory" | "enforceable" = "enforceable",
) => ({
  id,
  key,
  statement: `Statement for ${id}.`,
  enforcement,
  overrideAllowed,
  mandatoryGateIds: enforcement === "enforceable" ? [`${id}-gate`] : [],
});

describe("policy schemas and resolution", () => {
  it("validates the shipped baseline policy catalog", () => {
    const baseline = JSON.parse(
      readFileSync(new URL("../../../catalog/policies/baseline.json", import.meta.url), "utf8"),
    );

    expect(validatePolicyCatalog(baseline).valid).toBe(true);
  });

  it("validates all scopes and separates advisory rules from mandatory gates", () => {
    const result = validatePolicyCatalog({
      schemaVersion: 1,
      layers: [
        {
          id: "example/universal",
          version: "1.0.0",
          scope: "universal",
          rules: [
            rule("example/safety", "safety.secrets", false),
            rule("example/tone", "brand.tone", true, "advisory"),
          ],
        },
        {
          id: "example/organization",
          version: "1.0.0",
          scope: "organization",
          target: "example-inc",
          rules: [rule("example/brand", "brand.tone", true)],
        },
      ],
    });

    expect(result.valid).toBe(true);
    const resolution = resolvePolicyLayers(result.catalog!.layers);
    expect(resolution.rules.map(({ id }) => id)).toEqual([
      "example/safety",
      "example/brand",
    ]);
    expect(resolution.mandatoryGateIds).toEqual([
      "example/brand-gate",
      "example/safety-gate",
    ]);
  });

  it("reports blocked overrides and same-scope conflicts", () => {
    const layers: PolicyLayer[] = [
      {
        id: "example/universal",
        version: "1.0.0",
        scope: "universal",
        rules: [rule("example/safety", "safety.secrets", false)],
      },
      {
        id: "example/project",
        version: "1.0.0",
        scope: "project",
        target: "example",
        rules: [rule("example/weaken-safety", "safety.secrets", true)],
      },
      {
        id: "example/project-two",
        version: "1.0.0",
        scope: "project",
        target: "example",
        rules: [
          rule("example/first-brand", "brand.tone", true),
          rule("example/second-brand", "brand.tone", true),
        ],
      },
    ];

    expect(resolvePolicyLayers(layers).diagnostics.map(({ id }) => id)).toEqual([
      "policy/override-blocked",
      "policy/same-scope-conflict",
    ]);
  });

  it("rejects invalid scopes, advisory gates, and missing scoped targets", () => {
    const result = validatePolicyCatalog({
      schemaVersion: 2,
      layers: [
        {
          id: "bad",
          version: "latest",
          scope: "unknown",
          rules: [rule("example/advice", "brand.tone", true, "advisory")],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ path }) => path)).toContain("schemaVersion");
    expect(result.issues.some(({ path }) => path.endsWith(".target"))).toBe(true);
  });
});
