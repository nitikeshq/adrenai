# Architecture

AdrenAI is a TypeScript modular monolith that inspects a repository, recommends a
small set of guidance packs, and generates native configuration for supported AI
coding agents.

The target broader-platform flow, state model, approvals, trust boundaries, and
category examples are defined in the [process blueprint](process-blueprint.md).

## Design goals

- Work without an AI provider or network access.
- Keep recommendations deterministic and explainable.
- Preserve existing repository files.
- Treat community packs as data, not executable plugins.
- Keep agent-specific formats behind adapters.
- Make all generated ownership and drift visible.

## Repository layout

```text
apps/
  cli/                 Command parsing and terminal presentation
packages/
  domain/              Shared domain types
  application/         Inspection, recommendation, resolution, and doctor use cases
  infrastructure/      Filesystem, hashing, and safe artifact application
  adapters/            Native output generators for supported agents
  schemas/             Strict pack manifest validation
catalog/
  packs/               Built-in declarative packs
docs/                  Production and contributor documentation
examples/              Fixtures and configuration examples
```

## Dependency direction

```text
CLI
 |
 v
Application use cases ---> Domain types
 |                    \
 v                     v
Infrastructure       Agent adapters
                         |
                         v
                      Schemas/catalog
```

The domain package contains no filesystem or terminal behavior. Application use
cases depend on abstractions for repository access and hashing. Infrastructure
provides the Node.js implementations.

## Main workflows

### Inspect

`inspectRepository` walks the repository while excluding common generated and
dependency directories. It detects technologies and known agent configuration
locations. Detection results include evidence paths.

### Recommend

`recommendRepository` converts detected facts into a deterministic profile and
recommended actions. Recommendations include a confidence level, reason, and
evidence.

### Resolve packs

The catalog loader validates every `pack.json`. The resolver expands transitive
dependencies and reports missing packs, dependency cycles, conflicts, duplicate
IDs, and applicability warnings.

### Generate and apply

Agent adapters translate resolved guidance into native files. The generator also
creates AdrenAI configuration and an ownership manifest. Preview is the default;
`--write` creates missing files only.

### Diagnose

`doctor` parses Markdown-like agent instructions, extracts requirements, and
reports duplicates, direct require/prohibit conflicts, broken references, and
large always-loaded context.

`drift` compares managed files with SHA-256 hashes stored in
`.adrenai/generated.json`.

## Supported agent adapters

| Agent | Generated path |
|---|---|
| Codex / generic | `AGENTS.md` |
| Claude Code | `.claude/skills/adrenai-project-guidance/SKILL.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/adrenai.mdc` |
| Kiro | `.kiro/steering/adrenai.md` |
| Gemini CLI | `GEMINI.md` |

Codex and generic currently share `AGENTS.md`; artifact paths are deduplicated.

## Extension rules

- Add repository detection in the application package with tests.
- Add native generation formats through the adapter interface.
- Add general guidance through declarative packs.
- Do not allow catalog packs to execute arbitrary code.
- Keep generated files reproducible from repository facts and catalog versions.

## Current boundaries

The current implementation creates missing managed files but does not overwrite
or merge existing files. It does not execute pack checks, install agents, call an
AI provider, or provide a lockfile-based update workflow yet.
