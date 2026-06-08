import { access, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { ContentHasher, RepositoryFileSystem } from "@adrenai/application";
import type { ApplyResult, GeneratedArtifact, WorkflowState } from "@adrenai/domain";
import type {
  QualityGateExecution,
  QualityGatePlan,
} from "@adrenai/domain";
import { isSafeQualityGateCommand } from "@adrenai/domain";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".venv",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

function pathEscapes(root: string, target: string): boolean {
  const relativeTarget = relative(root, target);
  return (
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relativeTarget)
  );
}

async function assertRealPathContained(root: string, target: string): Promise<void> {
  const realRoot = await realpath(root);
  let probe = target;
  while (true) {
    try {
      const realProbe = await realpath(probe);
      if (pathEscapes(realRoot, realProbe)) {
        throw new Error(`Target resolves outside repository root: ${target}`);
      }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      const parent = dirname(probe);
      if (parent === probe) {
        throw new Error(`Unable to establish repository containment for: ${target}`);
      }
      probe = parent;
    }
  }
}

export class NodeRepositoryFileSystem implements RepositoryFileSystem {
  async listFiles(root: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        const absolutePath = join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(absolutePath);
        } else if (entry.isFile()) {
          files.push(relative(root, absolutePath));
        }
      }
    };

    await walk(root);
    return files;
  }

  readText(root: string, relativePath: string): Promise<string> {
    return readFile(join(root, relativePath), "utf8");
  }

  async writeText(root: string, relativePath: string, content: string): Promise<void> {
    const absolutePath = resolve(root, relativePath);
    if (pathEscapes(resolve(root), absolutePath)) {
      throw new Error(`Artifact path escapes repository root: ${relativePath}`);
    }
    await assertRealPathContained(root, absolutePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

export class Sha256ContentHasher implements ContentHasher {
  hash(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
  }
}

function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      /(secret|token|password|credential|api[_-]?key|auth)/i.test(key) ||
      containsSecretKey(child),
  );
}

export async function saveWorkflowState(root: string, state: WorkflowState): Promise<string> {
  if (containsSecretKey(state)) throw new Error("Workflow state contains a secret-like key.");
  if (!/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/.test(state.workflowId)) {
    throw new Error("Workflow state id is invalid.");
  }
  const path = `.adrenai/workflows/${state.workflowId.replaceAll("/", "--")}.json`;
  await new NodeRepositoryFileSystem().writeText(root, path, `${JSON.stringify(state, null, 2)}\n`);
  return path;
}

export async function loadWorkflowState(root: string, workflowId: string): Promise<WorkflowState> {
  if (!/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/.test(workflowId)) {
    throw new Error("Workflow state id is invalid.");
  }
  const path = `.adrenai/workflows/${workflowId.replaceAll("/", "--")}.json`;
  const state = JSON.parse(await new NodeRepositoryFileSystem().readText(root, path)) as WorkflowState;
  if (containsSecretKey(state)) throw new Error("Workflow state contains a secret-like key.");
  return state;
}

export async function applyArtifacts(
  root: string,
  artifacts: GeneratedArtifact[],
): Promise<ApplyResult> {
  const result: ApplyResult = { written: [], skipped: [] };

  for (const artifact of artifacts) {
    const absoluteRoot = resolve(root);
    const absolutePath = resolve(absoluteRoot, artifact.path);
    if (
      isAbsolute(artifact.path) ||
      pathEscapes(absoluteRoot, absolutePath)
    ) {
      throw new Error(`Artifact path escapes repository root: ${artifact.path}`);
    }
    await assertRealPathContained(root, absolutePath);

    try {
      await access(absolutePath);
      result.skipped.push(artifact.path);
      continue;
    } catch {
      // Missing files are safe to create.
    }

    let content = artifact.content;
    if (artifact.path === ".adrenai/generated.json" && result.skipped.length > 0) {
      try {
        const manifest = JSON.parse(content) as {
          version: number;
          artifacts: Array<{ path: string }>;
        };
        manifest.artifacts = manifest.artifacts.filter(
          ({ path }) => !result.skipped.includes(path),
        );
        content = `${JSON.stringify(manifest, null, 2)}\n`;
      } catch {
        throw new Error("Generated ownership manifest is invalid.");
      }
    }

    await mkdir(dirname(absolutePath), { recursive: true });
    try {
      await writeFile(absolutePath, content, { encoding: "utf8", flag: "wx" });
      result.written.push(artifact.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        result.skipped.push(artifact.path);
      } else {
        throw error;
      }
    }
  }

  return result;
}

export async function runQualityGatePlans(
  root: string,
  plans: QualityGatePlan[],
): Promise<QualityGateExecution[]> {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => {
      const upper = key.toUpperCase();
      return !["TOKEN", "SECRET", "PASSWORD", "CREDENTIAL", "AUTH", "API_KEY"].some(
        (fragment) => upper.includes(fragment),
      );
    }),
  );
  const executions: QualityGateExecution[] = [];
  for (const plan of plans) {
    if (!isSafeQualityGateCommand(plan.command)) {
      executions.push({ gateId: plan.id, error: "Unsafe quality-gate command rejected." });
      continue;
    }
    executions.push(
      await new Promise<QualityGateExecution>((resolveExecution) => {
        const windowsCommand =
          process.platform === "win32" &&
          ["corepack", "npm", "pnpm", "yarn"].includes(plan.command.executable);
        const executable = windowsCommand
          ? process.env.ComSpec ?? "cmd.exe"
          : plan.command.executable;
        const args = windowsCommand
          ? ["/d", "/s", "/c", [plan.command.executable, ...plan.command.args].join(" ")]
          : plan.command.args;
        const child = spawn(executable, args, {
          cwd: root,
          shell: false,
          stdio: "ignore",
          windowsHide: true,
          env: environment,
        });
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill();
        }, plan.timeoutMs);
        child.once("error", (error) => {
          clearTimeout(timer);
          resolveExecution({ gateId: plan.id, error: error.message, timedOut });
        });
        child.once("exit", (code) => {
          clearTimeout(timer);
          resolveExecution({ gateId: plan.id, exitCode: code ?? undefined, timedOut });
        });
      }),
    );
  }
  return executions;
}
