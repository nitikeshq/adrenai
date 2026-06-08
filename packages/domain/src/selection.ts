import type { Diagnostic } from "./index.js";
import type { Strategy, StrategyMaturity, StrategyRisk } from "./taxonomy.js";

export interface SelectionContext {
  categoryIds: string[];
  capabilityIds: string[];
  constraintIds: string[];
  deliverableIds: string[];
  audienceIds: string[];
  preferredMaturity?: StrategyMaturity;
  maximumRisk?: StrategyRisk;
}

export interface StrategyScore {
  strategy: Strategy;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

export interface SelectionQuestionOption {
  id: string;
  label: string;
  addsCapabilityIds?: string[];
  addsDeliverableIds?: string[];
  addsAudienceIds?: string[];
}

export interface SelectionQuestion {
  id: string;
  prompt: string;
  reason: string;
  informationGain: number;
  options: SelectionQuestionOption[];
}

export interface SelectionBudget {
  maximumQuestions: number;
  maximumAiCredits: number;
  usedQuestions: number;
  usedAiCredits: number;
}

export interface StrategyPreset {
  id: string;
  title: string;
  strategyIds: string[];
}

export interface StrategyComparison {
  strategyIds: string[];
  conflicts: string[];
  missingPrerequisites: string[];
  expectedDeliverableIds: string[];
  compatible: boolean;
}

export interface StrategySelectionPlan {
  selectedStrategyIds: string[];
  manualOverrideIds: string[];
  rejectedStrategyIds: string[];
  expectedDeliverableIds: string[];
  prerequisiteIds: string[];
  conflicts: string[];
  confidence: "high" | "medium" | "low";
  budget: SelectionBudget;
  diagnostics: Diagnostic[];
  approved: false;
}
