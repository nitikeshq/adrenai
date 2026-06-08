import type {
  SelectionBudget,
  SelectionContext,
  SelectionQuestion,
  Strategy,
  StrategyComparison,
  StrategyPreset,
  StrategyScore,
  StrategySelectionPlan,
} from "@adrenai/domain";

const RISK = { low: 0, medium: 1, high: 2 } as const;
const MATURITY = { experimental: 0, emerging: 1, stable: 2, established: 3 } as const;

function intersections(left: string[], right: Set<string>): string[] {
  return left.filter((id) => right.has(id));
}

export function rankStrategies(
  strategies: Strategy[],
  context: SelectionContext,
): StrategyScore[] {
  const categories = new Set(context.categoryIds);
  const capabilities = new Set(context.capabilityIds);
  const constraints = new Set(context.constraintIds);
  const deliverables = new Set(context.deliverableIds);
  const audiences = new Set(context.audienceIds);
  return strategies
    .map((strategy): StrategyScore => {
      const reasons: string[] = [];
      let score = 0;
      if (categories.has(strategy.categoryId)) {
        score += 40;
        reasons.push("matches requested category");
      }
      for (const [label, matches, weight] of [
        ["capability", intersections(strategy.capabilityIds, capabilities), 12],
        ["constraint", intersections(strategy.constraintIds, constraints), 10],
        ["deliverable", intersections(strategy.deliverableIds, deliverables), 10],
        ["audience", intersections(strategy.audienceIds, audiences), 8],
      ] as const) {
        if (matches.length) {
          score += matches.length * weight;
          reasons.push(`matches ${label}: ${matches.join(", ")}`);
        }
      }
      if (context.preferredMaturity === strategy.maturity) {
        score += 5;
        reasons.push("matches preferred maturity");
      }
      if (context.maximumRisk && RISK[strategy.risk] > RISK[context.maximumRisk]) {
        score -= 50;
        reasons.push("exceeds maximum risk");
      }
      return {
        strategy,
        score,
        confidence: score >= 55 ? "high" : score >= 30 ? "medium" : "low",
        reasons,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        MATURITY[right.strategy.maturity] - MATURITY[left.strategy.maturity] ||
        left.strategy.id.localeCompare(right.strategy.id),
    );
}

export interface StrategyFilter {
  query?: string;
  categoryIds?: string[];
  capabilityIds?: string[];
  maturity?: Strategy["maturity"][];
  maximumRisk?: Strategy["risk"];
}

export function searchStrategies(strategies: Strategy[], filter: StrategyFilter): Strategy[] {
  const query = filter.query?.trim().toLowerCase();
  return strategies.filter((strategy) => {
    if (query && ![strategy.id, strategy.title, strategy.description].some((value) => value.toLowerCase().includes(query))) return false;
    if (filter.categoryIds?.length && !filter.categoryIds.includes(strategy.categoryId)) return false;
    if (filter.capabilityIds?.length && !filter.capabilityIds.some((id) => strategy.capabilityIds.includes(id))) return false;
    if (filter.maturity?.length && !filter.maturity.includes(strategy.maturity)) return false;
    if (filter.maximumRisk && RISK[strategy.risk] > RISK[filter.maximumRisk]) return false;
    return true;
  });
}

export function compareStrategies(strategies: Strategy[], strategyIds: string[]): StrategyComparison {
  const selected = strategies.filter(({ id }) => strategyIds.includes(id));
  const selectedIds = new Set(selected.map(({ id }) => id));
  const conflicts = [...new Set(selected.flatMap(({ conflicts }) => conflicts.filter((id) => selectedIds.has(id))))].sort();
  const missingPrerequisites = [...new Set(selected.flatMap(({ prerequisites }) => prerequisites.filter((id) => !selectedIds.has(id))))].sort();
  const incompatible = selected.some((strategy) =>
    selected.some(
      (other) =>
        other.id !== strategy.id &&
        !strategy.compatibleWith.includes(other.id) &&
        strategy.categoryId === other.categoryId,
    ),
  );
  return {
    strategyIds: selected.map(({ id }) => id),
    conflicts,
    missingPrerequisites,
    expectedDeliverableIds: [...new Set(selected.flatMap(({ deliverableIds }) => deliverableIds))].sort(),
    compatible: conflicts.length === 0 && !incompatible,
  };
}

export function suggestQuestions(
  ranked: StrategyScore[],
  context: SelectionContext,
  budget: SelectionBudget,
): SelectionQuestion[] {
  if (budget.maximumQuestions <= budget.usedQuestions || ranked.length < 2) return [];
  const [first, second] = ranked;
  if (!first || !second || first.score - second.score >= 15) return [];
  const candidates: SelectionQuestion[] = [];
  const add = (kind: "capability" | "deliverable" | "audience", firstIds: string[], secondIds: string[], known: string[]) => {
    const knownIds = new Set(known);
    const left = firstIds.filter((id) => !secondIds.includes(id) && !knownIds.has(id));
    const right = secondIds.filter((id) => !firstIds.includes(id) && !knownIds.has(id));
    if (!left.length || !right.length) return;
    candidates.push({
      id: `selection/${kind}`,
      prompt: `Which ${kind} matters more?`,
      reason: `The leading strategies differ on ${kind}, so this answer can change the recommendation.`,
      informationGain: Math.min(left.length, right.length),
      options: [
        { id: left[0]!, label: left[0]!, [`adds${kind[0]!.toUpperCase()}${kind.slice(1)}Ids`]: [left[0]!] },
        { id: right[0]!, label: right[0]!, [`adds${kind[0]!.toUpperCase()}${kind.slice(1)}Ids`]: [right[0]!] },
      ],
    } as SelectionQuestion);
  };
  add("capability", first.strategy.capabilityIds, second.strategy.capabilityIds, context.capabilityIds);
  add("deliverable", first.strategy.deliverableIds, second.strategy.deliverableIds, context.deliverableIds);
  add("audience", first.strategy.audienceIds, second.strategy.audienceIds, context.audienceIds);
  return candidates
    .sort((left, right) => right.informationGain - left.informationGain || left.id.localeCompare(right.id))
    .slice(0, budget.maximumQuestions - budget.usedQuestions);
}

export function applySelectionAnswer(
  context: SelectionContext,
  budget: SelectionBudget,
  question: SelectionQuestion,
  optionId: string,
): { context: SelectionContext; budget: SelectionBudget } {
  if (budget.usedQuestions >= budget.maximumQuestions) {
    throw new Error("Selection question budget exceeded.");
  }
  const option = question.options.find(({ id }) => id === optionId);
  if (!option) throw new Error(`Unknown option ${optionId} for question ${question.id}.`);
  return {
    context: {
      ...context,
      capabilityIds: [...new Set([...context.capabilityIds, ...(option.addsCapabilityIds ?? [])])],
      deliverableIds: [...new Set([...context.deliverableIds, ...(option.addsDeliverableIds ?? [])])],
      audienceIds: [...new Set([...context.audienceIds, ...(option.addsAudienceIds ?? [])])],
    },
    budget: { ...budget, usedQuestions: budget.usedQuestions + 1 },
  };
}

export function consumeAiCredits(budget: SelectionBudget, credits: number): SelectionBudget {
  if (!Number.isInteger(credits) || credits < 0) throw new Error("AI credits must be a non-negative integer.");
  if (budget.usedAiCredits + credits > budget.maximumAiCredits) {
    throw new Error("Selection AI-credit budget exceeded.");
  }
  return { ...budget, usedAiCredits: budget.usedAiCredits + credits };
}

export function createSelectionPlan(
  strategies: Strategy[],
  context: SelectionContext,
  budget: SelectionBudget,
  options: {
    selectedStrategyIds?: string[];
    preset?: StrategyPreset;
    manualOverrideIds?: string[];
    skippedStrategyIds?: string[];
  } = {},
): StrategySelectionPlan {
  const ranked = rankStrategies(strategies, context);
  const selectedStrategyIds = [...new Set(options.selectedStrategyIds ?? options.preset?.strategyIds ?? ranked.slice(0, 1).map(({ strategy }) => strategy.id))];
  const manualOverrideIds = [...new Set(options.manualOverrideIds ?? [])];
  const allSelected = [...new Set([...selectedStrategyIds, ...manualOverrideIds])];
  const comparison = compareStrategies(strategies, allSelected);
  const unknown = allSelected.filter((id) => !strategies.some((strategy) => strategy.id === id));
  const diagnostics = [
    ...unknown.map((id) => ({
      id: "selection/unknown-strategy",
      severity: "error" as const,
      message: `Selected strategy ${id} does not exist.`,
      evidence: [{ path: id, reason: "manual or preset selection" }],
    })),
    ...comparison.conflicts.map((id) => ({
      id: "selection/strategy-conflict",
      severity: "error" as const,
      message: `Selected strategies conflict through ${id}.`,
      evidence: [{ path: id, reason: "declared conflict" }],
    })),
    ...comparison.missingPrerequisites.map((id) => ({
      id: "selection/missing-prerequisite",
      severity: "error" as const,
      message: `Selected strategies require ${id}.`,
      evidence: [{ path: id, reason: "missing prerequisite" }],
    })),
  ];
  const confidence = allSelected.every((id) => ranked.find(({ strategy }) => strategy.id === id)?.confidence === "high")
    ? "high"
    : allSelected.some((id) => ranked.find(({ strategy }) => strategy.id === id)?.confidence === "low" || manualOverrideIds.includes(id))
      ? "low"
      : "medium";
  return {
    selectedStrategyIds: allSelected,
    manualOverrideIds,
    rejectedStrategyIds: [...new Set(options.skippedStrategyIds ?? [])],
    expectedDeliverableIds: comparison.expectedDeliverableIds,
    prerequisiteIds: comparison.missingPrerequisites,
    conflicts: comparison.conflicts,
    confidence,
    budget: { ...budget },
    diagnostics,
    approved: false,
  };
}
