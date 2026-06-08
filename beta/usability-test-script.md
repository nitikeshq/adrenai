# Moderated Usability Test Script

## Session Goal

Evaluate whether a developer can inspect a repository, understand AdrenAI's
recommendations, preview changes, and decide whether to apply them without
maintainer assistance.

Target session length: 30 to 45 minutes.

## Moderator Rules

- Ask participants to think aloud.
- Do not teach AdrenAI concepts before the participant encounters them.
- Do not guide the participant unless they are blocked for more than two
  minutes.
- Record observations and timings, not repository contents.
- Stop immediately if sensitive information appears.
- Obtain explicit consent before recording audio, video, or screens.

## Introduction

Say:

> We are testing AdrenAI, not you. Please describe what you expect, notice, and
> find confusing. Avoid showing secrets, personal data, or proprietary content.
> You may stop at any time.

Ask:

1. How do you currently configure AI coding agents?
2. What repeated problems do you experience?
3. What would make you trust a tool that generates agent instructions?

## Tasks

### Task 1: Understand The Product

Prompt:

> Without running anything, explain what you expect AdrenAI to do.

Observe:

- Accuracy of expectations
- Unclear terminology
- Safety concerns

### Task 2: Inspect A Repository

Prompt:

> Inspect this repository and determine whether the results look correct.

Measure:

- Time to start inspection
- Detection errors noticed
- Confidence in evidence shown

### Task 3: Evaluate Recommendations

Prompt:

> Decide which recommendations you would accept or reject.

Measure:

- Time to understand recommendations
- Whether explanations support decisions
- Whether users can identify assumptions

### Task 4: Preview Configuration

Prompt:

> Preview what AdrenAI proposes to change. Do not apply anything you do not
> understand.

Measure:

- Ability to locate affected files
- Ability to distinguish new, managed, and user-authored content
- Trust in overwrite protections

### Task 5: Review Quality Gates

Prompt:

> Review proposed checks and explain which ones you would approve.

Measure:

- Understanding that checks require approval
- Recognition of missing or unsafe commands
- Clarity of pass, fail, and not-run states

### Task 6: Complete A Realistic Agent Task

Prompt:

> Use your normal coding agent for a small, representative task and assess
> whether the generated guidance helps.

Measure:

- Repeated prompts required
- Relevant guidance used
- Incorrect or distracting guidance

## Closing Questions

1. What did you expect that AdrenAI did not do?
2. What felt unsafe or surprising?
3. Which generated file or recommendation would you remove?
4. Would you retain the configuration? Why?
5. Would you use AdrenAI on another repository?

## Moderator Observation Template

| Measure | Result |
|---|---|
| Inspection completed | Yes / No |
| Recommendations understood | Yes / Partial / No |
| Preview understood | Yes / Partial / No |
| Unsafe behavior observed | Yes / No |
| Workflow completed without help | Yes / No |
| Configuration retained | Yes / Modified / No |
| Total task time | |
| Critical usability issues | |

