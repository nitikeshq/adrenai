import { renderHomebrewFormula } from "./homebrew-formula-lib.mjs";

const sha256 = "a".repeat(64);
const formula = renderHomebrewFormula({
  version: "1.0.0",
  url: "https://github.com/nitikeshq/adrenai/releases/download/v1.0.0/adrenai-1.0.0.tgz",
  sha256,
});

for (const expected of [
  'class Adrenai < Formula',
  'version "1.0.0"',
  `sha256 "${sha256}"`,
  'depends_on "node@22"',
  'shell_output("#{bin}/adrenai --version")',
]) {
  if (!formula.includes(expected)) throw new Error(`Formula is missing: ${expected}`);
}

for (const invalid of [
  { version: "latest", url: "https://example.com/a.tgz", sha256 },
  { version: "1.0.0", url: "http://example.com/a.tgz", sha256 },
  { version: "1.0.0", url: "https://example.com/a.tgz", sha256: "bad" },
]) {
  try {
    renderHomebrewFormula(invalid);
    throw new Error("Invalid Homebrew formula input was accepted.");
  } catch (error) {
    if (error.message === "Invalid Homebrew formula input was accepted.") throw error;
  }
}

console.log("Homebrew formula generator test passed.");
