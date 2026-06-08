# ADR-0005: Evidence-Backed Persisted Process State

- Status: Accepted
- Date: 2026-06-08

## Context

Long-running sessions need to remain aligned after project changes, tool
restarts, and handoffs. Users also need to understand why AdrenAI made each
recommendation or blocked a transition.

## Decision

Process state is explicit, locally persisted, and auditable. Recommendations,
decisions, approvals, transitions, and gate results record their source as
detected evidence, user input, policy, workflow rule, or optional AI suggestion.

## Consequences

- Sessions can resume and produce reliable handoff reports.
- State schema migrations and sensitive-data minimization are required.
- Stale evidence invalidates affected suggestions or approvals.
- Secrets and credentials are never stored in process state.
