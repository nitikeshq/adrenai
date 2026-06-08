import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderHomebrewFormula } from "./homebrew-formula-lib.mjs";

const packageMetadata = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const tarballName = `adrenai-${packageMetadata.version}.tgz`;
const tarball = await readFile(resolve("artifacts/npm", tarballName));
const sha256 = createHash("sha256").update(tarball).digest("hex");
const url =
  `https://github.com/nitikeshq/adrenai/releases/download/` +
  `v${packageMetadata.version}/${tarballName}`;

await mkdir(resolve("artifacts/homebrew"), { recursive: true });
await writeFile(
  resolve("artifacts/homebrew/adrenai.rb"),
  renderHomebrewFormula({ version: packageMetadata.version, url, sha256 }),
  "utf8",
);
console.log(`Prepared Homebrew formula for ${tarballName}.`);
