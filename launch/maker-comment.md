# Maker Comment

Hi Product Hunt,

We built AdrenAI because configuring AI coding agents has become a project of
its own.

Repositories often accumulate `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot
instructions, skills, and other agent-specific files. These files can duplicate
or contradict one another, reference commands that no longer exist, and consume
more context than necessary.

AdrenAI takes a local-first approach:

1. Inspect the repository and existing agent configuration.
2. Detect technologies, guidance, conflicts, and missing safeguards.
3. Recommend a minimal, compatible setup.
4. Preview native files for the agents the user selects.
5. Create only missing files and track managed-file drift.

The core workflow does not require an AI provider or send repository content to
an external service.

This is an open-source public beta, not a finished universal skills
platform. It currently focuses on software repositories and deterministic
guidance. We are especially interested in feedback from developers using more
than one coding agent:

- Which agent configuration problems repeat across your repositories?
- Which instructions should remain shared, scoped, or temporary?
- What would make you trust generated guidance enough to keep it?
- Which deterministic checks should AdrenAI support first?

Thank you for testing it and for being direct about where it falls short.
