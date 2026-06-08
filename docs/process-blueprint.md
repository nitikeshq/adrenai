# AdrenAI Process Blueprint

This document defines the target end-to-end AdrenAI operating model. The current
software-development public beta implements only repository inspection,
deterministic recommendation, pack resolution, generation, validation, quality
gates, and managed-file drift.

## Process Principles

- Detect and suggest before asking questions.
- Ask only decisions that can materially change the plan.
- Separate observed facts, user decisions, and inferred suggestions.
- Preview every process, strategy, output, gate, and file change before approval.
- Keep deterministic offline behavior available for every core stage.
- Require explicit consent before sending content to an AI provider.
- Preserve user-authored work and make managed ownership visible.
- Treat community strategies, repository content, and AI output as untrusted.

## End-to-End Flow

| Stage | Inputs | Outputs | User approval | Implementation |
| --- | --- | --- | --- | --- |
| 1. Detect context | Repository, workspace, or project files | Evidence-backed technologies, agents, existing process, constraints | No | Partial today; expand in [#35](https://github.com/nitikeshq/adrenai/issues/35) |
| 2. Synthesize brief | Detected evidence and existing requirements | Facts, conflicts, unresolved decisions, suggested goals | Approve/correct inferred brief | [#35](https://github.com/nitikeshq/adrenai/issues/35) |
| 3. Suggest strategies | Brief, category taxonomy, policies, catalog | Ranked compatible strategies and confidence | No | [#24](https://github.com/nitikeshq/adrenai/issues/24), [#36](https://github.com/nitikeshq/adrenai/issues/36) |
| 4. Ask minimal questions | Remaining high-impact uncertainty | Explicit decisions with reasons and budget usage | Answer, skip, or accept default | [#26](https://github.com/nitikeshq/adrenai/issues/26) |
| 5. Resolve selection | Suggestions, decisions, dependencies, conflicts | Coherent strategy set and rejected alternatives | Approve selection | [#24](https://github.com/nitikeshq/adrenai/issues/24), [#26](https://github.com/nitikeshq/adrenai/issues/26) |
| 6. Plan process | Selected strategies, workflow definitions, policies | Ordered phases, deliverables, approvals, gates, estimated effort | Approve process plan | [#25](https://github.com/nitikeshq/adrenai/issues/25) |
| 7. Generate guidance | Approved plan and target agents/tools | Native agent files, project brief, policies, session manifest | Preview and approve writes | Partial today; extend through [#27](https://github.com/nitikeshq/adrenai/issues/27) |
| 8. Execute phases | Approved workflow and active session | Deliverables, decisions, evidence, gate results | Phase approvals where declared | [#25](https://github.com/nitikeshq/adrenai/issues/25), [#27](https://github.com/nitikeshq/adrenai/issues/27) |
| 9. Maintain alignment | Session state, active guidance, changed files | Drift diagnostics, stale-context warnings, recovery plan | Approve corrections | [#27](https://github.com/nitikeshq/adrenai/issues/27) |
| 10. Complete or hand off | Validated deliverables and decision history | Completion report, unresolved risks, reusable configuration | Confirm completion/handoff | [#25](https://github.com/nitikeshq/adrenai/issues/25), [#27](https://github.com/nitikeshq/adrenai/issues/27) |

## State Model

```text
discovered
  -> brief-proposed
  -> brief-approved
  -> selection-proposed
  -> selection-approved
  -> process-proposed
  -> process-approved
  -> active
  -> awaiting-approval
  -> active
  -> validating
  -> completed | handed-off | blocked | cancelled
```

State transitions are explicit and persisted locally. A process may pause,
resume, or return to an earlier proposal state, but it may not silently skip a
required approval or gate.

## Offline Mode

Offline mode is the default and must remain sufficient for:

- Context detection from local files
- Requirement extraction using deterministic parsers
- Strategy applicability, dependency, conflict, and policy resolution
- Minimal-question ranking from declared decision impact
- Workflow planning and state transitions
- Native guidance generation, validation, gates, and drift detection

No provider SDK, account, API key, or network request is required.

## AI-Assisted Mode

AI assistance is optional and governed by
[#28](https://github.com/nitikeshq/adrenai/issues/28). It may improve brief
summarization, gap analysis, comparison explanations, and custom drafts.

Before transmission, AdrenAI must show:

- Provider and destination
- Exact data scope
- Redactions
- Estimated token or credit cost
- Deterministic fallback

AI output is a suggestion. It cannot approve a process, bypass policy, execute
untrusted content, or replace deterministic validation.

## Trust Boundaries

| Boundary | Rule |
| --- | --- |
| Repository/project content | Untrusted input; parse without executing |
| Community strategies and imports | Quarantine, validate, attribute, checksum, and review |
| AI provider | Explicit opt-in transmission only; output remains untrusted |
| Generated files | Preview first; track ownership; preserve user-authored files |
| Gates and commands | Execute only allowlisted deterministic definitions |
| Credentials and secrets | Never persist in process/session manifests |
| GUI/TUI/API clients | Cannot bypass trusted core validation or filesystem controls |

## Failure Handling

- Detection failure: report unreadable or unsupported evidence and continue with
  lower confidence where safe.
- Conflicting requirements: block approval until resolved or explicitly waived
  by an authorized policy scope.
- Missing strategy dependency: block selection and explain the dependency.
- Workflow failure: preserve state, evidence, and recovery options.
- Gate failure: block phase completion when the gate is required.
- User-authored file conflict: preserve the file and require a reviewed merge.
- AI/provider failure: fall back offline without losing approved state.
- Cancellation: stop new actions, preserve an audit summary, and remove temporary
  session guidance only after confirmation.

## Category Examples

### Software and Mobile

Detect stack and existing agent files, synthesize architecture/testing/security
constraints, select engineering and mobile strategies, plan implementation and
release phases, generate native agent guidance, run quality gates, and maintain
session alignment. Catalog work: [#31](https://github.com/nitikeshq/adrenai/issues/31).

### UI Design and Animation

Capture brand and audience constraints, suggest compatible visual directions,
typography, component frameworks, accessibility, and motion strategies, compare
hybrids, then plan concept, system, prototype, review, and delivery phases.
Catalog work: [#32](https://github.com/nitikeshq/adrenai/issues/32).

### SEO, Content, Writing, and Email

Detect available source material, clarify audience and claims, select research,
structure, voice, SEO, compliance, and measurement strategies, then plan
research, draft, review, approval, publishing, and measurement phases.
Catalog work: [#33](https://github.com/nitikeshq/adrenai/issues/33).

### Posters, Documents, Spreadsheets, and Presentations

Capture deliverable format, audience, branding, accessibility, data, and export
constraints, select relevant strategies, then plan content, structure, design,
validation, review, and export phases. Catalog work:
[#34](https://github.com/nitikeshq/adrenai/issues/34).

## Extension and Experience Layers

- Safe community registry and imports: [#29](https://github.com/nitikeshq/adrenai/issues/29)
- TUI selection and process experience: [#30](https://github.com/nitikeshq/adrenai/issues/30)
- Authoring SDKs and contribution gates: [#37](https://github.com/nitikeshq/adrenai/issues/37)
- Application API and future GUI: [#38](https://github.com/nitikeshq/adrenai/issues/38)

## Architecture Decisions

- [ADR-0001: Offline-first deterministic core](adr/0001-offline-first-deterministic-core.md)
- [ADR-0002: Declarative workflows and strategies](adr/0002-declarative-workflows-and-strategies.md)
- [ADR-0003: Approval before external effects](adr/0003-approval-before-external-effects.md)
- [ADR-0004: UI-neutral application core](adr/0004-ui-neutral-application-core.md)
- [ADR-0005: Evidence-backed persisted process state](adr/0005-evidence-backed-process-state.md)
