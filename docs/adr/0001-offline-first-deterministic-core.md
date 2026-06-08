# ADR-0001: Offline-First Deterministic Core

- Status: Accepted
- Date: 2026-06-08

## Context

AdrenAI must be useful without consuming AI credits, transmitting private
project content, or depending on provider availability. Optional AI assistance
can improve summaries and drafts, but its output is variable and untrusted.

## Decision

Context detection, requirement extraction, strategy resolution, workflow
planning, state transitions, generation, and validation have deterministic
offline implementations. AI providers are optional enhancement adapters and
cannot be required for correctness or approval.

## Consequences

- Every AI-assisted operation needs a deterministic fallback.
- Offline results remain reproducible and testable.
- Some offline explanations and custom drafts will be less nuanced.
- Provider use requires explicit consent, data-scope preview, and budget limits.
