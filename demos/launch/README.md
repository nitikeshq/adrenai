# AdrenAI Launch Demo

This demo shows AdrenAI turning an existing, unconfigured repository into a
portable AI-agent setup without changing application source code.

## Story

The fixture is a small TypeScript/Next.js checkout application. It already has:

- TypeScript and Next.js
- Vitest and Playwright
- GitHub Actions
- security-sensitive checkout code
- no AI-agent instructions or skills

AdrenAI inspects those facts, recommends a profile, previews focused guidance,
and creates native configuration for Codex, Claude Code, Copilot, Cursor, and
Kiro.

## Run The Demo

From the AdrenAI repository root on PowerShell:

```powershell
./demos/launch/scripts/run-demo.ps1
```

The script creates `demos/launch/.work/checkout-before`, runs the current CLI,
and leaves the generated after-state available for inspection.

For a launch recording, follow [STORYBOARD.md](./STORYBOARD.md) or run:

```powershell
./demos/launch/scripts/recording-commands.ps1
```

## Fixture Layout

```text
fixtures/
  before/   Existing repository before AdrenAI
  after/    Representative expected repository after AdrenAI
scripts/
  run-demo.ps1
  recording-commands.ps1
```

The `after` fixture documents the audience-facing result. Managed hashes and
exact generated wording can change between releases, so the live demo script
always uses the current CLI as the source of truth.
