import { describe, expect, it } from "vitest";
import { validateAdrenaiConfig, validateGenerationManifest } from "./index.js";

describe("configuration schemas", () => {
  it("validates AdrenAI configuration", () => {
    const result = validateAdrenaiConfig({
      version: 1,
      profile: "TypeScript baseline",
      mode: "portable",
      selected_packs: ["development/typescript-baseline"],
      agents: { targets: ["codex"] },
    });

    expect(result.valid).toBe(true);
    expect(result.config?.agents.targets).toEqual(["codex"]);
  });

  it("rejects invalid configurations and generation manifests", () => {
    expect(
      validateAdrenaiConfig({
        version: 2,
        profile: "",
        mode: "unknown",
        selected_packs: ["bad"],
        agents: { targets: [] },
      }).valid,
    ).toBe(false);
    expect(
      validateGenerationManifest({
        version: 1,
        artifacts: [{ path: "AGENTS.md", purpose: "guidance", contentHash: "bad" }],
      }).valid,
    ).toBe(false);
  });
});
