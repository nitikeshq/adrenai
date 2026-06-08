import { describe, expect, it } from "vitest";
import type { DeliverablePlan } from "@adrenai/domain";
import type { DeliverableRenderAdapter } from "./index.js";
import { assertAdapterSupportsPlan, generateAgentArtifacts } from "./index.js";

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

  it("keeps format-neutral planning separate from rendering adapters", async () => {
    const plan: DeliverablePlan = {
      schemaVersion: 1, kind: "document", title: "Plan",
      templateId: "document/standard", brandTokens: { primary: "#123456" },
      sections: [{ id: "summary", title: "Summary", content: ["Approved content."] }],
      accessibilityRequirements: ["accessible headings"],
      validationRules: ["source review"],
      reviewGateIds: ["accessibility-review"],
      exportTargets: [{ format: "docx", purpose: "editable handoff" }],
    };
    const adapter: DeliverableRenderAdapter<"docx"> = {
      format: "docx",
      supportedKinds: ["document"],
      render: async ({ plan: input }) => ({ format: "docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: new TextEncoder().encode(input.title) }),
    };
    const approved = { plan, approvedGateIds: ["accessibility-review"], approvedBy: "reviewer" };
    expect(() => assertAdapterSupportsPlan(adapter, approved)).not.toThrow();
    expect(new TextDecoder().decode((await adapter.render(approved)).bytes)).toBe("Plan");
  });

  it("rejects unsupported plan kinds and unapproved export targets", () => {
    const adapter: DeliverableRenderAdapter<"pptx"> = {
      format: "pptx", supportedKinds: ["presentation"],
      render: async () => ({ format: "pptx", mediaType: "application/pptx", bytes: new Uint8Array() }),
    };
    const plan: DeliverablePlan = {
      schemaVersion: 1, kind: "poster", title: "Poster", templateId: "poster/standard",
      brandTokens: {}, sections: [], accessibilityRequirements: [], validationRules: [],
      reviewGateIds: [], exportTargets: [{ format: "pdf", purpose: "print" }],
    };
    const approved = { plan, approvedGateIds: [], approvedBy: "reviewer" };
    expect(() => assertAdapterSupportsPlan(adapter, approved)).toThrow("does not support poster");
    expect(() => assertAdapterSupportsPlan(adapter, { ...approved, approvedBy: "" })).toThrow("missing required approval evidence");
  });
});
