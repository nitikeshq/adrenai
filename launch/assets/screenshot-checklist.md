# Screenshot Capture Checklist

## Capture Environment

- [ ] Use the release candidate or published package, not an uncommitted build.
- [ ] Use one clean demo repository with realistic TypeScript or Python files.
- [ ] Include at least two configured agents to demonstrate synchronization.
- [ ] Remove secrets, tokens, private URLs, personal names, and machine-specific
      absolute paths.
- [ ] Clear unrelated terminal history and notifications.
- [ ] Use a terminal theme with accessible contrast and a readable monospace font.
- [ ] Set the terminal width so output wraps cleanly.
- [ ] Capture at 2x resolution where possible.
- [ ] Keep command spelling and output exactly as produced by the build.
- [ ] Verify every shown claim against the released behavior.

## Required Product Captures

### 1. Repository Inspection

```bash
adrenai inspect .
```

- [ ] Technologies are detected.
- [ ] Existing agent configurations are detected.
- [ ] No private filesystem path is visible.
- [ ] The useful output fits without scrolling.

### 2. Deterministic Recommendation

```bash
adrenai recommend .
```

- [ ] Recommended profile is visible.
- [ ] At least two recommendations show clear reasons or evidence.
- [ ] Output does not imply an AI provider was used.

### 3. Multi-Agent Apply Preview

```bash
adrenai apply . --agents=codex,claude-code,cursor
```

- [ ] Preview behavior is obvious.
- [ ] Native output paths are visible.
- [ ] No files are written during the capture.

### 4. Safe Synchronization Preview

```bash
adrenai sync .
```

- [ ] Create, update, unchanged, or preserve actions are understandable.
- [ ] `adrenai.lock.json` appears when applicable.
- [ ] Preview occurs before any write.

### 5. Blocked User Modification

Prepare a disposable demo repository with an intentionally modified managed
file, then run:

```bash
adrenai sync .
```

- [ ] The overwrite is visibly blocked.
- [ ] The diagnostic explains why.
- [ ] No user content is damaged.

### 6. Doctor Diagnostics

```bash
adrenai doctor .
```

- [ ] Use a disposable demo with realistic duplicate or conflicting guidance.
- [ ] Show only diagnostics the command genuinely detects.
- [ ] Keep the example understandable without narration.

### 7. Drift Or Validation

```bash
adrenai drift .
```

or:

```bash
adrenai validate .
```

- [ ] Capture the strongest, most legible result.
- [ ] Do not show a passing result unless the check actually ran.

### 8. Generated Repository Tree

- [ ] Show representative native files, not every generated file.
- [ ] Include `adrenai.yaml`, `adrenai.lock.json`, and the ownership manifest.
- [ ] Keep the tree short enough to read in a gallery slide.

## Screenshot Processing

- [ ] Crop to the relevant product output.
- [ ] Do not alter terminal text after capture.
- [ ] Add callout boxes only in the gallery composition.
- [ ] Avoid excessive shadows, perspective distortion, and decorative chrome.
- [ ] Confirm text remains readable on a `1270 x 760 px` gallery slide.
- [ ] Export each final gallery image under `3 MB`.
- [ ] Review every export for accidental sensitive data.

## Suggested File Names

```text
01-outcome.png
02-inspect.png
03-recommend.png
04-native-agents.png
05-safe-sync.png
06-doctor.png
07-open-source.png
```

