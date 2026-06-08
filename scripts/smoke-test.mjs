import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = await mkdtemp(join(tmpdir(), "adrenai-smoke-"));
const cli = resolve("dist/main.js");

function run(args, cwd = resolve(".")) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  await writeFile(
    join(root, "package.json"),
    JSON.stringify(
      {
        scripts: { check: "node -e \"process.exit(0)\"", test: "node -e \"process.exit(0)\"" },
        devDependencies: { typescript: "1.0.0", vitest: "1.0.0" },
      },
      null,
      2,
    ),
  );

  const inspection = JSON.parse(run(["inspect", root, "--json"]));
  if (!inspection.technologies.some(({ id }) => id === "typescript")) {
    throw new Error("Smoke inspection did not detect TypeScript.");
  }
  if (!run(["--version"]).trim().match(/^\d+\.\d+\.\d+$/)) {
    throw new Error("Smoke version output is invalid.");
  }
  if (!run([], root).includes("Recommended profile:")) {
    throw new Error("Smoke default command did not recommend a profile.");
  }

  run(["sync", root, "--write", "--agents=codex,claude-code"]);
  const config = await readFile(join(root, "adrenai.yaml"), "utf8");
  if (!config.includes("claude-code")) {
    throw new Error("Smoke synchronization did not generate requested agent configuration.");
  }

  const validation = JSON.parse(run(["validate", root, "--json"]));
  if (validation.diagnostics.some(({ severity }) => severity === "error")) {
    throw new Error("Smoke configuration validation reported an error.");
  }

  const drift = JSON.parse(run(["drift", root, "--json"]));
  if (drift.diagnostics.length !== 0) {
    throw new Error("Smoke drift check unexpectedly reported diagnostics.");
  }

  const checks = JSON.parse(run(["check", root, "--json"]));
  if (checks.plans.length < 2) {
    throw new Error("Smoke quality-gate preview did not resolve expected checks.");
  }

  console.log("Bundled CLI smoke test passed.");
} finally {
  await rm(root, { recursive: true, force: true });
}
