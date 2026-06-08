import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const ignored = new Set([".git", "artifacts", "dist", "node_modules"]);
const patterns = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{36}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const findings = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    let content;
    try {
      content = await readFile(absolute, "utf8");
    } catch {
      continue;
    }
    if (patterns.some((pattern) => pattern.test(content))) {
      findings.push(relative(root, absolute));
    }
  }
}

await walk(root);
if (findings.length > 0) {
  console.error(`Potential secrets detected:\n- ${findings.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("No high-confidence secrets detected.");
}
