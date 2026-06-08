import { readFile } from "node:fs/promises";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const tag = process.argv.slice(2).find((argument) => argument !== "--") ?? process.env.GITHUB_REF_NAME;

if (!tag) {
  throw new Error("A release tag is required.");
}
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error(`Release tag must use v<semver>; received ${tag}.`);
}
if (tag.slice(1) !== packageMetadata.version) {
  throw new Error(
    `Release tag ${tag} does not match package version ${packageMetadata.version}.`,
  );
}

console.log(`Release tag ${tag} matches package version ${packageMetadata.version}.`);
