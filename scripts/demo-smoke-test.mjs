import { appendFile, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cli = resolve("dist/main.js");
const sourceFixture = resolve("demos/launch/fixtures/before");
const temporaryRoot = await mkdtemp(join(tmpdir(), "adrenai-launch-demo-"));
const fixture = join(temporaryRoot, "repository");

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    throw new Error(
      `Command failed: adrenai ${args.join(" ")}\n` +
        `Expected status ${expectedStatus}, received ${result.status}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function requireText(output, text) {
  if (!output.includes(text)) {
    throw new Error(`Expected output to contain "${text}".\n${output}`);
  }
}

try {
  await cp(sourceFixture, fixture, { recursive: true });

  requireText(run(["onboard", fixture]), "No files written. No AI provider or credits used.");

  const inspection = JSON.parse(run(["inspect", fixture, "--json"]));
  if (!inspection.technologies.some(({ id }) => id === "typescript")) {
    throw new Error("Launch fixture inspection did not detect TypeScript.");
  }

  requireText(run(["recommend", fixture]), "Recommended profile: Next.js project baseline");
  requireText(
    run(["sync", fixture, "--agents=codex,claude-code,cursor,github-copilot,kiro,gemini"]),
    "No files written.",
  );
  requireText(
    run([
      "sync",
      fixture,
      "--write",
      "--agents=codex,claude-code,cursor,github-copilot,kiro,gemini",
    ]),
    "Synchronization result:",
  );
  requireText(run(["validate", fixture]), "No diagnostics found.");
  requireText(run(["drift", fixture]), "No managed-file drift detected.");

  const manifest = JSON.parse(await readFile(join(fixture, ".adrenai", "generated.json"), "utf8"));
  const managedPath = manifest.artifacts.find(({ path }) => path === "AGENTS.md")?.path;
  if (!managedPath) {
    throw new Error("Launch fixture did not generate managed AGENTS.md guidance.");
  }
  await appendFile(join(fixture, managedPath), "\nUnmanaged launch-demo change.\n");
  requireText(run(["drift", fixture], 1), "differs from its generated content");

  console.log("Launch demo smoke test passed.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
