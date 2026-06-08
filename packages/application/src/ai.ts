import type {
  AiAuditEntry,
  AiBudget,
  AiCapability,
  AiConsent,
  AiExecutionResult,
  AiProviderDescriptor,
  AiRequestPreview,
} from "@adrenai/domain";

export interface AiProvider {
  descriptor: Omit<AiProviderDescriptor, "detectionEvidence">;
  execute<T>(capability: AiCapability, content: string): Promise<T>;
}

export interface AiContentHasher {
  hash(content: string): string;
}

const DETECTION_RULES: Array<{
  provider: Omit<AiProviderDescriptor, "detectionEvidence">;
  environmentKeys: string[];
  filePatterns: RegExp[];
}> = [
  {
    provider: { id: "openai", title: "OpenAI-compatible provider", capabilities: ["summarize", "gap-analysis", "custom-strategy"] },
    environmentKeys: ["OPENAI_API_KEY"],
    filePatterns: [/(^|\/)\.codex\//i, /(^|\/)AGENTS\.md$/i],
  },
  {
    provider: { id: "anthropic", title: "Anthropic-compatible provider", capabilities: ["summarize", "gap-analysis", "custom-strategy"] },
    environmentKeys: ["ANTHROPIC_API_KEY"],
    filePatterns: [/(^|\/)\.claude\//i, /(^|\/)CLAUDE\.md$/i],
  },
  {
    provider: { id: "cursor", title: "Cursor local environment", capabilities: ["summarize", "gap-analysis"] },
    environmentKeys: [],
    filePatterns: [/(^|\/)\.cursor\//i, /(^|\/)\.cursorrules$/i],
  },
];

export function detectAiProviderEnvironments(
  environmentKeys: string[],
  repositoryFiles: string[],
): AiProviderDescriptor[] {
  const environment = new Set(environmentKeys);
  return DETECTION_RULES.flatMap(({ provider, environmentKeys: keys, filePatterns }) => {
    const evidence = [
      ...keys.filter((key) => environment.has(key)).map((key) => `environment variable present: ${key}`),
      ...repositoryFiles.filter((path) => filePatterns.some((pattern) => pattern.test(path))).map((path) => `configuration indicator: ${path}`),
    ];
    return evidence.length ? [{ ...provider, detectionEvidence: evidence }] : [];
  });
}

export function redactAiContent(content: string): { content: string; redactions: string[] } {
  const redactions: string[] = [];
  let redacted = content.replace(
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    () => {
      redactions.push("private-key");
      return "[REDACTED PRIVATE KEY]";
    },
  );
  redacted = redacted.replace(
    /\b(?:sk-[A-Za-z0-9_-]{12,}|(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+)/gi,
    (match) => {
      redactions.push("secret-like-value");
      return `[REDACTED ${match.split(/[:=]/)[0]?.trim().toUpperCase() ?? "SECRET"}]`;
    },
  );
  return { content: redacted, redactions: [...new Set(redactions)] };
}

export function previewAiRequest(
  provider: AiProviderDescriptor,
  capability: AiCapability,
  content: string,
  deterministicFallback: string,
): AiRequestPreview {
  if (!provider.capabilities.includes(capability)) throw new Error(`Provider ${provider.id} does not support ${capability}.`);
  const redacted = redactAiContent(content);
  const estimatedTokens = Math.max(1, Math.ceil(redacted.content.length / 4));
  return {
    providerId: provider.id,
    capability,
    redactedContent: redacted.content,
    redactions: redacted.redactions,
    estimatedTokens,
    estimatedCredits: estimatedTokens,
    consentRequired: true,
    deterministicFallback,
  };
}

export function approveAiRequest(
  preview: AiRequestPreview,
  hasher: AiContentHasher,
): AiConsent {
  return {
    providerId: preview.providerId,
    capability: preview.capability,
    approvedContentHash: hasher.hash(preview.redactedContent),
    approved: true,
  };
}

export async function executeOptionalAi<T>(
  provider: AiProvider,
  preview: AiRequestPreview,
  consent: AiConsent | undefined,
  budget: AiBudget,
  hasher: AiContentHasher,
  fallback: () => T,
): Promise<AiExecutionResult<T>> {
  const contentHash = hasher.hash(preview.redactedContent);
  const blocked = (reason: string): AiExecutionResult<T> => ({
    value: fallback(),
    budget: { ...budget },
    audit: {
      providerId: preview.providerId,
      capability: preview.capability,
      estimatedTokens: preview.estimatedTokens,
      estimatedCredits: preview.estimatedCredits,
      outcome: "offline-fallback",
      reason,
    },
  });
  if (
    !consent?.approved ||
    consent.providerId !== preview.providerId ||
    consent.capability !== preview.capability ||
    consent.approvedContentHash !== contentHash
  ) return blocked("explicit consent missing or scope changed");
  if (
    budget.usedTokens + preview.estimatedTokens > budget.maximumTokens ||
    budget.usedCredits + preview.estimatedCredits > budget.maximumCredits
  ) return blocked("AI budget exceeded");
  try {
    const value = await provider.execute<T>(preview.capability, preview.redactedContent);
    return {
      value,
      budget: {
        ...budget,
        usedTokens: budget.usedTokens + preview.estimatedTokens,
        usedCredits: budget.usedCredits + preview.estimatedCredits,
      },
      audit: {
        providerId: preview.providerId,
        capability: preview.capability,
        estimatedTokens: preview.estimatedTokens,
        estimatedCredits: preview.estimatedCredits,
        transmittedContentHash: contentHash,
        outcome: "provider",
      },
    };
  } catch (error) {
    const audit: AiAuditEntry = {
      providerId: preview.providerId,
      capability: preview.capability,
      estimatedTokens: preview.estimatedTokens,
      estimatedCredits: preview.estimatedCredits,
      outcome: "offline-fallback",
      reason: error instanceof Error ? error.message : "provider failed",
    };
    return { value: fallback(), budget: { ...budget }, audit };
  }
}
