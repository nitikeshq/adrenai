# Policy Authoring

Policies define rules that apply across AdrenAI categories and processes.
Unlike pack guidance, enforceable policy can block completion and require
deterministic gates.

## Scopes and Precedence

Policy layers apply from lowest to highest precedence:

```text
universal -> category -> organization -> project -> workflow -> phase -> session
```

Non-universal layers declare a configurable `target`. Organization layers are
where teams define branding, legal, privacy, and regulatory requirements
without changing AdrenAI's built-in catalog.

Each rule has a stable dotted `key`. A higher-precedence rule replaces the
selected lower rule only when the lower rule declares `overrideAllowed: true`.
Two rules for the same key at the same scope produce a conflict diagnostic.
Attempts to override a non-overridable rule produce a blocking diagnostic.

## Enforcement

- `advisory` rules guide work but cannot declare mandatory gates.
- `enforceable` rules are deterministic requirements and may list mandatory
  gate IDs.
- A gate ID is declarative. Execution still requires a trusted allowlisted gate
  implementation and user approval.

The built-in baseline at `catalog/policies/baseline.json` includes universal
secret/evidence rules and category baselines for software, design, content/SEO,
marketing, and office documents.

## Versioning

Policy catalogs use `schemaVersion: 1`. Layers use semantic versions. Readers
reject unknown schema versions. Changes that weaken enforcement, allow an
override, or remove a mandatory gate require a major layer-version increment
and explicit review.
