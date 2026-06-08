# Authoring SDK

`@adrenai/sdk` is the typed extension boundary for local and community bundles.
A bundle can contain taxonomy entities, workflows, policies, packs, and
declarative adapter descriptors without requiring a core-code change. Adapter
descriptors declare safe output metadata only; executable adapters remain
reviewed core code.

The stable API exports:

- `scaffoldContributionBundle(namespace)`
- `validateContributionBundle(value)`
- `migrateContributionBundle(value)`
- domain types for all extensibility artifacts

`stable` contains supported extension APIs. `experimental` is explicitly
separate and currently empty. Experimental APIs may change without migration;
stable APIs follow semantic versioning and require deterministic migrations for
incompatible schema changes.

Contribution validation gates cover strict schemas, compatibility, dependency
and policy conflicts, originality confirmation, SPDX licensing, evidence
review, declared test coverage, unsafe adapter paths, executable download
patterns, and private-key material. Bundles remain declarative and cannot
execute code during validation.

See `examples/community-bundle.json` for an end-to-end local third-party bundle.
