import type { AgentId, Diagnostic, Evidence, RepositoryInspection, RepositoryRecommendation } from "./index.js";

export type SkillSourceKind = "official" | "community-index" | "browser-catalog";

export interface SkillSourceRecommendation {
  id: string;
  title: string;
  kind: SkillSourceKind;
  url: string;
  searchTerms: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
  requiresReview: true;
  automaticInstall: false;
}

export interface MaterialQuestion {
  id: string;
  prompt: string;
  reason: string;
  defaultAnswer: string;
  choices: string[];
}

export interface ParallelismBudget {
  recommendedAgents: number;
  maximumAgents: number;
  availableMemoryMb: number;
  logicalCpuCount: number;
  independentTaskCount: number;
  providerLimit: number;
  costLimit: number;
  reasons: string[];
}

export interface OrchestrationPlan {
  schemaVersion: 1;
  root: string;
  profile: string;
  mode: "offline-first";
  inspection: RepositoryInspection;
  recommendation: RepositoryRecommendation;
  targetAgents: AgentId[];
  questions: MaterialQuestion[];
  skillSources: SkillSourceRecommendation[];
  executionPhases: string[];
  qualityAreas: string[];
  parallelism: ParallelismBudget;
  agentGuidance: string[];
  diagnostics: Diagnostic[];
  approvalRequired: true;
}

export interface OrchestrationResources {
  availableMemoryMb: number;
  logicalCpuCount: number;
  providerLimit?: number;
  costLimit?: number;
}
