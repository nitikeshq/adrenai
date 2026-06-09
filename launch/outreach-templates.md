# Outreach Templates

Use outreach to invite relevant testing and feedback. Do not ask for upvotes,
mass-message unrelated communities, or imply personal endorsement.

## Existing tester

Subject: AdrenAI is launching today

Hi [Name],

AdrenAI is live on Product Hunt today. It is an open-source CLI that inspects a
repository's AI-agent instructions, recommends a minimal setup, and previews
native guidance for agents such as Codex, Claude Code, Cursor, Copilot, and
Kiro.

You previously helped us understand [specific problem]. The most useful help
today would be testing the current release on a disposable or public repository
and telling us:

- What did it detect incorrectly?
- Which recommendation was not useful?
- Would you keep the generated guidance?

Product Hunt: [link]
Repository: [link]

No need to vote. Concrete feedback is more useful.

## Open-source maintainer

Subject: Request for feedback on repository AI-agent guidance

Hi [Name],

I maintain AdrenAI, an early open-source CLI for inspecting and configuring
repository guidance across AI coding agents.

Your project uses [relevant agent/configuration], so I would value your view on
one question: what should a tool like this understand before recommending or
generating repository instructions?

The current release is local-first, preview-first, and does not overwrite
existing files. It is launching on Product Hunt today:

Product Hunt: [link]
Repository: [link]

Please ignore this if it is not relevant to your work.

## Developer community post

We launched AdrenAI, an early open-source CLI for repository-aware AI coding
agent guidance.

It locally inspects existing instruction files, detects duplicates and direct
conflicts, recommends focused declarative packs, and previews native output for
several agents. It does not require an AI API key or modify source code.

We are looking for critical feedback from developers who maintain `AGENTS.md`,
`CLAUDE.md`, Cursor rules, Copilot instructions, Kiro steering, or similar
configuration.

Product Hunt: [link]
Repository: [link]

Known limitation: it does not automatically merge arbitrary user-authored
instructions or guarantee that an agent follows generated guidance.

## Social post

We launched AdrenAI today.

It is an open-source, local-first CLI that inspects a repository's AI-agent
guidance, recommends a minimal compatible setup, and previews native files for
multiple coding agents.

No AI API key required. No source-code changes. Existing files are preserved.

We are looking for real repository feedback, especially detection mistakes and
guidance you would actually keep.

[Product Hunt link]
[Repository link]

## Launch follow-up

Subject: What we learned from the AdrenAI launch

Thank you to everyone who tested AdrenAI.

The most repeated feedback was:

- [finding]
- [finding]
- [finding]

We are prioritizing [next milestone] because [evidence]. We are not prioritizing
[deferred idea] yet because [reason].

Current limitations and progress: [link]
Repository: [link]

Please continue reporting concrete examples where repository guidance conflicts,
drifts, or becomes too large.
