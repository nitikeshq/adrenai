export type AgentId =
  | "claude-code"
  | "codex"
  | "cursor"
  | "gemini"
  | "github-copilot"
  | "kiro"
  | "generic";

export interface Evidence {
  path: string;
  reason: string;
}

export interface AgentConfiguration {
  agent: AgentId;
  configurationFiles: string[];
  skillFiles: string[];
  evidence: Evidence[];
}

export interface ProjectTechnology {
  id: string;
  kind: "language" | "framework" | "test-tool" | "ci" | "package-manager";
  evidence: Evidence[];
}

export interface RepositoryInspection {
  root: string;
  agents: AgentConfiguration[];
  technologies: ProjectTechnology[];
}

export type RecommendationConfidence = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  confidence: RecommendationConfidence;
  evidence: Evidence[];
  proposedActions: string[];
}

export interface RepositoryRecommendation {
  root: string;
  profile: string;
  recommendations: Recommendation[];
}

export interface GeneratedArtifact {
  path: string;
  content: string;
  purpose: string;
}

export interface ManagedArtifact {
  path: string;
  purpose: string;
  contentHash: string;
}

export interface GenerationManifest {
  version: 1;
  artifacts: ManagedArtifact[];
}

export interface AdrenaiConfig {
  version: 1;
  profile: string;
  mode: "portable";
  selectedPacks: string[];
  agents: {
    targets: AgentId[];
  };
}

export interface DriftReport {
  root: string;
  diagnostics: Diagnostic[];
}

export interface ApplyResult {
  written: string[];
  skipped: string[];
}

export type RequirementPolarity = "require" | "prohibit";

export interface InstructionRequirement {
  text: string;
  normalized: string;
  polarity: RequirementPolarity;
  source: string;
  scope: string;
  line: number;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  id: string;
  severity: DiagnosticSeverity;
  message: string;
  evidence: Evidence[];
}

export interface DoctorReport {
  root: string;
  requirements: InstructionRequirement[];
  diagnostics: Diagnostic[];
  estimatedInstructionTokens: number;
}

export type PackType =
  | "architecture"
  | "development"
  | "governance"
  | "operations"
  | "security"
  | "testing";

export interface PackApplicability {
  technologies?: string[];
  agents?: AgentId[];
}

export interface Pack {
  id: string;
  version: string;
  type: PackType;
  title: string;
  description: string;
  appliesWhen: PackApplicability;
  requires: string[];
  conflicts: string[];
  guidance: string[];
  checks: string[];
}

export interface PackValidationIssue {
  path: string;
  message: string;
}

export interface PackValidationResult {
  valid: boolean;
  issues: PackValidationIssue[];
  pack?: Pack;
}

export interface PackResolution {
  requested: string[];
  resolved: Pack[];
  diagnostics: Diagnostic[];
}

export * from "./checks.js";
