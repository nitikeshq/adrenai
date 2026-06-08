# Release Checklist

Use this checklist for every public AdrenAI release.

## Scope and behavior

- [ ] Release scope and user-visible behavior are documented.
- [ ] New commands and flags match `--help`.
- [ ] Existing files remain create-only unless an explicit migration was reviewed.
- [ ] JSON output changes are identified.
- [ ] Supported agents and generated paths are verified.

## Quality

- [ ] `corepack pnpm check` passes.
- [ ] `corepack pnpm test` passes.
- [ ] `corepack pnpm release:check` passes.
- [ ] New behavior includes focused automated tests.
- [ ] Windows, macOS, and Linux CI pass on supported Node.js versions.
- [ ] Fixture repositories cover no-agent and existing-agent cases.
- [ ] Repeated generation is deterministic.
- [ ] Preview and `--write` behavior are manually smoke-tested.

## Security

- [ ] `corepack pnpm dev packs` reports no catalog errors.
- [ ] Dependency audit and secret scan pass.
- [ ] Path containment and existing-file preservation tests pass.
- [ ] New pack sources, wording, licenses, and claims are reviewed.
- [ ] No pack or inspection path executes untrusted content.
- [ ] Ownership manifest and drift behavior are verified.
- [ ] Known security limitations are documented.

## Packaging

- [ ] Version and changelog are updated.
- [ ] Package contents contain only required runtime files.
- [ ] The CLI starts from a clean installation.
- [ ] `--help`, `inspect`, `recommend`, `doctor`, `packs`, `drift`, `validate`,
      `sync`, and `check` run.
- [ ] npm provenance and release signatures are enabled where available.
- [ ] Installation and uninstall instructions are verified.

## Documentation

- [ ] Architecture documentation matches current package boundaries.
- [ ] CLI examples use supported syntax.
- [ ] Pack schema documentation matches validation code.
- [ ] Security model and limitations are current.
- [ ] Examples contain no secrets or proprietary content.

## Release decision

- [ ] Blocking defects are resolved or the release is stopped.
- [ ] Remaining risks are recorded with owners.
- [ ] Release artifacts are reproducible.
- [ ] Post-release verification and rollback owners are assigned.

## Post-release

- [ ] Install the published package in a clean environment.
- [ ] Run a smoke test against each fixture repository.
- [ ] Verify package metadata and documentation links.
- [ ] Monitor issue reports and security channels.
