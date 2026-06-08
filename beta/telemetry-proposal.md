# Privacy-Conscious Opt-In Telemetry Proposal

Status: documentation proposal only. No telemetry should be implemented or
enabled from this document.

## Principles

1. Telemetry is disabled by default.
2. Collection requires explicit, informed opt-in.
3. AdrenAI remains fully functional without telemetry.
4. Users can inspect exactly what would be sent.
5. Users can withdraw consent and delete associated data.
6. Collect events and counts, never repository content.
7. Do not use telemetry for advertising or user profiling.
8. Retain raw data only as long as necessary for beta validation.

## Proposed Consent Flow

After a completed local workflow, show a separate prompt:

```text
Help improve the public beta by sharing anonymous usage events?

AdrenAI will not send file paths, repository names, source code, instruction
content, command output, prompts, secrets, or personal information.

[No, keep telemetry off] [Review data] [Opt in]
```

The default selection must be telemetry off. Consent must never be bundled with
installation, terms acceptance, or another action.

## Proposed Events

Allowed event fields:

- Random installation identifier generated only after opt-in
- AdrenAI version
- Operating-system family
- Event name
- Timestamp rounded to the day
- Count of detected technologies, agents, and instruction files
- Recommendation count and accept, modify, or reject counts
- Workflow step completion and coarse duration bucket
- Diagnostic identifiers and severities
- Quality-gate status: planned, approved, passed, failed, or not run
- Generated artifact count

## Prohibited Data

Never collect:

- Repository names, remotes, paths, or directory names
- Source code or file contents
- Agent instruction or skill contents
- Prompts, generated responses, or command output
- Environment variables
- Secrets, credentials, tokens, or configuration values
- Git authors, commit messages, branches, or hashes
- IP addresses beyond unavoidable transient transport processing
- Precise timestamps or high-resolution duration data
- User names, email addresses, or device identifiers

## Local Transparency

Before opt-in, users must be able to view a representative payload.

After opt-in, provide:

```text
adrenai telemetry status
adrenai telemetry preview
adrenai telemetry disable
adrenai telemetry delete
```

`preview` should show the exact queued payload without transmitting it.

## Data Minimization And Retention

- Aggregate events as early as practical.
- Round timestamps to the day.
- Use coarse duration buckets instead of exact timings.
- Store raw beta events for no more than 90 days.
- Delete or irreversibly aggregate data after the retention period.
- Publish the retention policy and telemetry schema.

## Security And Governance

- Document the collection endpoint and processor.
- Encrypt data in transit and at rest.
- Restrict access to maintainers responsible for beta analysis.
- Log access to raw telemetry.
- Review every schema change for privacy impact.
- Require renewed consent before collecting materially different data.
- Provide a public process for security and privacy reports.

## Success Criteria

Telemetry is acceptable only if:

- The full product works with telemetry disabled.
- A user can understand the proposed payload before opting in.
- Automated tests verify prohibited fields cannot be emitted.
- Maintainers can answer why every collected field is necessary.
- Deletion and withdrawal workflows are verified before collection begins.

