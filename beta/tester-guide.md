# AdrenAI Public Beta Tester Guide

## Purpose

The public beta validates whether AdrenAI helps developers configure AI coding
agents faster, with clearer instructions and fewer repeated prompts.

The beta is not intended to prove that every recommendation is correct. It is
intended to identify where inspection, recommendations, generated files, and
explanations are useful or confusing.

## Who Should Test

AdrenAI is currently most useful for developers who:

- Use Codex, Claude Code, Cursor, GitHub Copilot, Kiro, or similar coding agents.
- Maintain a TypeScript, JavaScript, or Python repository.
- Already have agent instructions or want help creating them.
- Can review generated configuration before applying it.

Do not test against repositories containing data that you are not permitted to
inspect with development tools.

## Before Testing

1. Use a repository with version control and a clean or understood working tree.
2. Do not provide secrets, credentials, customer data, or proprietary source
   code in feedback.
3. Record your current agent configuration files and approximately how long you
   normally spend configuring agents.
4. Confirm that generated changes can be reviewed before they are accepted.

## Suggested Test Flow

1. Run repository inspection.
2. Review detected technologies, agents, and instruction files.
3. Review recommendations and their evidence.
4. Preview generated changes.
5. Apply only changes you understand and want.
6. Run available diagnostics and quality gates.
7. Use your normal coding agent for one realistic task.
8. Complete the feedback survey.

## What To Observe

- Were the correct repository technologies and agents detected?
- Were important instruction files missed?
- Were recommendations relevant and understandable?
- Did AdrenAI preserve existing user-authored guidance?
- Was the preview sufficient to make an informed decision?
- Did generated guidance reduce repeated prompting?
- Were warnings actionable?
- Did any operation feel unsafe or surprising?

## Reporting Problems

Include:

- AdrenAI version
- Operating system
- Repository language and framework
- Agent being configured
- Command or workflow step
- Expected and actual behavior
- Sanitized error output

Exclude:

- Source code not needed to reproduce the issue
- Secrets, tokens, credentials, or environment values
- Personal or customer information
- Private repository names or URLs

## Stop Conditions

Stop testing and report the issue if AdrenAI:

- Attempts to overwrite user-authored files without clear approval.
- Proposes a destructive command without a clear warning.
- Includes secrets or sensitive content in generated output.
- Claims a check passed when it did not run.
- Produces changes that cannot be previewed or understood.

