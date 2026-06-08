# Installation

AdrenAI requires Node.js 22 or newer.

## Channel Status

| Channel | Status | Command |
| --- | --- | --- |
| Source | Available | `git clone https://github.com/nitikeshq/adrenai.git` |
| npm global | Planned for `1.0.0` | `npm install --global adrenai` |
| npm one-off | Planned for `1.0.0` | `npx adrenai onboard .` |
| Homebrew tap | Planned for `1.0.0` | `brew install nitikeshq/tap/adrenai` |

Do not announce npm or Homebrew availability until clean-install verification
has passed against the published artifact.

## Install From Source

```bash
git clone https://github.com/nitikeshq/adrenai.git
cd adrenai
corepack pnpm install
corepack pnpm build
node dist/main.js onboard .
```

## npm

After the package is published:

```bash
npm install --global adrenai
adrenai --version
adrenai onboard .
```

Update or uninstall:

```bash
npm install --global adrenai@latest
npm uninstall --global adrenai
```

Run once without a global installation:

```bash
npx adrenai onboard .
```

## Homebrew

After the formula is published to the tap:

```bash
brew install nitikeshq/tap/adrenai
adrenai --version
adrenai onboard .
```

Update or uninstall:

```bash
brew upgrade nitikeshq/tap/adrenai
brew uninstall adrenai
```

## Verify Installation

```bash
adrenai --version
adrenai --help
adrenai onboard .
```

`onboard` is read-only and does not use an AI provider or modify repository
files.
