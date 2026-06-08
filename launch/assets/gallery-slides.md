# Product Hunt Gallery Slides

## Shared Visual System

- Canvas: `1270 x 760 px`
- Safe area: keep essential text and UI at least `64 px` from every edge
- Layout: approximately 40% message and 60% product visual
- Headline: 54-64 px, maximum 8 words, maximum 2 lines
- Supporting copy: 24-30 px, maximum 2 short lines
- Use one real screenshot or terminal capture per slide
- Use a consistent dark or light presentation background across the set
- Put the AdrenAI wordmark in the same corner on every slide
- Avoid tiny terminal text; crop tightly around the relevant output
- Export as optimized PNG or WebP under `3 MB`

Use command output captured from the released build. Do not mock diagnostics,
detected agents, test results, or supported behavior.

## Slide 1: Outcome

**Purpose:** Communicate the entire product in one glance.

**Headline:** One repo. Every coding agent. Aligned.

**Supporting copy:** AdrenAI inspects your project and recommends focused,
compatible guidance for the agents you already use.

**Visual:** A repository icon in the center connected to Codex, Claude Code,
Copilot, Cursor, Kiro, Gemini, and `AGENTS.md` labels. Keep logos secondary to
the AdrenAI message and follow each provider's trademark rules.

**Layout:** Headline and copy left; connection diagram right.

## Slide 2: Inspect

**Purpose:** Show that setup begins from repository evidence, not a questionnaire.

**Headline:** Start with what your repo already knows

**Supporting copy:** Detect languages, frameworks, tests, CI, package managers,
and existing agent instructions locally.

**Visual:** Real terminal screenshot of:

```bash
adrenai inspect .
```

Highlight detected technologies and agent configurations.

**Layout:** Headline across top; large terminal crop below.

## Slide 3: Recommend

**Purpose:** Explain the recommendation layer.

**Headline:** Get a focused setup, not 100 choices

**Supporting copy:** AdrenAI recommends a minimal profile with reasons and
evidence. Core recommendations require no AI provider.

**Visual:** Real `adrenai recommend .` output showing the selected profile,
recommendations, confidence, and evidence.

**Layout:** Message left; recommendation output right with 2-3 callouts.

## Slide 4: Native Agent Outputs

**Purpose:** Show multi-agent value.

**Headline:** Configure each agent in its native format

**Supporting copy:** Generate focused guidance for Codex, Claude Code, Copilot,
Cursor, Kiro, Gemini, or portable `AGENTS.md`.

**Visual:** Repository tree with the actual generated files visible. Use
highlight boxes around representative files, but do not show a wall of paths.

**Layout:** Headline top left; repository tree on right; supported-target labels
along the bottom.

## Slide 5: Safety

**Purpose:** Address the main trust concern.

**Headline:** Your instructions stay yours

**Supporting copy:** Preview first. Update only unchanged AdrenAI-owned files.
Block unmanaged files and user modifications.

**Visual:** Split terminal capture:

- Left: safe synchronization preview
- Right: blocked overwrite diagnostic

**Layout:** Headline and copy top; equal-width terminal panels below.

## Slide 6: Diagnose And Validate

**Purpose:** Show recurring value beyond initialization.

**Headline:** Keep agent configuration healthy

**Supporting copy:** Find conflicting instructions, broken references, drift,
and excessive always-loaded context.

**Visual:** Real `adrenai doctor .` or `adrenai drift .` output with 3 concise
diagnostic callouts.

**Layout:** Product output left; diagnostic callouts right.

## Optional Slide 7: Open Source

Use only when the public repository and contribution documentation are ready.

**Headline:** Open source and deterministic by default

**Supporting copy:** Review the rules, extend declarative packs, and reproduce
the same configuration across repositories.

**Visual:** Public repository page, pack manifest excerpt, and license badge.

## Upload Order

1. Outcome
2. Inspect
3. Recommend
4. Native agent outputs
5. Safety
6. Diagnose and validate
7. Open source, when ready

