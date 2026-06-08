import { describe, expect, it } from "vitest";
import type {
  ProjectSynthesisInput,
  SelectionContext,
  Strategy,
  WorkflowCandidate,
} from "@adrenai/domain";
import {
  enhanceProjectBrief,
  renderProjectBriefMarkdown,
  synthesizeProjectBrief,
} from "./synthesis.js";

const strategies: Strategy[] = [
  {
    id: "example/reliable",
    version: "1.0.0",
    title: "Reliable Delivery",
    description: "Prioritize verified delivery.",
    categoryId: "example/software",
    capabilityIds: ["example/reliability"],
    constraintIds: [],
    deliverableIds: ["example/test-report"],
    audienceIds: ["example/enterprise"],
    prerequisites: [],
    conflicts: [],
    compatibleWith: [],
    evidence: [],
    maturity: "stable",
    license: "Apache-2.0",
    risk: "low",
  },
  {
    id: "example/rapid",
    version: "1.0.0",
    title: "Rapid Prototype",
    description: "Prioritize a prototype.",
    categoryId: "example/software",
    capabilityIds: ["example/speed"],
    constraintIds: [],
    deliverableIds: ["example/prototype"],
    audienceIds: ["example/startup"],
    prerequisites: [],
    conflicts: [],
    compatibleWith: [],
    evidence: [],
    maturity: "stable",
    license: "Apache-2.0",
    risk: "medium",
  },
];

const workflows: WorkflowCandidate[] = [{
  categoryIds: ["example/software"],
  strategyIds: ["example/reliable"],
  workflow: {
    schemaVersion: 1,
    id: "example/software-delivery",
    version: "1.0.0",
    title: "Software Delivery",
    phases: [],
  },
}];

const input: ProjectSynthesisInput = {
  inspection: {
    root: "/project",
    technologies: [{
      id: "typescript",
      kind: "language",
      evidence: [{ path: "package.json", reason: "dependency" }],
    }],
    agents: [{
      agent: "codex",
      configurationFiles: ["AGENTS.md"],
      skillFiles: [],
      evidence: [{ path: "AGENTS.md", reason: "agent configuration" }],
    }],
  },
  requirements: [{
    text: "Run tests before completion.",
    normalized: "run tests before completion",
    polarity: "require",
    source: "AGENTS.md",
    scope: "/",
    line: 4,
  }],
  diagnostics: [{
    id: "instructions/conflicting-requirements",
    severity: "error",
    message: "Conflicting test requirements.",
    evidence: [{ path: "AGENTS.md:4", reason: "conflict" }],
  }],
};

const budget = {
  maximumQuestions: 2,
  maximumAiCredits: 0,
  usedQuestions: 0,
  usedAiCredits: 0,
};

describe("existing project synthesis", () => {
  it("separates evidence-backed facts, authored constraints, inference, and conflicts", () => {
    const context: SelectionContext = {
      categoryIds: ["example/software"],
      capabilityIds: ["example/reliability"],
      constraintIds: [],
      deliverableIds: ["example/test-report"],
      audienceIds: ["example/enterprise"],
    };
    const brief = synthesizeProjectBrief(input, strategies, workflows, context, budget);

    expect(brief.facts.map(({ sourceKind }) => sourceKind)).toEqual(["detected", "detected"]);
    expect(brief.constraints[0]).toMatchObject({
      sourceKind: "authored",
      confidence: "high",
    });
    expect(brief.inferredSuggestions[0]).toMatchObject({
      sourceKind: "inferred",
      confidence: "medium",
    });
    expect(brief.conflicts).toHaveLength(1);
    expect(brief.reviewStatus).toBe("proposed");
  });

  it("suggests workflows and strategies before asking only material questions", () => {
    const resolved = synthesizeProjectBrief(input, strategies, workflows, {
      categoryIds: ["example/software"],
      capabilityIds: ["example/reliability"],
      constraintIds: [],
      deliverableIds: ["example/test-report"],
      audienceIds: ["example/enterprise"],
    }, budget);
    expect(resolved.strategySuggestions[0]?.strategy.id).toBe("example/reliable");
    expect(resolved.workflowSuggestions[0]?.workflowId).toBe("example/software-delivery");
    expect(resolved.unresolvedQuestions).toEqual([]);

    const ambiguous = synthesizeProjectBrief(input, strategies, workflows, {
      categoryIds: ["example/software"],
      capabilityIds: [],
      constraintIds: [],
      deliverableIds: [],
      audienceIds: [],
    }, budget);
    expect(ambiguous.unresolvedQuestions.length).toBeGreaterThan(0);
  });

  it("adds optional AI suggestions without converting them into facts", async () => {
    const brief = synthesizeProjectBrief(input, strategies, workflows, {
      categoryIds: ["example/software"],
      capabilityIds: [],
      constraintIds: [],
      deliverableIds: [],
      audienceIds: [],
    }, budget);
    const enhanced = await enhanceProjectBrief(brief, {
      enhance: async () => [{
        id: "ai/custom-summary",
        text: "Consider a staged rollout.",
        confidence: "low",
      }],
    });
    const markdown = renderProjectBriefMarkdown(enhanced);

    expect(enhanced.aiSuggestions[0]?.sourceKind).toBe("ai-suggested");
    expect(enhanced.facts.some(({ id }) => id === "ai/custom-summary")).toBe(false);
    expect(markdown).toContain("## Verified Facts");
    expect(markdown).toContain("[ai-suggested; low; evidence: none]");
    expect(markdown).toContain("Status: proposed");
  });
});
