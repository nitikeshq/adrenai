# AdrenAI

AdrenAI inspects a software repository and creates minimal, compatible,
token-efficient configuration for AI coding agents. Core behavior is local,
deterministic, and does not require an AI provider.

## Install

```bash
npm install -g adrenai
adrenai onboard .
```

Node.js 22 or newer is required.

Running `adrenai` without a command starts a read-only onboarding summary for the
current directory. It does not modify files or use AI credits.

## Commands

```text
adrenai onboard [path] [--json]
adrenai inspect [path] [--json]
adrenai recommend [path] [--json]
adrenai apply [path] [--write] [--agents=codex,claude-code,cursor]
adrenai sync [path] [--write] [--agents=...]
adrenai doctor [path] [--json]
adrenai validate [path] [--json]
adrenai drift [path] [--json]
adrenai check [path] [--run] [--json]
adrenai packs [--json]
```

`apply` only creates missing files. `sync` safely updates files already owned by
AdrenAI, blocks user-modified or unmanaged files, and writes a deterministic
pack lockfile. `check` previews safe quality gates unless `--run` is provided.

Supported native outputs include Codex, Claude Code, GitHub Copilot, Cursor,
Kiro, Gemini, and portable `AGENTS.md`.

## Development

```bash
corepack pnpm install
corepack pnpm check
corepack pnpm test
corepack pnpm build
node scripts/smoke-test.mjs
corepack pnpm site:validate
```

See [`docs/`](docs/) for architecture, security, pack authoring, CLI usage, and
release procedures.
