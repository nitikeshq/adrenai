export type AiCapability = "summarize" | "gap-analysis" | "custom-strategy";

export interface AiProviderDescriptor {
  id: string;
  title: string;
  capabilities: AiCapability[];
  detectionEvidence: string[];
}

export interface AiBudget {
  maximumTokens: number;
  maximumCredits: number;
  usedTokens: number;
  usedCredits: number;
}

export interface AiRequestPreview {
  providerId: string;
  capability: AiCapability;
  redactedContent: string;
  redactions: string[];
  estimatedTokens: number;
  estimatedCredits: number;
  consentRequired: true;
  deterministicFallback: string;
}

export interface AiConsent {
  providerId: string;
  capability: AiCapability;
  approvedContentHash: string;
  approved: true;
}

export interface AiAuditEntry {
  providerId: string;
  capability: AiCapability;
  estimatedTokens: number;
  estimatedCredits: number;
  transmittedContentHash?: string;
  outcome: "provider" | "offline-fallback" | "blocked";
  reason?: string;
}

export interface AiExecutionResult<T> {
  value: T;
  budget: AiBudget;
  audit: AiAuditEntry;
}
