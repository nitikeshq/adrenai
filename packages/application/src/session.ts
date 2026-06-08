import type {
  AgentId,
  Diagnostic,
  SessionAlignmentReport,
  SessionDriftInput,
  SessionGeneration,
  SessionManifest,
  SessionTeardownPlan,
} from "@adrenai/domain";

export interface SessionHasher {
  hash(content: string): string;
}

function sessionPath(id: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Session id must be lowercase and path-safe.");
  return `.adrenai/sessions/${id}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function hashSessionContext(value: unknown, hasher: SessionHasher): string {
  return hasher.hash(JSON.stringify(stableValue(value)));
}

function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) =>
      /(secret|token|password|credential|api[_-]?key|auth)/i.test(key) ||
      containsSecretKey(child),
  );
}

export function createSession(
  input: Omit<SessionManifest, "schemaVersion" | "contextHash" | "status"> & {
    context: unknown;
  },
  hasher: SessionHasher,
): SessionGeneration {
  const root = sessionPath(input.id);
  if (containsSecretKey(input.decisions) || containsSecretKey(input.context)) {
    throw new Error("Session state contains a secret-like key.");
  }
  const manifest: SessionManifest = {
    schemaVersion: 1,
    id: input.id,
    workflowId: input.workflowId,
    workflowVersion: input.workflowVersion,
    currentPhaseId: input.currentPhaseId,
    decisions: { ...input.decisions },
    activeGuidance: [...new Set(input.activeGuidance)],
    targetAgents: [...new Set(input.targetAgents)],
    requiredGateIds: [...new Set(input.requiredGateIds)].sort(),
    completedGateIds: [...new Set(input.completedGateIds)].sort(),
    contextHash: hashSessionContext(input.context, hasher),
    status: "active",
  };
  const guidance = [
    "# Active AdrenAI Session Guidance",
    "",
    "<!-- Temporary session guidance. User-authored agent instructions are not modified. -->",
    "",
    `Session: ${manifest.id}`,
    `Workflow: ${manifest.workflowId}@${manifest.workflowVersion}`,
    `Current phase: ${manifest.currentPhaseId}`,
    "",
    "## Active Guidance",
    "",
    ...manifest.activeGuidance.map((rule) => `- ${rule}`),
    "",
  ].join("\n");
  const agentArtifacts = manifest.targetAgents.map((agent) => ({
    path: `${root}/agents/${agent}.md`,
    purpose: `Temporary scoped session guidance for ${agent}.`,
    content: guidance,
  }));
  return {
    manifest,
    artifacts: [
      ...agentArtifacts,
      {
        path: `${root}/session.json`,
        purpose: "Local AdrenAI session alignment manifest.",
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
    ],
  };
}

function contradictoryGuidance(guidance: string[]): string[] {
  const requirements = new Set<string>();
  const prohibitions = new Set<string>();
  for (const rule of guidance) {
    const normalized = rule.toLowerCase().replace(/[.!;:]+$/g, "").trim();
    const match = normalized.match(/^(?:do not|don't|never|must not|avoid)\s+(.+)$/);
    if (match?.[1]) prohibitions.add(match[1]);
    else requirements.add(normalized);
  }
  return [...requirements].filter((rule) => prohibitions.has(rule)).sort();
}

export function diagnoseSessionAlignment(
  session: SessionManifest,
  current: SessionDriftInput,
): SessionAlignmentReport {
  const diagnostics: Diagnostic[] = [];
  const drift = (id: string, message: string, expected: string, actual: string) => {
    if (expected !== actual) diagnostics.push({
      id,
      severity: "error",
      message,
      evidence: [
        { path: expected, reason: "approved session value" },
        { path: actual, reason: "current value" },
      ],
    });
  };
  drift("session/workflow-drift", "Active workflow differs from the approved session.", session.workflowId, current.workflowId);
  drift("session/workflow-version-drift", "Workflow version differs from the approved session.", session.workflowVersion, current.workflowVersion);
  drift("session/phase-drift", "Current phase differs from the approved session.", session.currentPhaseId, current.currentPhaseId);
  drift("session/stale-context", "Repository context changed after session approval.", session.contextHash, current.contextHash);
  const skipped = session.requiredGateIds.filter((id) => !session.completedGateIds.includes(id));
  if (skipped.length && session.status === "completed") diagnostics.push({
    id: "session/skipped-required-gates",
    severity: "error",
    message: "Session was completed without all required gates.",
    evidence: skipped.map((path) => ({ path, reason: "required gate not completed" })),
  });
  for (const conflict of contradictoryGuidance(session.activeGuidance)) diagnostics.push({
    id: "session/contradictory-guidance",
    severity: "error",
    message: `Session guidance both requires and prohibits: ${conflict}.`,
    evidence: [{ path: conflict, reason: "contradictory active guidance" }],
  });
  return { aligned: diagnostics.length === 0, diagnostics };
}

export function transitionSession(
  session: SessionManifest,
  action: "pause" | "resume" | "handoff" | "complete",
): SessionManifest {
  if (action === "resume" && session.status !== "paused" && session.status !== "handed-off") {
    throw new Error(`Cannot resume session from ${session.status}.`);
  }
  if (action !== "resume" && session.status !== "active") {
    throw new Error(`Cannot ${action} session from ${session.status}.`);
  }
  if (action === "complete") {
    const missing = session.requiredGateIds.filter((id) => !session.completedGateIds.includes(id));
    if (missing.length) throw new Error(`Cannot complete session with missing gates: ${missing.join(", ")}.`);
  }
  const status = {
    pause: "paused",
    resume: "active",
    handoff: "handed-off",
    complete: "completed",
  } as const;
  return { ...session, status: status[action] };
}

export function planSessionTeardown(session: SessionManifest): SessionTeardownPlan {
  const root = sessionPath(session.id);
  return {
    sessionId: session.id,
    paths: [
      ...session.targetAgents.map((agent: AgentId) => `${root}/agents/${agent}.md`),
      `${root}/session.json`,
    ].sort(),
    requiresApproval: true,
  };
}
