import type {
  Diagnostic,
  Evidence,
  InstructionRequirement,
  RecommendationConfidence,
  RepositoryInspection,
} from "./index.js";
import type { SelectionQuestion, StrategyScore } from "./selection.js";
import type { WorkflowManifest } from "./workflow.js";

export type BriefSourceKind = "detected" | "authored" | "inferred" | "ai-suggested";

export interface BriefStatement {
  id: string;
  text: string;
  sourceKind: BriefSourceKind;
  confidence: RecommendationConfidence;
  evidence: Evidence[];
}

export interface WorkflowCandidate {
  workflow: WorkflowManifest;
  categoryIds: string[];
  strategyIds: string[];
}

export interface WorkflowSuggestion {
  workflowId: string;
  title: string;
  confidence: RecommendationConfidence;
  reasons: string[];
}

export interface ProjectBrief {
  schemaVersion: 1;
  root: string;
  title: string;
  facts: BriefStatement[];
  constraints: BriefStatement[];
  inferredSuggestions: BriefStatement[];
  aiSuggestions: BriefStatement[];
  unresolvedQuestions: SelectionQuestion[];
  conflicts: Diagnostic[];
  strategySuggestions: StrategyScore[];
  workflowSuggestions: WorkflowSuggestion[];
  sourceRequirements: InstructionRequirement[];
  reviewStatus: "proposed";
}

export interface ProjectSynthesisInput {
  inspection: RepositoryInspection;
  requirements: InstructionRequirement[];
  diagnostics: Diagnostic[];
}
