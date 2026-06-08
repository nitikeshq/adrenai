import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packagePaths = ["package.json"];

const failures = [];

for (const packagePath of packagePaths) {
  const directory = resolve(packagePath, "..");
  const manifest = JSON.parse(await readFile(packagePath, "utf8"));

  if (manifest.private === true) {
    failures.push(`${packagePath}: package is private`);
  }
  if (manifest.license !== "Apache-2.0") {
    failures.push(`${packagePath}: license must be Apache-2.0`);
  }
  if (manifest.publishConfig?.access !== "public") {
    failures.push(`${packagePath}: publishConfig.access must be public`);
  }
  if (
    !Array.isArray(manifest.files) ||
    !manifest.files.some((entry) => entry === "dist" || entry === "dist/")
  ) {
    failures.push(`${packagePath}: files must include dist`);
  }

  const entrypoints = [
    ...(typeof manifest.exports === "string" ? [manifest.exports] : []),
    ...Object.values(manifest.bin ?? {}),
  ];
  for (const entrypoint of entrypoints) {
    try {
      const entrypointPath = resolve(directory, entrypoint);
      await access(entrypointPath);
      if (Object.values(manifest.bin ?? {}).includes(entrypoint)) {
        const content = await readFile(entrypointPath, "utf8");
        if (!content.startsWith("#!")) {
          failures.push(`${packagePath}: CLI entrypoint ${entrypoint} needs a shebang`);
        }
      }
    } catch {
      failures.push(`${packagePath}: missing built entrypoint ${entrypoint}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Release validation failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${packagePaths.length} publishable packages.`);
}
