# Product Hunt FAQ

## What is AdrenAI?

AdrenAI is an open-source CLI that inspects software repositories and helps
create consistent, focused guidance for AI coding agents.

## Which agents does it support?

The current adapters cover Codex or generic `AGENTS.md`, Claude Code, GitHub
Copilot, Cursor, Kiro, and Gemini CLI output locations.

## Does it require an AI API key?

No. Inspection, deterministic recommendations, pack resolution, generation,
diagnostics, and drift detection are designed to work locally without an AI
provider.

## Does AdrenAI modify source code?

No. The current initialization workflow generates agent guidance and AdrenAI
metadata. It does not restructure or modify application source code.

## Can it overwrite my existing agent instructions?

The current write workflow creates missing files only and skips existing files.
Users should always review the preview before writing.

## Does it execute commands from community packs?

No. Packs are declarative guidance. Check identifiers document intended gates
but are not currently executed.

## What can `doctor` diagnose?

It can report extracted requirements, duplicate guidance, direct
require-versus-prohibit conflicts, broken relative references, missing agent
configuration, and large instruction context.

## Is AdrenAI production-ready?

Not yet. It is an early functional prototype being launched for validation.
Safe managed updates, pack locking, executable permission-gated checks, signed
packs, release packaging, and broader cross-platform integration coverage still
need work.

## Is this another skills marketplace?

No. The initial goal is to determine which small set of guidance a repository
needs and translate it into native agent formats. A community catalog may grow
later, but catalog size is not the primary product value.

## Will it support design, SEO, documents, or marketing workflows?

The architecture may support broader domains later. The launch release focuses
on AI-assisted software development.

## How can people contribute?

Useful contributions include testing real repositories, reporting detection
gaps, improving adapters, authoring focused declarative packs, adding tests, and
reviewing the security model.

## How is this different from maintaining `AGENTS.md` manually?

Manual guidance works well for a single repository and agent. AdrenAI adds local
inspection, evidence-based recommendations, multiple native adapters,
instruction diagnostics, declarative pack resolution, and managed-file drift
detection.
