# Taxonomy Authoring

AdrenAI taxonomy catalogs define the identity and relationships of categories,
strategies, capabilities, constraints, deliverables, and audiences. Packs remain
the agent-guidance implementation layer and may implement strategies by listing
their IDs in `strategyIds`.

## Version 1 Model

A catalog is declarative JSON with `schemaVersion: 1` and a lowercase namespace.
Every entity uses a namespaced lowercase ID, full semantic version, title, and
description. Community-defined categories may form hierarchies through
`parentId`; adding one does not require a core code change.

Strategies declare:

- one category
- capabilities, constraints, deliverables, and audiences
- prerequisites, conflicts, and known compatible strategies
- evidence summaries, maturity, SPDX license ID, and risk

All references must resolve inside the validated catalog. Strategy identity is
independent from packs so multiple packs or tools can implement the same
strategy.

## Pack Compatibility

Existing software packs remain valid unchanged. A new pack may use a
community-defined category ID as its `type` and connect itself to strategies:

```json
{
  "id": "community/design-review-guidance",
  "version": "1.0.0",
  "type": "community/ui-design",
  "title": "Design Review Guidance",
  "description": "Agent guidance implementing a design review strategy.",
  "appliesWhen": {},
  "strategyIds": ["community/design-review"],
  "requires": [],
  "conflicts": [],
  "guidance": ["Review accessibility and interaction states before handoff."],
  "checks": []
}
```

## Schema Versioning and Migration

- `schemaVersion` changes only for incompatible catalog-structure changes.
- Entity `version` changes for behavioral or metadata changes to that entity.
- Readers must reject unknown schema versions instead of guessing.
- Additive optional fields may be introduced within schema version 1.
- A future incompatible version must ship a deterministic migration command,
  migration tests, and release notes before catalogs using it are accepted.
- Migration never silently changes IDs, licenses, risk, conflicts, or
  prerequisites.

The schema currently validates in-memory catalogs through
`validateTaxonomyCatalog`. Catalog discovery and registry distribution belong to
the authoring SDK and community-registry roadmap work.
