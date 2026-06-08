# CLI Usage

## Prerequisites

- Node.js 22 or later
- pnpm 10 through Corepack for repository development

From this repository:

```bash
corepack pnpm install
corepack pnpm dev --help
```

The examples below use `corepack pnpm dev`. Installed releases expose the same
commands through `adrenai`. Running without a command performs the read-only
`onboard` flow for the current directory.

### Start with guided onboarding

```bash
corepack pnpm dev onboard .
corepack pnpm dev onboard . --json
```

Summarizes detected technologies and agent configurations, recommends a profile
and guidance packs, and prints exact preview, apply, validation, and quality-gate
commands. It does not write files or use an AI provider.

## Commands

### Inspect a repository

```bash
corepack pnpm dev inspect .
corepack pnpm dev inspect . --json
```

Reports detected languages, frameworks, test tools, CI, package managers, and
agent configuration files. Inspection is local and read-only.

### Recommend a setup

```bash
corepack pnpm dev recommend .
corepack pnpm dev recommend . --json
```

Builds a deterministic recommendation from detected repository facts. It does
not write files.

### Preview generated configuration

```bash
corepack pnpm dev apply .
corepack pnpm dev apply . --agents=codex,claude-code,cursor
corepack pnpm dev apply . --json
```

Preview is the default. When `--agents` is omitted, AdrenAI targets detected
agents or a portable default when no agent configuration is found.

Supported target IDs:

```text
codex, claude-code, github-copilot, cursor, kiro, gemini, generic
```

### Create missing generated files

```bash
corepack pnpm dev apply . --write
corepack pnpm dev apply . --write --agents=codex,github-copilot
```

`--write` creates missing files only. Existing files are skipped and are not
recorded as AdrenAI-owned.

Always preview before writing in repositories with existing agent instructions.

### Diagnose instructions

```bash
corepack pnpm dev doctor .
corepack pnpm dev doctor . --json
```

Reports extracted requirements, estimated instruction tokens, duplicates,
direct conflicts, broken relative references, and missing configuration.

### Inspect the built-in catalog

```bash
corepack pnpm dev packs
corepack pnpm dev packs --json
```

Loads and validates all built-in packs. Catalog errors block generation.

### Browse strategies and workflows

```bash
corepack pnpm dev strategies --category=design/visual-system
corepack pnpm dev workflows
corepack pnpm dev workflow-plan --workflow=design/interface-delivery --category=design/visual-system
```

These commands load and validate packaged taxonomy, workflow, and policy
catalogs offline. Workflow previews include mandatory gates from applicable
policy layers.

### Manage aligned sessions

```bash
corepack pnpm dev session-start . --workflow=design/interface-delivery --session=design-review
corepack pnpm dev session-start . --workflow=design/interface-delivery --session=design-review --write
corepack pnpm dev session-status . --session=design-review
corepack pnpm dev session-action . --session=design-review --action=pause --write
corepack pnpm dev session-action . --session=design-review --action=resume --write
corepack pnpm dev session-action . --session=design-review --action=complete --gates=accessibility-review,configured-browser-tests --write
```

Session creation and actions preview by default. `--write` persists the
approved state under `.adrenai/sessions/`. Completion remains blocked until all
required workflow and policy gates are recorded.
`session-status` recomputes the repository context hash and reports drift.

### Detect managed-file drift

```bash
corepack pnpm dev drift .
corepack pnpm dev drift . --json
```

Compares files recorded in `.adrenai/generated.json` with their expected
SHA-256 content hashes.

### Synchronize managed files

```bash
corepack pnpm dev sync .
corepack pnpm dev sync . --write
```

Preview is the default. Synchronization updates only unchanged AdrenAI-owned
files, preserves stale files, blocks user modifications, and creates
`adrenai.lock.json`.

### Validate configuration

```bash
corepack pnpm dev validate .
```

Validates `adrenai.yaml` against the versioned configuration schema.

### Plan or run quality gates

```bash
corepack pnpm dev check .
corepack pnpm dev check . --run
```

Only strict allowlisted commands inferred from configured repository scripts
can run.

## Safe operating procedure

1. Run `inspect`.
2. Run `doctor` for repositories with existing agent instructions.
3. Run `recommend`.
4. Preview with `apply`.
5. Review every proposed artifact.
6. Run `sync --write`.
7. Run `validate`, `drift`, and `check --run`.

## Exit behavior

Unknown commands, unsupported agent targets, catalog resolution errors, and
unexpected runtime failures set a non-zero process exit code. JSON output is
recommended for automation. Configuration and generation-manifest schemas are
versioned.
