# Installation

AdrenAI requires Node.js 22 or newer.

## Channel Status

| Channel | Status | Command |
| --- | --- | --- |
| Source | Available | `git clone https://github.com/nitikeshq/adrenai.git` |
| npm global | Available | `npm install --global adrenai` |
| npm one-off | Available | `npx adrenai onboard .` |
| Homebrew tap | Available | `brew install nitikeshq/tap/adrenai` |

Public distribution smoke tests verify npm, `npx`, and Homebrew installation
against the published artifacts.

## Install From Source

```bash
git clone https://github.com/nitikeshq/adrenai.git
cd adrenai
corepack pnpm install
corepack pnpm build
node dist/main.js onboard .
```

## npm

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
