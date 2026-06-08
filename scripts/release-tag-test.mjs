import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const { version } = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const script = resolve("scripts/verify-release-tag.mjs");

function verify(tag, expectedStatus) {
  const result = spawnSync(process.execPath, [script, tag], { encoding: "utf8" });
  if (result.status !== expectedStatus) {
    throw new Error(
      `Expected release-tag verification status ${expectedStatus} for ${tag}; ` +
        `received ${result.status}.\n${result.stdout}\n${result.stderr}`,
    );
  }
}

verify(`v${version}`, 0);
verify("not-a-version", 1);
verify("v999.0.0", 1);

console.log("Release tag guard test passed.");
