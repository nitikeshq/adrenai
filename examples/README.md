# Examples

These examples are intentionally small and contain no generated dependencies.

## Fixtures

- `fixtures/typescript-codex`: TypeScript repository with an existing Codex
  `AGENTS.md`.
- `fixtures/python-no-agent`: Python repository without agent configuration.

Run inspection and recommendation from the repository root:

```bash
corepack pnpm dev inspect examples/fixtures/typescript-codex
corepack pnpm dev doctor examples/fixtures/typescript-codex
corepack pnpm dev recommend examples/fixtures/python-no-agent
corepack pnpm dev apply examples/fixtures/python-no-agent --agents=codex,claude-code
```

Do not use `--write` on committed fixtures unless the resulting files are the
intended example change.

## Configurations

- `configs/example-pack.json`: Valid declarative pack manifest.
- `configs/generated-manifest.json`: Example managed-file ownership manifest.
