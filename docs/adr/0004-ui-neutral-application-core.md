# ADR-0004: UI-Neutral Application Core

- Status: Accepted
- Date: 2026-06-08

## Context

AdrenAI needs a simple CLI now, a guided TUI, and a future GUI and integration
API. Duplicating process rules in each client would create inconsistent safety
and results.

## Decision

Process orchestration, policy, validation, approvals, and state transitions live
in UI-neutral application services. CLI, TUI, GUI, and integrations are clients
of the same contracts.

## Consequences

- All clients receive consistent behavior and trust controls.
- Application APIs must expose structured previews, decisions, and diagnostics.
- Presentation-specific state stays outside the trusted process model.
- Core services cannot depend on terminal or GUI frameworks.
