import { describe, expect, it } from "vitest";
import type { RepositoryInspection, RepositoryRecommendation } from "@adrenai/domain";
import { createOrchestrationPlan, orchestrationStateArtifact } from "./orchestration.js";

const inspection: RepositoryInspection = {
  root: "/cms",
  agents: [{ agent: "codex", configurationFiles: ["AGENTS.md"], skillFiles: [], evidence: [{ path: "AGENTS.md", reason: "agent configuration file" }] }],
  technologies: [
    { id: "typescript", kind: "language", evidence: [{ path: "package.json", reason: "typescript indicator" }] },
    { id: "nextjs", kind: "framework", evidence: [{ path: "package.json", reason: "nextjs indicator" }] },
    { id: "cms", kind: "framework", evidence: [{ path: "package.json", reason: "cms indicator" }] },
  ],
};
const recommendation: RepositoryRecommendation = {
  root: "/cms",
  profile: "Next.js project baseline",
  recommendations: [],
};

describe("orchestration planning", () => {
  it("creates an approval-first CMS plan with reviewed skill sources", () => {
    const plan = createOrchestrationPlan(inspection, recommendation, {
      availableMemoryMb: 8192,
      logicalCpuCount: 8,
      providerLimit: 5,
      costLimit: 3,
    });

    expect(plan.questions.map(({ id }) => id)).toContain("requirements/content-model");
    expect(plan.skillSources.map(({ id }) => id)).toEqual([
      "skills-sh",
      "anthropic-skills",
      "vercel-agent-skills",
      "browse-sh",
    ]);
    expect(plan.skillSources.every(({ requiresReview, automaticInstall }) => requiresReview && !automaticInstall)).toBe(true);
    expect(plan.parallelism.recommendedAgents).toBe(3);
    expect(plan.approvalRequired).toBe(true);
  });

  it("stores one compact orchestration state artifact", () => {
    const plan = createOrchestrationPlan(inspection, recommendation, {
      availableMemoryMb: 1024,
      logicalCpuCount: 2,
    });
    const artifact = orchestrationStateArtifact(plan);

    expect(artifact.path).toBe(".adrenai/orchestration.json");
    const state = JSON.parse(artifact.content);
    expect(state.parallelism.recommendedAgents).toBe(1);
    expect(state.inspection).toBeUndefined();
    expect(state.recommendation).toBeUndefined();
    expect(state.questions[0]).toMatchObject({ status: "defaulted", answerSource: "default" });
  });
});
