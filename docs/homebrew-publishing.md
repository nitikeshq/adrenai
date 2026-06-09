# Homebrew Publishing

Homebrew is available from the public `nitikeshq/tap` repository. The formula
installs the exact tarball attached to the corresponding GitHub Release.

## Tap Setup

1. Create the public repository `nitikeshq/homebrew-tap`.
2. Add a `Formula/` directory.
3. Require reviewed pull requests and formula tests before merge.
4. If cross-repository automation is added, use a repository-scoped token with
   access only to the tap. Do not use the default workflow token because it
   cannot write to another repository.

## Generate a Formula

Release preparation creates `artifacts/homebrew/adrenai.rb` from the exact npm
tarball and SHA-256 checksum:

```bash
node scripts/prepare-release.mjs
```

For manual generation:

```bash
node scripts/generate-homebrew-formula.mjs \
  --version=1.0.0 \
  --url=https://github.com/nitikeshq/adrenai/releases/download/v1.0.0/adrenai-1.0.0.tgz \
  --sha256=<lowercase-sha256> \
  --output=adrenai.rb
```

## Publish

1. Complete npm and GitHub Release publication.
2. Verify the release asset URL and checksum.
3. Open a reviewed PR adding the generated formula to
   `nitikeshq/homebrew-tap/Formula/adrenai.rb`.
4. Run:

```bash
brew audit --strict --online nitikeshq/tap/adrenai
brew install nitikeshq/tap/adrenai
adrenai --version
adrenai onboard .
brew uninstall adrenai
```

5. Record the successful distribution smoke workflow in the release issue.

## Rollback

Revert the tap formula to the last verified release, stop announcements, and
publish a reviewed patch release. Never move an existing release tag or silently
replace its attached tarball.
