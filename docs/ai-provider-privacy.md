# Optional AI Providers and Privacy

AdrenAI's core workflows remain deterministic and offline. The default
installation does not include or require a provider SDK.

Provider availability is detected only through environment-variable names.
Installed agent configuration files are reported separately and never treated
as proof that a provider is available. Detection never reads or displays
credential values and does not imply permission to transmit content.

Use `adrenai ai-status .` to inspect the separation. Use
`adrenai ai-preview . --capability=summarize --content="..."` to preview
redaction and estimated token/credit cost. Preview transmits nothing and does
not grant consent.

Before an optional provider request, AdrenAI must:

1. Verify the provider advertises the requested capability.
2. Redact secret-like values and private-key material.
3. Show the exact redacted content, provider, capability, token/credit estimate,
   redactions, and deterministic fallback.
4. Receive explicit consent bound to the hash of that redacted content.
5. Enforce token and credit budgets.

Changed content invalidates consent. Provider failures, missing consent, and
exceeded budgets use the deterministic fallback without consuming budget.
Audit entries record provider, capability, estimates, transmitted-content hash,
outcome, and failure reason, but never transmitted content or credentials.
