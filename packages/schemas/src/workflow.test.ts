import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createWorkflowState, nextReadyPhases, planWorkflow, transitionWorkflowPhase } from "@adrenai/domain";
import { validateWorkflowManifest } from "./index.js";

const reference = JSON.parse(
  readFileSync(new URL("../../../catalog/workflows/software-development.json", import.meta.url), "utf8"),
);

describe("workflow manifests and planning", () => {
  it("validates and dry-runs the reference workflow with deterministic branching", () => {
    const result = validateWorkflowManifest(reference);
    expect(result.valid).toBe(true);
    const plan = planWorkflow(result.workflow!, { "user-facing": "no" });
    expect(plan.skippedPhaseIds).toEqual(["browser-review"]);
    expect(plan.orderedPhaseIds).toEqual(["brief", "implement", "validate"]);
    expect(plan.requiredApprovalPhaseIds).toEqual(["brief", "validate"]);
  });

  it("detects dependency conflicts and creates resumable state", () => {
    const result = validateWorkflowManifest(reference);
    const workflow = {
      ...result.workflow!,
      phases: result.workflow!.phases.map((phase) =>
        phase.id === "brief" ? { ...phase, dependsOn: ["validate"] } : phase,
      ),
    };
    expect(planWorkflow(workflow).diagnostics.some(({ id }) => id === "workflow/dependency-cycle")).toBe(true);
    const state = createWorkflowState(result.workflow!, { "user-facing": "yes" });
    expect(nextReadyPhases(result.workflow!, state)).toEqual(["brief"]);
    state.status = "paused";
    expect(state.phases.every(({ attempts }) => attempts === 0)).toBe(true);
  });

  it("supports deterministic approvals, pause/resume, failures, and bounded retries", () => {
    const workflow = validateWorkflowManifest(reference).workflow!;
    let state = createWorkflowState(workflow, { "user-facing": "no" });
    state = transitionWorkflowPhase(workflow, state, "brief", "start");
    state = transitionWorkflowPhase(workflow, state, "brief", "request-approval");
    state = transitionWorkflowPhase(workflow, state, "brief", "approve");
    state = transitionWorkflowPhase(workflow, state, "brief", "pause");
    state = transitionWorkflowPhase(workflow, state, "brief", "resume");
    state = transitionWorkflowPhase(workflow, state, "brief", "complete");
    state = transitionWorkflowPhase(workflow, state, "implement", "start");
    state = transitionWorkflowPhase(workflow, state, "implement", "fail");
    state = transitionWorkflowPhase(workflow, state, "implement", "retry");
    expect(nextReadyPhases(workflow, state)).toEqual(["implement"]);
    expect(state.phases.find(({ phaseId }) => phaseId === "implement")?.attempts).toBe(1);
  });

  it("rejects duplicate phases and unsafe retry limits", () => {
    const result = validateWorkflowManifest({
      ...reference,
      phases: [reference.phases[0], { ...reference.phases[0], retryLimit: 99 }],
    });
    expect(result.valid).toBe(false);
  });
});
