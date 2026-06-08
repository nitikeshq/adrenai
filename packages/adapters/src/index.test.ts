import { describe, expect, it } from "vitest";
import { generateAgentArtifacts } from "./index.js";

const context = {
  recommendation: {
    root: "/project",
    profile: "TypeScript project baseline",
    recommendations: [],
  },
  packResolution: {
    requested: [],
    diagnostics: [],
    resolved: [
      {
        id: "development/typescript-baseline",
        version: "1.0.0",
        type: "development" as const,
        title: "TypeScript",
        description: "TypeScript guidance.",
        appliesWhen: {},
        requires: [],
        conflicts: [],
        guidance: ["Preserve strict typing."],
        checks: [],
      },
    ],
  },
};

describe("generateAgentArtifacts", () => {
  it("generates native artifacts for supported targets", () => {
    const artifacts = generateAgentArtifacts(
      ["codex", "claude-code", "github-copilot", "cursor", "kiro", "gemini"],
      context,
    );

    expect(artifacts.map(({ path }) => path)).toEqual([
      ".claude/skills/adrenai-project-guidance/SKILL.md",
      ".cursor/rules/adrenai.mdc",
      ".github/copilot-instructions.md",
      ".kiro/steering/adrenai.md",
      "AGENTS.md",
      "GEMINI.md",
    ]);
    expect(artifacts.every(({ content }) => content.includes("Preserve strict typing."))).toBe(
      true,
    );
  });

  it("deduplicates artifacts shared by generic and Codex adapters", () => {
    const artifacts = generateAgentArtifacts(["generic", "codex"], context);

    expect(artifacts.map(({ path }) => path)).toEqual(["AGENTS.md"]);
  });
});
