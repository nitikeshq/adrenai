# Terminal Recording Storyboard

Target length: 75-90 seconds.

Use a wide terminal, hide unrelated shell prompts, and start from the AdrenAI
repository root.

## Scene 1: A Real Repository, No Agent Setup

Narration:

> This checkout app already uses Next.js, TypeScript, Vitest, Playwright, and
> GitHub Actions. But every AI coding agent starts without project context.

Commands:

```powershell
./demos/launch/scripts/run-demo.ps1 -PrepareOnly
Get-ChildItem demos/launch/.work/checkout-before -Force
node dist/main.js inspect demos/launch/.work/checkout-before
node dist/main.js doctor demos/launch/.work/checkout-before
```

Pause on:

```text
No supported agent configuration detected.
No supported Markdown agent instructions were detected.
```

## Scene 2: Repository-Aware Recommendation

Narration:

> AdrenAI recommends from repository evidence, without uploading code or
> requiring an AI provider.

Commands:

```powershell
node dist/main.js recommend demos/launch/.work/checkout-before
node dist/main.js check demos/launch/.work/checkout-before
```

Pause on the detected profile, portable setup recommendation, and quality-gate
plan.

## Scene 3: Preview Before Writing

Narration:

> It previews a shared source of truth plus native files for each selected
> agent. Nothing is written until approved.

Command:

```powershell
node dist/main.js apply demos/launch/.work/checkout-before --agents=codex,claude-code,github-copilot,cursor,kiro
```

Scroll through the generated paths, then pause on:

```text
No files written. Run with `--write` to create missing files.
```

## Scene 4: Apply And Prove The Result

Narration:

> One approved command configures every agent. AdrenAI then validates ownership,
> drift, and instruction health.

Commands:

```powershell
node dist/main.js apply demos/launch/.work/checkout-before --write --agents=codex,claude-code,github-copilot,cursor,kiro
node dist/main.js doctor demos/launch/.work/checkout-before
node dist/main.js drift demos/launch/.work/checkout-before
node dist/main.js validate demos/launch/.work/checkout-before
```

Final frame:

```powershell
Get-ChildItem demos/launch/.work/checkout-before -Recurse -Force |
  Where-Object { $_.FullName -match 'AGENTS|adrenai|claude|cursor|copilot|kiro' } |
  Select-Object -ExpandProperty FullName
```

Closing narration:

> AdrenAI gives every coding agent the right repository guidance and quality
> gates, while developers keep using the tools they already prefer.
