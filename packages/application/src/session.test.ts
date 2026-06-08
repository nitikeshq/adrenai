import { describe, expect, it } from "vitest";
import {
  createSession,
  diagnoseSessionAlignment,
  planSessionTeardown,
  transitionSession,
} from "./session.js";

const hasher = {
  hash: (content: string) => `hash:${content}`,
};

function session() {
  return createSession({
    id: "delivery-session",
    workflowId: "adrenai/software-development",
    workflowVersion: "1.0.0",
    currentPhaseId: "implement",
    decisions: { "user-facing": "yes" },
    activeGuidance: ["Run tests.", "Preserve user-authored files."],
    targetAgents: ["codex", "claude-code", "cursor"],
    requiredGateIds: ["configured-tests", "secret-scan"],
    completedGateIds: ["secret-scan"],
    context: { files: { "package.json": "hash-a" } },
  }, hasher);
}

describe("session alignment", () => {
  it("generates scoped multi-agent guidance without targeting user-authored files", () => {
    const generated = session();

    expect(generated.artifacts.map(({ path }) => path)).toEqual([
      ".adrenai/sessions/delivery-session/agents/codex.md",
      ".adrenai/sessions/delivery-session/agents/claude-code.md",
      ".adrenai/sessions/delivery-session/agents/cursor.md",
      ".adrenai/sessions/delivery-session/session.json",
    ]);
    expect(generated.artifacts.some(({ path }) => path === "AGENTS.md")).toBe(false);
    expect(generated.artifacts.every(({ content }) => content.includes("delivery-session"))).toBe(
      true,
    );
  });

  it("detects workflow, phase, stale-context, and contradictory-guidance drift", () => {
    const generated = session();
    generated.manifest.activeGuidance.push("Do not run tests.");
    const report = diagnoseSessionAlignment(generated.manifest, {
      workflowId: "adrenai/other",
      workflowVersion: "2.0.0",
      currentPhaseId: "validate",
      contextHash: "changed",
    });

    expect(report.aligned).toBe(false);
    expect(report.diagnostics.map(({ id }) => id)).toEqual([
      "session/workflow-drift",
      "session/workflow-version-drift",
      "session/phase-drift",
      "session/stale-context",
      "session/contradictory-guidance",
    ]);
  });

  it("supports pause, resume, handoff, completion, and reviewed teardown", () => {
    let manifest = session().manifest;
    manifest = transitionSession(manifest, "pause");
    manifest = transitionSession(manifest, "resume");
    manifest = transitionSession(manifest, "handoff");
    manifest = transitionSession(manifest, "resume");
    expect(() => transitionSession(manifest, "complete")).toThrow("missing gates");
    manifest = { ...manifest, completedGateIds: ["secret-scan", "configured-tests"] };
    manifest = transitionSession(manifest, "complete");

    expect(manifest.status).toBe("completed");
    expect(planSessionTeardown(manifest)).toMatchObject({
      sessionId: "delivery-session",
      requiresApproval: true,
    });
  });

  it("hashes nested context deterministically and detects nested changes", () => {
    const left = session();
    const reordered = session();
    const changed = createSession({
      id: "delivery-session",
      workflowId: "adrenai/software-development",
      workflowVersion: "1.0.0",
      currentPhaseId: "implement",
      decisions: { "user-facing": "yes" },
      activeGuidance: [],
      targetAgents: [],
      requiredGateIds: [],
      completedGateIds: [],
      context: { files: { "package.json": "hash-b" } },
    }, hasher);

    expect(left.manifest.contextHash).toBe(reordered.manifest.contextHash);
    expect(changed.manifest.contextHash).not.toBe(left.manifest.contextHash);
  });

  it("rejects secret-like session decisions and context", () => {
    expect(() => createSession({
      id: "unsafe-session",
      workflowId: "adrenai/software-development",
      workflowVersion: "1.0.0",
      currentPhaseId: "implement",
      decisions: { apiToken: "unsafe" },
      activeGuidance: [],
      targetAgents: [],
      requiredGateIds: [],
      completedGateIds: [],
      context: {},
    }, hasher)).toThrow("secret-like");
  });
});
