# Application API and GUI Architecture

`AdrenaiApplicationApi` is the UI-neutral boundary for inspect, suggest, select,
plan, execute, resume, and validate operations. CLI, TUI, future GUI, and
integrations must call the same application services rather than reimplementing
policy, workflow, approval, filesystem, or command-execution rules.

Every operation returns structured diagnostics and events. Events describe
start, progress, approval requirements, completion, cancellation, or failure.
Execution requires an approval grant matching the current effect plan. Grants
carry a deterministic SHA-256 fingerprint bound to the request root, input,
operation, summary, effect paths, and commands. Any change requires new approval.
Cancellation is checked before trusted services are invoked.

Filesystem writes, path containment, symlink checks, secret handling, and
allowlisted command execution remain behind injected trusted services. The API
does not expose direct filesystem or shell capabilities.

## Client Parity

| Capability | CLI | TUI | Future GUI/API |
|---|---|---|---|
| Inspect/suggest/select | Same application service | Same application service | Same application service |
| Plan and preview | Structured result | Structured result | Structured result |
| Approve effects | Explicit CLI flag/action | Explicit confirmation | Explicit approval request |
| Execute/resume/validate | Trusted injected service | Trusted injected service | Trusted injected service |

## GUI Deployment

The initial GUI proof is read-only and local-only. It renders an escaped API
snapshot and has no write, execute, approval, or remote controls.

A future local GUI should bind only to loopback, use an unguessable per-process
session token, apply origin checks, and expose the application API rather than
filesystem paths or shell commands.

## Optional Remote API Threat Model

A remote API is not currently implemented. Before one is enabled it requires
strong authentication, authorization per repository and operation, TLS,
request-size/rate limits, audit logs, replay protection, content redaction,
approval delegation rules, and isolation between users. Remote clients must
never bypass trusted core validation or grant themselves effect approval.
