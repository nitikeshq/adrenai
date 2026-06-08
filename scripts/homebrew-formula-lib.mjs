const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function renderHomebrewFormula({ version, url, sha256 }) {
  if (!SEMVER.test(version)) throw new Error(`Invalid release version: ${version}`);
  if (!URL.canParse(url) || !url.startsWith("https://")) {
    throw new Error("Homebrew formula URL must be an HTTPS URL.");
  }
  if (!SHA256.test(sha256)) throw new Error("Homebrew formula SHA-256 must be lowercase hexadecimal.");

  return `class Adrenai < Formula
  desc "Repository-aware configuration for AI coding agents"
  homepage "https://nitikeshq.github.io/adrenai/"
  url "${url}"
  version "${version}"
  sha256 "${sha256}"
  license "Apache-2.0"

  depends_on "node@22"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/adrenai --version")
  end
end
`;
}
