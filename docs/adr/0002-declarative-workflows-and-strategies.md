# ADR-0002: Declarative Workflows and Strategies

- Status: Accepted
- Date: 2026-06-08

## Context

Community members need to add categories, strategies, policies, and workflows
without changing the trusted application core. Executable plugins would make
review, portability, and security substantially harder.

## Decision

Workflows, strategies, categories, and policies are versioned declarative data
validated by strict schemas. They cannot execute arbitrary code. Reviewed core
adapters may invoke only explicitly allowlisted gates.

## Consequences

- Community contributions are portable, inspectable, and safer to review.
- Schemas and compatibility rules become public contracts.
- New behavior outside the declarative model requires a reviewed core change.
- Imports must be quarantined, attributed, checksummed, and validated.
