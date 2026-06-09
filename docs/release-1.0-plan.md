# AdrenAI 1.0.0 Release Plan

This plan defines the evidence required to promote AdrenAI from public beta to
the first stable release. It is a go/no-go contract, not a target-date promise.

## Stable Release Promise

AdrenAI `1.0.0` will provide a stable, local-first CLI for inspecting software
repositories, recommending compatible guidance packs, generating native
AI-agent instructions, validating managed configuration, detecting drift, and
running allowlisted quality gates.

For the `1.x` line:

- Existing commands, flags, JSON fields, configuration schema, lockfile format,
  and managed-file ownership behavior follow semantic versioning.
- Existing user-authored files remain protected by default.
- Core inspection and recommendation continue to work without an AI provider.
- Supported Node.js versions and native agent outputs are documented for every
  release.

Breaking changes require `2.0.0`. Additive commands, adapters, packs, and
diagnostics may ship in minor releases.

## 1.0 Scope

- Stable CLI behavior for `onboard`, `inspect`, `recommend`, `apply`, `sync`,
  `doctor`, `validate`, `drift`, `check`, and `packs`.
- Native outputs for Codex, Claude Code, Cursor, GitHub Copilot, Kiro, Gemini,
  and portable `AGENTS.md`.
- Versioned built-in packs, lockfiles, safe synchronization, and quality gates.
- npm trusted-publishing release with provenance.
- GitHub Release with the exact npm tarball.
- Homebrew tap formula generated from the released tarball.
- Installation, upgrade, uninstall, security, and rollback documentation.

## Non-Goals

- A hosted marketplace or cloud service.
- Automatic merging of arbitrary user-authored instructions.
- Guaranteed agent compliance, security certification, or autonomous delivery.
- Stable APIs for every internal workspace package.
- A hosted editor for design, SEO, office-document, or marketing workflows.

## Required Evidence

The release is blocked until all items are true:

- No open release-blocking issues or pull requests.
- Linux, macOS, and Windows CI pass on `main`.
- The full local and GitHub release-preparation gates pass.
- Clean installation from the prepared npm tarball succeeds.
- Demo fixture smoke tests and managed-file drift detection pass.
- No known high-severity dependency vulnerabilities or detected secrets.
- At least three external repositories complete onboarding, preview, write,
  validation, and drift testing with results recorded in an issue.
- No unresolved data-loss, path-containment, symlink, or overwrite defects.
- npm trusted publishing and the Homebrew tap are configured and tested using a
  release candidate.
- Documentation and landing-page commands match available channels.

## Release Candidate Stages

### `1.0.0-rc.1`: Distribution Validation

- Freeze command names, flags, schemas, lockfile format, and generated paths.
- Publish npm release candidate with provenance.
- Generate and publish a Homebrew release-candidate formula.
- Verify clean install, upgrade, uninstall, and one-off `npx` usage.

### `1.0.0-rc.2`: External Repository Validation

- Resolve defects found by external-repository testing.
- Confirm macOS Homebrew and npm installation on all supported CI platforms.
- Re-run security, release, demo, performance, and documentation gates.

### `1.0.0`: Stable Promotion

- Confirm no release-blocking issues remain.
- Update version and changelog in a reviewed PR.
- Run release preparation manually and inspect the tarball.
- Push the matching `v1.0.0` tag.
- Verify npm, GitHub Release, Homebrew, landing page, and install commands.

## Distribution Sequence

1. Merge the reviewed version/changelog PR.
2. Run the preparation-only Release workflow and inspect its artifact.
3. Push the matching signed or protected `v1.0.0` tag.
4. Verify npm trusted publishing and provenance.
5. Verify the GitHub Release and attached tarball checksum.
6. Generate the Homebrew formula from that exact tarball and publish it to
   `nitikeshq/homebrew-tap`.
7. Verify npm, `npx`, Homebrew, update, uninstall, and source installation.
8. Change installation documentation from planned to available.
9. Announce the release only after all public installation commands pass.

## Rollback

- Stop announcements and mark affected channels in documentation.
- Deprecate a broken npm version; do not unpublish unless npm policy permits and
  security impact requires it.
- Remove or revert the affected Homebrew formula version.
- Publish a reviewed patch release rather than moving an existing tag.
- Record the incident, affected versions, and recovery instructions in GitHub.

## Ownership

Before stable release, assign named owners in the release issue for:

- Release decision and tag creation
- npm trusted publishing
- Homebrew tap publication
- Security review
- Documentation and landing-page status
- Post-release monitoring and rollback

The release issue must link evidence for every required gate.
