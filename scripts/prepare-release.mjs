import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDirectory = resolve("artifacts/npm");
const outputArgument = "artifacts/npm";
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const windows = process.platform === "win32";
const commands = windows
  ? [
      ["corepack pnpm prepack"],
      [`npm pack --ignore-scripts --pack-destination ${outputArgument}`],
    ]
  : [
      ["corepack", "pnpm", "prepack"],
      ["npm", "pack", "--ignore-scripts", "--pack-destination", outputArgument],
    ];

for (const command of commands) {
  const result = windows
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command[0]], {
        stdio: "inherit",
        shell: false,
      })
    : spawnSync(command[0], command.slice(1), { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error.message);
    }
    process.exitCode = result.status ?? 1;
    break;
  }
}
