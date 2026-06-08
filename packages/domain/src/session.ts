import type { AgentId, Diagnostic, GeneratedArtifact } from "./index.js";

export interface SessionManifest {
  schemaVersion: 1;
  id: string;
  workflowId: string;
  workflowVersion: string;
  currentPhaseId: string;
  decisions: Record<string, string>;
  activeGuidance: string[];
  targetAgents: AgentId[];
  requiredGateIds: string[];
  completedGateIds: string[];
  contextHash: string;
  status: "active" | "paused" | "handed-off" | "completed";
}

export interface SessionDriftInput {
  workflowId: string;
  workflowVersion: string;
  currentPhaseId: string;
  contextHash: string;
}

export interface SessionAlignmentReport {
  aligned: boolean;
  diagnostics: Diagnostic[];
}

export interface SessionTeardownPlan {
  sessionId: string;
  paths: string[];
  requiresApproval: true;
}

export interface SessionGeneration {
  manifest: SessionManifest;
  artifacts: GeneratedArtifact[];
}
