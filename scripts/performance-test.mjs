import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = await mkdtemp(join(tmpdir(), "adrenai-performance-"));
const cli = resolve("dist/main.js");

try {
  const writes = [];
  for (let index = 0; index < 2_000; index += 1) {
    const directory = join(root, "packages", String(index % 100));
    writes.push(
      mkdir(directory, { recursive: true }).then(() =>
        writeFile(join(directory, `file-${index}.ts`), "export {};\n"),
      ),
    );
  }
  await Promise.all(writes);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ devDependencies: { typescript: "1.0.0" } }),
  );

  const started = performance.now();
  execFileSync(process.execPath, [cli, "inspect", root, "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const durationMs = Math.round(performance.now() - started);
  if (durationMs > 10_000) {
    throw new Error(`Inspection performance exceeded 10 seconds: ${durationMs}ms`);
  }
  console.log(`Performance smoke passed: 2,001 files inspected in ${durationMs}ms.`);
} finally {
  await rm(root, { recursive: true, force: true });
}
