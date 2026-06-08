# ADR-0003: Approval Before External Effects

- Status: Accepted
- Date: 2026-06-08

## Context

AdrenAI can generate files, run commands, transmit data, and guide multi-phase
work. Silent effects would risk user content, secrets, credits, and trust.

## Decision

AdrenAI previews and requires explicit approval before file writes, command
execution, external transmission, strategy selection, process activation, and
required phase transitions. Approval records include the approved scope.

## Consequences

- Read-only detection and suggestions can run without approval.
- Changed scope invalidates the relevant approval.
- Clients must expose previews and cannot bypass core approval checks.
- Automation may use pre-approved policy scopes, but cannot grant itself new
  scope.
