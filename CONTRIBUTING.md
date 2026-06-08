# Contributing To AdrenAI

AdrenAI accepts focused changes with tests proportional to their behavioral
risk. Discuss large features in an issue before implementation.

## Development

Requirements:

- Node.js 22 or newer
- pnpm 10

Run the local checks before opening a pull request:

```bash
pnpm install
pnpm check
pnpm test
pnpm audit --audit-level high
pnpm build
node scripts/validate-release.mjs
```

Do not commit secrets, generated build output, or unrelated formatting changes.
New packs and adapters must document their applicability, limitations, and
security implications.

By contributing, you agree that your contributions are licensed under
Apache-2.0.
