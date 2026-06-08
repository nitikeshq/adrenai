# Public Beta Metrics Plan

## Validation Questions

The public beta should answer:

1. Can users complete the core workflow without maintainer assistance?
2. Are detections and recommendations accurate enough to trust?
3. Do users retain the generated configuration?
4. Does AdrenAI reduce setup time and repeated prompting?
5. Does the workflow preserve user control and avoid unsafe behavior?

## Primary Metrics

| Metric | Definition | Beta Target |
|---|---|---:|
| Core workflow completion | Participants who inspect, review, and preview successfully | 80% |
| Unassisted completion | Participants completing without moderator intervention | 70% |
| Configuration retention | Participants keeping generated configuration, with or without edits | 60% |
| Repeat usage intent | Participants likely to use AdrenAI on another repository | 60% |
| Median initial workflow time | Time from start to informed apply decision | Under 5 minutes |
| Critical safety incidents | Destructive changes, secret exposure, or false passed-check claims | 0 |

## Secondary Metrics

- Technology and agent detection precision reported by participants
- Recommendation acceptance, modification, and rejection rates
- Number of confusing recommendations per session
- Number of repeated prompts needed before and after configuration
- Percentage of generated guidance removed by users
- Quality-gate approval and completion rates
- Frequency of preview abandonment
- Number and severity of reported diagnostics issues

## Qualitative Signals

Track recurring themes:

- Missing agent or instruction formats
- Explanations users cannot understand
- Recommendations users consider generic
- Reasons users distrust generated files
- Reasons users modify or remove guidance
- Workflows that feel slow or overly complex

## Cohorts

Analyze results separately for:

- Repositories with no existing agent configuration
- Repositories with established agent configuration
- TypeScript or JavaScript repositories
- Python repositories
- Single-agent and multi-agent users
- New and experienced AI-assisted developers

Do not create cohorts based on sensitive personal characteristics.

## Data Sources

- Structured feedback survey
- Moderated usability observations
- Sanitized issue reports
- Optional aggregate telemetry described in
  `telemetry-proposal.md`

Survey and moderated-test results are authoritative. Telemetry alone cannot
explain why a user abandoned or rejected a recommendation.

## Review Cadence

- Review critical safety reports immediately.
- Review usability findings weekly during beta.
- Review aggregate metrics after every 20 completed test sessions.
- Publish a beta summary before general availability.

## Release Decision

Do not advance to general availability when:

- Any unresolved critical safety issue exists.
- Core workflow completion is below target.
- Configuration retention is below target without a understood cause.
- Users cannot reliably distinguish user-authored and managed content.
- Recommendations frequently require maintainer explanation.

