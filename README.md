# AdrenAI

[![CI](https://github.com/nitikeshq/adrenai/actions/workflows/ci.yml/badge.svg)](https://github.com/nitikeshq/adrenai/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/adrenai?label=npm)](https://www.npmjs.com/package/adrenai)
[![License](https://img.shields.io/github/license/nitikeshq/adrenai)](LICENSE)
[![Public beta](https://img.shields.io/badge/status-public%20beta-a3ff12)](launch/honest-positioning.md)

AdrenAI inspects a software repository and creates minimal, compatible,
token-efficient configuration for AI coding agents. Core behavior is local,
deterministic, and does not require an AI provider.

**[Launch site](https://nitikeshq.github.io/adrenai/)** ·
**[CLI guide](docs/cli-usage.md)** ·
**[1.0 release plan](docs/release-1.0-plan.md)** ·
**[Contributing](CONTRIBUTING.md)** ·
**[Security](SECURITY.md)**

## Why AdrenAI

- Detects repository technologies and existing agent instructions.
- Recommends a small, compatible set of versioned guidance packs.
- Generates native configuration for Codex, Claude Code, Cursor, Copilot, Kiro,
  Gemini, and portable `AGENTS.md` workflows.
- Previews changes before writing and preserves user-authored files.
- Validates configuration, detects managed-file drift, and plans allowlisted
  quality gates.
- Works locally without sending repository content to an AI provider.

## Install

The public beta can be installed from source today:

```bash
git clone https://github.com/nitikeshq/adrenai.git
cd adrenai
corepack pnpm install
corepack pnpm build
node dist/main.js onboard .
```

After the corresponding `1.0.0` distribution channels are published:

```bash
npm install --global adrenai
adrenai onboard .

npx adrenai onboard .

brew install nitikeshq/tap/adrenai
```

Node.js 22 or newer is required.

See the [installation guide](docs/installation.md) for updates, uninstalling,
channel status, and verification.

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

## Safety Model

AdrenAI treats repository content and community packs as untrusted input. It
uses path containment, symlink checks, create-only defaults, ownership
manifests, SHA-256 drift detection, and allowlisted quality-gate execution.
Review [the security model](docs/security-model.md) before enabling writes or
quality-gate execution in sensitive repositories.

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
release procedures. Product Hunt copy, demo plans, and beta-testing materials
are maintained under [`launch/`](launch/), [`demos/`](demos/), and
[`beta/`](beta/).
