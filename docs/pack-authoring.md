# Pack Authoring

Packs are declarative, versioned units of guidance. They may describe
development, architecture, governance, operations, security, or testing
practices. Packs cannot execute code.

Packs are implementations of guidance, not strategy identities. See
[Taxonomy Authoring](taxonomy-authoring.md) for community-defined categories and
strategies.

## Directory convention

```text
catalog/packs/<type>/<name>/pack.json
```

The manifest filename must be `pack.json`.

## Manifest example

```json
{
  "id": "testing/browser-verification",
  "version": "0.1.0",
  "type": "testing",
  "title": "Browser Verification",
  "description": "Requires browser-level verification for user-facing changes.",
  "appliesWhen": {
    "technologies": ["playwright"],
    "agents": ["codex", "claude-code"]
  },
  "requires": ["governance/portable-agent-baseline"],
  "conflicts": [],
  "guidance": [
    "Run relevant browser tests after changing user-facing behavior."
  ],
  "checks": [
    "configured-browser-tests"
  ]
}
```

## Schema

| Field | Requirements |
|---|---|
| `id` | Lowercase `category/name` format |
| `version` | Full semantic version such as `1.2.3` |
| `type` | Lowercase category ID; existing built-ins include `architecture`, `development`, `governance`, `operations`, `security`, and `testing` |
| `title` | Non-empty human-readable title |
| `description` | Non-empty explanation of purpose |
| `appliesWhen.technologies` | Optional array of detected technology IDs |
| `appliesWhen.agents` | Optional array of supported agent IDs |
| `strategyIds` | Optional strategy identities implemented by this pack |
| `requires` | Pack IDs that must be resolved first |
| `conflicts` | Pack IDs that cannot be selected together |
| `guidance` | Focused instructions generated for agents |
| `checks` | Declarative check identifiers |

Unknown fields are rejected. Arrays are deduplicated during validation.

## Authoring rules

- Keep each pack focused on one coherent concern.
- Write guidance as direct, testable instructions.
- Avoid duplicating universal guidance from required packs.
- Declare dependencies and conflicts explicitly.
- Use applicability only when the pack genuinely depends on a technology or
  agent.
- Never include secrets, executable code, shell interpolation, or instructions
  to download and execute remote content.
- Use neutral, original wording. Do not copy proprietary skills or imply an
  endorsement by a person, product, or company.
- Increment the semantic version for behavioral changes.

## Checks

`checks` are identifiers only in the current implementation. They document the
intended deterministic gate but are not executed yet. A pack must not claim that
a listed check passed.

## Validation

Run:

```bash
corepack pnpm dev packs
corepack pnpm test
corepack pnpm check
```

The catalog command must report no error diagnostics. Add tests for schema
changes, dependency behavior, conflicts, and recommendation applicability.

## Review checklist

- Is the pack useful without an AI provider?
- Is the guidance smaller than the context it replaces?
- Is every instruction relevant to the declared purpose?
- Are conflicts and required packs complete?
- Are names, claims, and sources legally safe?
- Can important requirements eventually become deterministic checks?
