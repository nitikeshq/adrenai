import type { Diagnostic } from "./index.js";

export type WorkflowPhaseStatus =
  | "pending"
  | "ready"
  | "active"
  | "awaiting-approval"
  | "paused"
  | "completed"
  | "failed"
  | "skipped";

export interface WorkflowCondition {
  decisionId: string;
  equals: string;
}

export interface WorkflowPhase {
  id: string;
  title: string;
  dependsOn: string[];
  inputs: string[];
  outputs: string[];
  gateIds: string[];
  approvalRequired: boolean;
  optional: boolean;
  retryLimit: number;
  when?: WorkflowCondition;
}

export interface WorkflowManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  title: string;
  phases: WorkflowPhase[];
}

export interface WorkflowPhaseState {
  phaseId: string;
  status: WorkflowPhaseStatus;
  attempts: number;
  approved: boolean;
}

export interface WorkflowState {
  schemaVersion: 1;
  workflowId: string;
  workflowVersion: string;
  status: "planned" | "active" | "paused" | "completed" | "failed";
  decisions: Record<string, string>;
  phases: WorkflowPhaseState[];
}

export interface WorkflowPlan {
  orderedPhaseIds: string[];
  skippedPhaseIds: string[];
  requiredApprovalPhaseIds: string[];
  gateIds: string[];
  diagnostics: Diagnostic[];
}

export function planWorkflow(
  workflow: WorkflowManifest,
  decisions: Record<string, string> = {},
): WorkflowPlan {
  const byId = new Map(workflow.phases.map((phase) => [phase.id, phase]));
  const diagnostics: Diagnostic[] = [];
  const orderedPhaseIds: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      diagnostics.push({
        id: "workflow/dependency-cycle",
        severity: "error",
        message: `Workflow dependency cycle includes ${id}.`,
        evidence: [{ path: id, reason: "cycle member" }],
      });
      return;
    }
    const phase = byId.get(id);
    if (!phase) return;
    visiting.add(id);
    for (const dependency of phase.dependsOn) {
      if (!byId.has(dependency)) {
        diagnostics.push({
          id: "workflow/missing-dependency",
          severity: "error",
          message: `Phase ${id} depends on missing phase ${dependency}.`,
          evidence: [{ path: dependency, reason: "missing phase" }],
        });
      } else {
        visit(dependency);
      }
    }
    visiting.delete(id);
    visited.add(id);
    orderedPhaseIds.push(id);
  };
  for (const phase of workflow.phases) visit(phase.id);
  const skippedPhaseIds = workflow.phases
    .filter(({ when }) => when && decisions[when.decisionId] !== when.equals)
    .map(({ id }) => id);
  const active = workflow.phases.filter(({ id }) => !skippedPhaseIds.includes(id));
  return {
    orderedPhaseIds: orderedPhaseIds.filter((id) => !skippedPhaseIds.includes(id)),
    skippedPhaseIds,
    requiredApprovalPhaseIds: active.filter(({ approvalRequired }) => approvalRequired).map(({ id }) => id),
    gateIds: [...new Set(active.flatMap(({ gateIds }) => gateIds))].sort(),
    diagnostics,
  };
}

export function createWorkflowState(
  workflow: WorkflowManifest,
  decisions: Record<string, string> = {},
): WorkflowState {
  const plan = planWorkflow(workflow, decisions);
  return {
    schemaVersion: 1,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: "planned",
    decisions: { ...decisions },
    phases: workflow.phases.map(({ id }) => ({
      phaseId: id,
      status: plan.skippedPhaseIds.includes(id) ? "skipped" : "pending",
      attempts: 0,
      approved: false,
    })),
  };
}

export function nextReadyPhases(
  workflow: WorkflowManifest,
  state: WorkflowState,
): string[] {
  const status = new Map(state.phases.map((phase) => [phase.phaseId, phase.status]));
  return workflow.phases
    .filter(
      ({ id, dependsOn }) =>
        status.get(id) === "pending" &&
        dependsOn.every((dependency) =>
          ["completed", "skipped"].includes(status.get(dependency) ?? ""),
        ),
    )
    .map(({ id }) => id);
}

export type WorkflowPhaseAction =
  | "start"
  | "request-approval"
  | "approve"
  | "complete"
  | "fail"
  | "retry"
  | "pause"
  | "resume";

export function transitionWorkflowPhase(
  workflow: WorkflowManifest,
  state: WorkflowState,
  phaseId: string,
  action: WorkflowPhaseAction,
): WorkflowState {
  const phase = workflow.phases.find(({ id }) => id === phaseId);
  const current = state.phases.find(({ phaseId: id }) => id === phaseId);
  if (!phase || !current) throw new Error(`Unknown workflow phase ${phaseId}.`);
  const allowed: Record<WorkflowPhaseAction, WorkflowPhaseStatus[]> = {
    start: ["pending", "ready"],
    "request-approval": ["active"],
    approve: ["awaiting-approval"],
    complete: ["active"],
    fail: ["active"],
    retry: ["failed"],
    pause: ["active", "awaiting-approval"],
    resume: ["paused"],
  };
  if (!allowed[action].includes(current.status)) {
    throw new Error(`Action ${action} is invalid from ${current.status}.`);
  }
  if (action === "start" && !nextReadyPhases(workflow, state).includes(phaseId)) {
    throw new Error(`Phase ${phaseId} dependencies are incomplete.`);
  }
  if (action === "retry" && current.attempts > phase.retryLimit) {
    throw new Error(`Phase ${phaseId} retry limit exceeded.`);
  }
  if (action === "complete" && phase.approvalRequired && !current.approved) {
    throw new Error(`Phase ${phaseId} requires approval before completion.`);
  }
  const statusByAction: Record<WorkflowPhaseAction, WorkflowPhaseStatus> = {
    start: "active",
    "request-approval": "awaiting-approval",
    approve: "active",
    complete: "completed",
    fail: "failed",
    retry: "pending",
    pause: "paused",
    resume: "active",
  };
  const phases = state.phases.map((item) =>
    item.phaseId === phaseId
      ? {
          ...item,
          status: statusByAction[action],
          attempts: action === "start" ? item.attempts + 1 : item.attempts,
          approved: action === "approve" ? true : item.approved,
        }
      : item,
  );
  const completed = phases.every(({ status }) => ["completed", "skipped"].includes(status));
  return {
    ...state,
    status: completed ? "completed" : action === "pause" ? "paused" : "active",
    phases,
  };
}
