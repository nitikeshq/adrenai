# Terminal User Interface

Run `adrenai tui [path]` to browse the detected context, recommendations,
comparisons, questions, workflow preview, gates, and planned files. The TUI is
read-only; effects still require the existing approved `sync`, `apply`, or
application API execution boundaries.

Keyboard controls:

- `j` / `k` or arrow keys: move
- `space`: select or deselect
- `tab` / `shift-tab`: change screen
- `/`: enter search text
- `f`: cycle category filters
- `enter`: open review
- `q` or `Ctrl-C`: cancel

The interaction model is presentation-only. Detection, ranking, conflicts,
dependencies, workflow plans, and generated file previews come from shared
application services. `adrenai tui [path] --json` returns the same prepared
snapshot for non-interactive clients and automation. When stdin/stdout are not
TTYs, the terminal runner prints a snapshot instead of waiting for input.

Text labels, explicit focus markers, keyboard-only controls, and no color-only
meaning provide the accessibility baseline.
