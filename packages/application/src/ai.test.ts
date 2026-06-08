import { describe, expect, it } from "vitest";
import {
  approveAiRequest,
  detectAiProviderEnvironments,
  executeOptionalAi,
  previewAiRequest,
  redactAiContent,
} from "./ai.js";

const hasher = { hash: (content: string) => `hash:${content}` };
const descriptor = {
  id: "mock",
  title: "Mock provider",
  capabilities: ["summarize", "gap-analysis"] as const,
  detectionEvidence: ["test"],
};
const budget = {
  maximumTokens: 1000,
  maximumCredits: 1000,
  usedTokens: 0,
  usedCredits: 0,
};

describe("optional AI provider controls", () => {
  it("detects environments through inspectable indicators without exposing values", () => {
    const detected = detectAiProviderEnvironments(
      ["OPENAI_API_KEY"],
      ["CLAUDE.md", ".cursor/rules/project.mdc"],
    );

    expect(detected.map(({ id }) => id)).toEqual(["openai", "anthropic", "cursor"]);
    expect(JSON.stringify(detected)).not.toContain("actual-secret-value");
    expect(detected[0]?.detectionEvidence).toContain(
      "environment variable present: OPENAI_API_KEY",
    );
  });

  it("redacts secret material and previews cost before consent", () => {
    const redacted = redactAiContent("api_key=super-secret-value password=hunter2");
    const preview = previewAiRequest(descriptor, "summarize", "token=secret-value-123", "offline summary");

    expect(redacted.content).not.toContain("super-secret-value");
    expect(preview.redactedContent).not.toContain("secret-value-123");
    expect(preview.consentRequired).toBe(true);
    expect(preview.estimatedTokens).toBeGreaterThan(0);
  });

  it("uses a mock provider only with matching consent and available budget", async () => {
    const preview = previewAiRequest(descriptor, "summarize", "public content", "offline summary");
    const provider = {
      descriptor,
      execute: async () => "provider summary",
    };
    const approved = await executeOptionalAi(
      provider,
      preview,
      approveAiRequest(preview, hasher),
      budget,
      hasher,
      () => "offline summary",
    );
    const changedConsent = await executeOptionalAi(
      provider,
      { ...preview, redactedContent: "changed scope" },
      approveAiRequest(preview, hasher),
      budget,
      hasher,
      () => "offline summary",
    );

    expect(approved.value).toBe("provider summary");
    expect(approved.audit.outcome).toBe("provider");
    expect(approved.budget.usedCredits).toBe(preview.estimatedCredits);
    expect(changedConsent.value).toBe("offline summary");
    expect(changedConsent.audit.reason).toContain("consent");
  });

  it("falls back deterministically on budget or provider failure", async () => {
    const preview = previewAiRequest(descriptor, "gap-analysis", "public content", "offline gaps");
    const failing = {
      descriptor,
      execute: async () => {
        throw new Error("provider unavailable");
      },
    };
    const noBudget = await executeOptionalAi(
      failing,
      preview,
      approveAiRequest(preview, hasher),
      { ...budget, maximumCredits: 0 },
      hasher,
      () => ["offline"],
    );
    const failure = await executeOptionalAi(
      failing,
      preview,
      approveAiRequest(preview, hasher),
      budget,
      hasher,
      () => ["offline"],
    );

    expect(noBudget.value).toEqual(["offline"]);
    expect(noBudget.audit.reason).toContain("budget");
    expect(failure.audit.reason).toBe("provider unavailable");
    expect(failure.budget.usedCredits).toBe(0);
  });
});
