# Product Hunt Demo Video Storyboard

## Production Specification

- Target duration: 55-65 seconds
- Delivery: YouTube using a full public or unlisted URL
- Format: 16:9, 1080p, 30 fps
- Style: direct screen recording with restrained callouts
- Audio: clear narration; no narration-dependent information
- Captions: upload accurate captions and burn in only short key phrases
- Opening: demonstrate value within the first 5 seconds
- Ending: show the exact install or try command

Use a disposable repository and the released build. Do not simulate output.

## Storyboard

| Time | Visual | Narration | On-Screen Copy |
|---|---|---|---|
| 0-5s | Rapid view of conflicting agent files, then clean AdrenAI terminal | "Every coding agent needs repository context. Keeping all of them aligned is the hard part." | One repo. Many agents. |
| 5-13s | Run `adrenai inspect .`; highlight detected stack and agents | "AdrenAI starts by inspecting what your repository already uses, locally and without an AI provider." | Inspect locally |
| 13-22s | Run `adrenai recommend .`; highlight profile, reasons, and evidence | "It recommends a focused setup from repository evidence, instead of making you choose from hundreds of strategies." | Focused recommendations |
| 22-33s | Run an apply preview for three agents; show generated paths | "Preview native guidance for Codex, Claude Code, Cursor, and other supported agents." | Native agent outputs |
| 33-44s | Run `adrenai sync .`; then show a blocked modified-file case | "Safe synchronization updates unchanged AdrenAI-owned files and blocks user modifications." | Preview first. Never overwrite silently. |
| 44-54s | Run `adrenai doctor .`; highlight conflict and broken reference diagnostics | "Doctor finds conflicting instructions, broken references, drift, and wasted always-loaded context." | Keep configuration healthy |
| 54-62s | Show repository tree, open-source repository page, and install command | "AdrenAI is open source and deterministic by default. Try it on your repository." | `npm install -g adrenai` |

## Recording Shot List

1. Prepared demo repository tree
2. `adrenai inspect .`
3. `adrenai recommend .`
4. `adrenai apply . --agents=codex,claude-code,cursor`
5. `adrenai sync .`
6. Safe blocked-overwrite example
7. `adrenai doctor .`
8. Generated repository tree
9. Public repository or website
10. Install command and final logo

## Narration Script

> Every coding agent needs repository context. Keeping all of them aligned is
> the hard part. AdrenAI starts by inspecting what your repository already
> uses, locally and without an AI provider. It recommends a focused setup from
> repository evidence, instead of making you choose from hundreds of
> strategies. Preview native guidance for Codex, Claude Code, Cursor, and other
> supported agents. Safe synchronization updates unchanged AdrenAI-owned files
> and blocks user modifications. Doctor finds conflicting instructions, broken
> references, drift, and wasted always-loaded context. AdrenAI is open source
> and deterministic by default. Try it on your repository.

## Final Review

- [ ] Video stays within 65 seconds.
- [ ] Every command and result comes from the released build.
- [ ] Captions match narration.
- [ ] Text remains readable on mobile.
- [ ] No private data or secrets appear.
- [ ] Background music, if used, is licensed and does not overpower narration.
- [ ] YouTube URL is full length and not private.

