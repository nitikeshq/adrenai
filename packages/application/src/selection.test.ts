import { describe, expect, it } from "vitest";
import type { SelectionContext, Strategy } from "@adrenai/domain";
import {
  applySelectionAnswer,
  compareStrategies,
  consumeAiCredits,
  createSelectionPlan,
  rankStrategies,
  searchStrategies,
  suggestQuestions,
} from "./selection.js";

const strategy = (
  id: string,
  overrides: Partial<Strategy> = {},
): Strategy => ({
  id,
  version: "1.0.0",
  title: id,
  description: `Description for ${id}.`,
  categoryId: "example/software",
  capabilityIds: [],
  constraintIds: [],
  deliverableIds: [],
  audienceIds: [],
  prerequisites: [],
  conflicts: [],
  compatibleWith: [],
  evidence: [{ source: "test", summary: "Test evidence." }],
  maturity: "stable",
  license: "Apache-2.0",
  risk: "low",
  ...overrides,
});

const strategies = [
  strategy("example/strict", {
    capabilityIds: ["example/reliability"],
    deliverableIds: ["example/test-report"],
    audienceIds: ["example/enterprise"],
    compatibleWith: ["example/fast"],
  }),
  strategy("example/fast", {
    capabilityIds: ["example/speed"],
    deliverableIds: ["example/prototype"],
    audienceIds: ["example/startup"],
    compatibleWith: ["example/strict"],
  }),
  strategy("example/risky", {
    capabilityIds: ["example/speed"],
    risk: "high",
    maturity: "experimental",
  }),
];

const context: SelectionContext = {
  categoryIds: ["example/software"],
  capabilityIds: ["example/reliability"],
  constraintIds: [],
  deliverableIds: ["example/test-report"],
  audienceIds: ["example/enterprise"],
  maximumRisk: "medium",
};

describe("guided strategy selection", () => {
  it("ranks detected context before questions with explainable confidence", () => {
    const ranked = rankStrategies(strategies, context);

    expect(ranked.map(({ strategy }) => strategy.id)).toEqual([
      "example/strict",
      "example/fast",
      "example/risky",
    ]);
    expect(ranked[0]?.confidence).toBe("high");
    expect(ranked[0]?.reasons).toContain("matches requested category");
    expect(ranked[2]?.reasons).toContain("exceeds maximum risk");
  });

  it("asks only recommendation-changing questions within budget", () => {
    const ambiguousContext = {
      ...context,
      capabilityIds: [],
      deliverableIds: [],
      audienceIds: [],
    };
    const tied = rankStrategies(strategies.slice(0, 2), ambiguousContext);
    const questions = suggestQuestions(tied, ambiguousContext, {
      maximumQuestions: 1,
      maximumAiCredits: 0,
      usedQuestions: 0,
      usedAiCredits: 0,
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]?.reason).toContain("can change the recommendation");
    const answered = applySelectionAnswer(
      ambiguousContext,
      {
        maximumQuestions: 1,
        maximumAiCredits: 0,
        usedQuestions: 0,
        usedAiCredits: 0,
      },
      questions[0]!,
      questions[0]!.options[0]!.id,
    );
    expect(answered.budget.usedQuestions).toBe(1);
    expect(() =>
      applySelectionAnswer(answered.context, answered.budget, questions[0]!, questions[0]!.options[0]!.id),
    ).toThrow("question budget exceeded");
    expect(
      suggestQuestions(rankStrategies(strategies, context), context, {
        maximumQuestions: 2,
        maximumAiCredits: 0,
        usedQuestions: 0,
        usedAiCredits: 0,
      }),
    ).toEqual([]);
    expect(
      suggestQuestions(rankStrategies(strategies, context), context, {
        maximumQuestions: 0,
        maximumAiCredits: 0,
        usedQuestions: 0,
        usedAiCredits: 0,
      }),
    ).toEqual([]);
  });

  it("enforces AI-credit budgets independently from deterministic selection", () => {
    const budget = {
      maximumQuestions: 2,
      maximumAiCredits: 3,
      usedQuestions: 0,
      usedAiCredits: 0,
    };
    expect(consumeAiCredits(budget, 2).usedAiCredits).toBe(2);
    expect(() => consumeAiCredits(consumeAiCredits(budget, 2), 2)).toThrow(
      "AI-credit budget exceeded",
    );
  });

  it("supports search, filters, comparison, and compatible hybrids", () => {
    expect(searchStrategies(strategies, { query: "strict" }).map(({ id }) => id)).toEqual([
      "example/strict",
    ]);
    expect(
      searchStrategies(strategies, {
        capabilityIds: ["example/speed"],
        maximumRisk: "medium",
      }).map(({ id }) => id),
    ).toEqual(["example/fast"]);
    expect(compareStrategies(strategies, ["example/strict", "example/fast"])).toMatchObject({
      compatible: true,
      expectedDeliverableIds: ["example/prototype", "example/test-report"],
    });
  });

  it("creates reviewable zero-question defaults and supports presets, skips, and overrides", () => {
    const budget = {
      maximumQuestions: 0,
      maximumAiCredits: 0,
      usedQuestions: 0,
      usedAiCredits: 0,
    };
    const defaultPlan = createSelectionPlan(strategies, context, budget);
    expect(defaultPlan).toMatchObject({
      selectedStrategyIds: ["example/strict"],
      approved: false,
      confidence: "high",
      budget,
    });

    const customPlan = createSelectionPlan(strategies, context, budget, {
      preset: {
        id: "example/hybrid",
        title: "Hybrid",
        strategyIds: ["example/strict", "example/fast"],
      },
      manualOverrideIds: ["example/risky"],
      skippedStrategyIds: ["example/strict"],
    });
    expect(customPlan.manualOverrideIds).toEqual(["example/risky"]);
    expect(customPlan.rejectedStrategyIds).toEqual(["example/strict"]);
    expect(customPlan.confidence).toBe("low");
  });

  it("surfaces prerequisites and conflicts before approval", () => {
    const catalog = [
      strategy("example/base"),
      strategy("example/advanced", {
        prerequisites: ["example/base"],
        conflicts: ["example/legacy"],
      }),
      strategy("example/legacy", { conflicts: ["example/advanced"] }),
    ];
    const plan = createSelectionPlan(catalog, context, {
      maximumQuestions: 2,
      maximumAiCredits: 1,
      usedQuestions: 0,
      usedAiCredits: 0,
    }, { selectedStrategyIds: ["example/advanced", "example/legacy"] });

    expect(plan.prerequisiteIds).toEqual(["example/base"]);
    expect(plan.conflicts).toEqual(["example/advanced", "example/legacy"]);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("selection/strategy-conflict");
    expect(plan.approved).toBe(false);
  });
});
