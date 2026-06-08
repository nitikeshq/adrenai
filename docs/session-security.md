# Session Alignment and Security

Active sessions pin the selected workflow and version, current phase, decisions,
active guidance, target agents, required/completed gates, and a deterministic
context hash.

Temporary agent guidance is generated only under
`.adrenai/sessions/<session-id>/agents/`. AdrenAI does not overwrite `AGENTS.md`,
`CLAUDE.md`, Copilot instructions, Cursor rules, Kiro steering, or other
user-authored agent files for session alignment.

Alignment diagnostics block silent workflow/version/phase changes, stale
repository context, contradictory session guidance, and completion with skipped
required gates. Pause, resume, handoff, and completion are explicit state
transitions.

Teardown produces an approval-required list containing only session-owned files.
Clients must review the list and apply repository-containment and symlink checks
before deletion. Session decisions and context hashes must not contain secrets.
