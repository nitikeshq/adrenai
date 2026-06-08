# Security Model

## Security objective

AdrenAI must inspect and configure repositories without silently executing
untrusted content, overwriting user work, escaping the repository root, or
misrepresenting validation results.

## Trust boundaries

| Input | Trust level | Handling |
|---|---|---|
| Repository files | Untrusted | Read as data; do not execute during inspection |
| Existing agent instructions | Untrusted | Parse and diagnose; preserve by default |
| Built-in packs | Reviewed | Strict schema validation before resolution |
| Community packs | Untrusted until reviewed | Must remain declarative |
| Generated artifacts | AdrenAI-managed only after successful creation | Hash in ownership manifest |
| Shell commands named by packs | Untrusted | Only strict allowlisted plans may execute after `--run` |

## Implemented controls

### No implicit execution

Inspection, recommendation, doctor, pack loading, and drift detection do not run
repository commands or pack checks.

### Create-only writes

`apply --write` uses exclusive file creation. Existing files are skipped. A
skipped file is removed from the new ownership manifest so AdrenAI does not
claim user-authored content.

### Path containment

Before writing an artifact, AdrenAI resolves the destination and rejects
absolute paths or paths that escape the selected repository root. Existing
ancestors are resolved through the filesystem to reject symlink and junction
escapes.

### Strict pack validation

Pack manifests reject unknown fields, invalid IDs, unsupported types, invalid
agent IDs, self-dependencies, and malformed versions.

### Conflict-aware resolution

Missing dependencies, cycles, conflicts, duplicate IDs, and catalog errors are
diagnosed. Blocking catalog or resolution errors prevent generation.

### Managed-file integrity

`.adrenai/generated.json` records SHA-256 hashes of successfully created managed
artifacts. `drift` reports missing, modified, invalid, or unsafe managed paths.

### Honest diagnostics

AdrenAI distinguishes detected evidence from recommendations and does not claim
that declarative checks have run.

### Approved quality-gate execution

`check` previews commands by default. `check --run` executes only strict
allowlisted executable/argument combinations, with timeouts, and records
non-zero exits honestly. On Windows, the system command wrapper is
used only to launch package-manager `.cmd` shims; every token remains
allowlisted and shell metacharacters are rejected before execution.

### Safe synchronization

`sync` updates only files recorded in the ownership manifest whose current
hashes still match. It blocks unmanaged files, user-modified managed files,
unsafe paths, invalid manifests, and files changed after preview.

### Isolated session alignment

Active-session guidance is generated only under `.adrenai/sessions/`, rejects
secret-like state, diagnoses process drift, and produces an approval-required
teardown plan. It never overwrites user-authored agent instructions. See
[session alignment and security](session-security.md).

## Known limitations

- Markdown instruction parsing is diagnostic, not a security sandbox.
- Filesystem races cannot be eliminated completely by a portable user-space CLI;
  synchronization rechecks hashes immediately before writing.
- Remote/community pack installation is outside the MVP scope. Published npm
  releases support provenance; built-in packs are reviewed and lockfile-hashed.
- JSON diagnostic output may gain additive fields between minor releases.

## Required policy for future execution

AdrenAI execution policy:

1. Show the exact command and working directory.
2. Require explicit user approval unless covered by a reviewed policy.
3. Apply time, output, and environment limits.
4. Avoid exposing secrets to child processes.
5. Record the result without claiming success on non-zero exit.
6. Never execute commands during pack installation or catalog inspection.

## Reporting vulnerabilities

Do not publish exploit details in a public issue before maintainers have had a
reasonable opportunity to investigate. A production release must define and
publish a private reporting channel in the repository security policy.
