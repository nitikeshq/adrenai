# Offline Selection and Optional AI

AdrenAI's offline core selects and generates guidance; it does not pretend to be
an AI model or a document renderer.

`adrenai init` also compiles an offline orchestration plan. Repository evidence,
reviewed built-in guidance, deterministic skill-source ranking, and local
resource measurements become compact instructions for the selected coding
agent. The coding agent performs development; AdrenAI defines the approved plan,
boundaries, quality gates, and parallelism budget.

## What Offline Onboarding Does

Offline onboarding reads local repository evidence such as technologies,
configured test tools, existing agent files, and CI configuration. Deterministic
rules then:

1. Recommend compatible guidance packs.
2. Explain the evidence behind each recommendation.
3. Resolve pack dependencies and conflicts.
4. Preview native guidance for selected coding agents.
5. Create approved files, a lockfile, and an ownership manifest.
6. Validate configuration, detect drift, and plan allowlisted quality gates.

No repository content is sent over the network and no AI credits are used.

The current integrated recommendation flow is strongest for software repository
guidance. The larger design, SEO, mobile, writing, document, spreadsheet,
presentation, and marketing strategy catalogs can be browsed and planned, but
their strategy selections are not yet fully connected to generated native agent
guidance or deliverable rendering.

## What Optional AI Adds

An approved provider adapter may improve summaries, gap analysis, comparisons,
and custom strategy drafts. Before transmission, AdrenAI must show the provider,
redacted content, estimated cost, and deterministic fallback. AI output remains
a suggestion and cannot bypass validation or approval.

AdrenAI does not currently execute provider requests from the CLI.

## Agent Skills and Portability

A skill can be shared across agents only when its instructions, tools,
dependencies, and license are portable. AdrenAI can translate portable guidance
into supported native formats, but it must not copy private, proprietary, or
agent-specific skills without permission.

For example, a Claude workflow that creates high-quality DOCX, PPTX, or XLSX
files may depend on Claude-specific tools. Codex can use the same process only
when equivalent renderer tools are available and the skill is portable.

## Deliverable Generation

Creating polished DOCX, PPTX, XLSX, PDF, poster, or image outputs requires a
renderer adapter or an explicitly approved AI/tool integration. AdrenAI
currently provides deterministic plans, policies, and strategy catalogs for
these deliverables, but does not render the final files.
