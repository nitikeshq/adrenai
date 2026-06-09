# Release Checklist

## Trusted Publishing Setup

Before pushing the first version tag, configure npm trusted publishing for the
`adrenai` package with:

- Repository: `nitikeshq/adrenai`
- Workflow: `.github/workflows/release-prepare.yml`
- Environment: `npm`

No long-lived `NPM_TOKEN` is required. Tagged workflow runs request a short-lived
identity token, publish with provenance, and attach the prepared tarball to a
GitHub Release.

Run the preparation workflow manually before the first publish. Manual runs
build and upload the package artifact but never publish it.

For a release, update `package.json` and `CHANGELOG.md`, merge the reviewed
change, then push the matching version tag:

```bash
node scripts/verify-release-tag.mjs v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

The workflow stops before publishing when the tag and package version differ.
See [Homebrew publishing](homebrew-publishing.md) for tap setup, formula
generation, verification, and rollback.

Use this checklist for every public AdrenAI release.

The first stable release additionally requires every gate in the
[`1.0.0` release plan](release-1.0-plan.md).

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
