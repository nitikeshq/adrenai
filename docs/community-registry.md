# Community Registry and Safe Imports

Community registry entries carry version, provenance, publisher, license,
AdrenAI compatibility, trust, moderation, checksum, optional signature, locked
dependencies, and a validated contribution bundle.

External sources such as skills.sh are imported only as quarantined text data.
They are never executed or installed directly. Normalization removes prohibited
executable guidance and creates an experimental, high-risk, review-only
strategy with source attribution. A maintainer must review licensing,
originality, evidence, conflicts, and guidance before approval.

Installation requires:

1. Matching checksum and, when supplied, valid publisher signature.
2. Approved moderation status and no active takedown.
3. A valid contribution bundle and fully locked external dependencies.
4. A reviewable update preview when version, checksum, dependencies, or
   moderation changes.

Local registries and offline bundles use the same metadata and validation
process. `examples/local-registry.json` and `examples/community-bundle.json`
provide local fixtures.

## Moderation and Takedown

Contributions begin as `pending`. Reviewers may mark them `approved`,
`rejected`, or `takedown`. Takedown entries cannot be newly installed or
updated. Existing lockfiles preserve auditability, but users must receive a
warning and review replacement or removal.

## Supply-Chain Policy

- Never execute content during discovery, import, normalization, or validation.
- Pin versions, checksums, and dependency checksums in lockfiles.
- Treat signatures as additional provenance, not a substitute for review.
- Require approval before applying any update preview.
- Preserve source attribution and license metadata through normalization.
