import type { GeneratedArtifact, Pack, PackResolution } from "@adrenai/domain";
import { describe, expect, it } from "vitest";
import {
  applySynchronization,
  generatePackLockfile,
  planSynchronization,
  type SynchronizationFileSystem,
} from "./sync.js";

const hasher = {
  hash: (content: string) => `hash:${content}`,
};

const pack = (id: string, version = "1.0.0"): Pack => ({
  id,
  version,
  type: "development",
  title: id,
  description: `${id} description`,
  appliesWhen: {},
  requires: [],
  conflicts: [],
  guidance: [`Use ${id}.`],
  checks: [],
});

const resolution = (
  resolved: Pack[] = [pack("development/typescript")],
): PackResolution => ({
  requested: resolved.map(({ id }) => id),
  resolved,
  diagnostics: [],
});

class MemoryFileSystem implements SynchronizationFileSystem {
  readonly writes: string[] = [];

  constructor(readonly files: Record<string, string> = {}) {}

  async listFiles(): Promise<string[]> {
    return Object.keys(this.files);
  }

  async readText(_root: string, path: string): Promise<string> {
    if (!(path in this.files)) {
      throw new Error(`Missing ${path}`);
    }
    return this.files[path] ?? "";
  }

  async writeText(_root: string, path: string, content: string): Promise<void> {
    this.files[path] = content;
    this.writes.push(path);
  }
}

const artifact = (
  path = "AGENTS.md",
  content = "generated\n",
): GeneratedArtifact => ({
  path,
  content,
  purpose: "generated guidance",
});

function manifestFor(entries: Array<{ path: string; content: string }>): string {
  return `${JSON.stringify({
    version: 1,
    artifacts: entries.map(({ path, content }) => ({
      path,
      purpose: "generated guidance",
      contentHash: hasher.hash(content),
    })),
  }, null, 2)}\n`;
}

describe("generatePackLockfile", () => {
  it("sorts and pins requested packs, versions, and content hashes deterministically", () => {
    const second = pack("testing/vitest", "2.0.0");
    const first = pack("development/typescript", "1.2.0");

    const left = generatePackLockfile({
      requested: [second.id, first.id, second.id],
      resolved: [second, first],
      diagnostics: [],
    }, hasher);
    const right = generatePackLockfile({
      requested: [first.id, second.id],
      resolved: [first, second],
      diagnostics: [],
    }, hasher);

    expect(left.content).toBe(right.content);
    expect(JSON.parse(left.content)).toEqual({
      version: 1,
      requested: ["development/typescript", "testing/vitest"],
      packs: [
        {
          id: "development/typescript",
          version: "1.2.0",
          contentHash: expect.stringContaining("hash:"),
        },
        {
          id: "testing/vitest",
          version: "2.0.0",
          contentHash: expect.stringContaining("hash:"),
        },
      ],
    });
  });

  it("changes a pack hash when locked pack content changes", () => {
    const original = generatePackLockfile(resolution(), hasher);
    const changedPack = {
      ...pack("development/typescript"),
      guidance: ["Different guidance."],
    };
    const changed = generatePackLockfile(resolution([changedPack]), hasher);

    expect(changed.content).not.toBe(original.content);
  });
});

describe("planSynchronization", () => {
  it("previews creation of generated files, lockfile, and ownership manifest", async () => {
    const fileSystem = new MemoryFileSystem();
    const plan = await planSynchronization(
      ".",
      [artifact(), generatePackLockfile(resolution(), hasher)],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(true);
    expect(plan.actions.map(({ path, kind }) => [path, kind])).toEqual([
      ["AGENTS.md", "create"],
      ["adrenai.lock.json", "create"],
      [".adrenai/generated.json", "create"],
    ]);
    expect(plan.manifest.artifacts.map(({ path }) => path)).toEqual([
      "AGENTS.md",
      "adrenai.lock.json",
    ]);
  });

  it("updates only unchanged files recorded in the ownership manifest", async () => {
    const old = "old generated\n";
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": old,
      ".adrenai/generated.json": manifestFor([{ path: "AGENTS.md", content: old }]),
    });

    const plan = await planSynchronization(
      ".",
      [artifact("AGENTS.md", "new generated\n")],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(true);
    expect(plan.actions.find(({ path }) => path === "AGENTS.md")?.kind).toBe("update");
  });

  it("blocks overwriting an unmanaged existing file", async () => {
    const fileSystem = new MemoryFileSystem({ "AGENTS.md": "user content\n" });
    const plan = await planSynchronization(
      ".",
      [artifact(), generatePackLockfile(resolution(), hasher)],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/unmanaged-file-conflict");
    expect(plan.actions.find(({ path }) => path === "AGENTS.md")?.kind).toBe("blocked");
  });

  it("blocks overwriting user changes in a managed file", async () => {
    const original = "original\n";
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": "user changed\n",
      ".adrenai/generated.json": manifestFor([{ path: "AGENTS.md", content: original }]),
    });
    const plan = await planSynchronization(
      ".",
      [artifact(), generatePackLockfile(resolution(), hasher)],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/managed-file-drift");
  });

  it("blocks synchronization when the ownership manifest is invalid", async () => {
    const fileSystem = new MemoryFileSystem({
      ".adrenai/generated.json": "not json",
    });
    const plan = await planSynchronization(".", [artifact()], resolution(), fileSystem, hasher);

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/invalid-manifest");
  });

  it("blocks unsafe and duplicate generated paths", async () => {
    const fileSystem = new MemoryFileSystem();
    const plan = await planSynchronization(
      ".",
      [artifact("../outside.md"), artifact("same.md"), artifact("same.md")],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["sync/unsafe-generated-path", "sync/duplicate-generated-path"]),
    );
  });

  it("blocks duplicate generated paths even when all paths are otherwise safe", async () => {
    const fileSystem = new MemoryFileSystem();
    const plan = await planSynchronization(
      ".",
      [artifact("same.md"), artifact("same.md")],
      resolution(),
      fileSystem,
      hasher,
    );

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/duplicate-generated-path");
  });

  it("blocks unsafe paths already recorded in the ownership manifest", async () => {
    const fileSystem = new MemoryFileSystem({
      ".adrenai/generated.json": manifestFor([{ path: "../outside.md", content: "old\n" }]),
    });
    const plan = await planSynchronization(".", [], resolution(), fileSystem, hasher);

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/unsafe-managed-path");
  });

  it("preserves stale managed artifacts instead of deleting or abandoning them", async () => {
    const stale = "stale\n";
    const fileSystem = new MemoryFileSystem({
      "OLD.md": stale,
      ".adrenai/generated.json": manifestFor([{ path: "OLD.md", content: stale }]),
    });
    const plan = await planSynchronization(".", [], resolution(), fileSystem, hasher);

    expect(plan.actions.find(({ path }) => path === "OLD.md")?.kind).toBe("preserve");
    expect(plan.manifest.artifacts.map(({ path }) => path)).toContain("OLD.md");
    expect(plan.diagnostics.map(({ id }) => id)).toContain("sync/stale-managed-file");
  });
});

describe("applySynchronization", () => {
  it("writes created and regenerated files with the manifest last", async () => {
    const old = "old\n";
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": old,
      ".adrenai/generated.json": manifestFor([{ path: "AGENTS.md", content: old }]),
    });
    const plan = await planSynchronization(
      ".",
      [artifact(), generatePackLockfile(resolution(), hasher)],
      resolution(),
      fileSystem,
      hasher,
    );
    const result = await applySynchronization(plan, fileSystem, hasher);

    expect(result.written).toEqual([
      "AGENTS.md",
      "adrenai.lock.json",
      ".adrenai/generated.json",
    ]);
    expect(fileSystem.writes.at(-1)).toBe(".adrenai/generated.json");
    expect(fileSystem.files["AGENTS.md"]).toBe("generated\n");
  });

  it("refuses every write when the plan contains a blocked action", async () => {
    const fileSystem = new MemoryFileSystem({ "AGENTS.md": "user\n" });
    const plan = await planSynchronization(".", [artifact()], resolution(), fileSystem, hasher);

    await expect(applySynchronization(plan, fileSystem, hasher)).rejects.toThrow(
      "blocked changes",
    );
    expect(fileSystem.writes).toEqual([]);
  });

  it("aborts if a file changes between preview and apply", async () => {
    const old = "old\n";
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": old,
      ".adrenai/generated.json": manifestFor([{ path: "AGENTS.md", content: old }]),
    });
    const plan = await planSynchronization(".", [artifact()], resolution(), fileSystem, hasher);
    fileSystem.files["AGENTS.md"] = "changed after preview\n";

    await expect(applySynchronization(plan, fileSystem, hasher)).rejects.toThrow(
      "changed after preview",
    );
    expect(fileSystem.writes).toEqual([]);
  });

  it("aborts if a planned new file appears between preview and apply", async () => {
    const fileSystem = new MemoryFileSystem();
    const plan = await planSynchronization(".", [artifact()], resolution(), fileSystem, hasher);
    fileSystem.files["AGENTS.md"] = "appeared\n";

    await expect(applySynchronization(plan, fileSystem, hasher)).rejects.toThrow(
      "created after preview",
    );
    expect(fileSystem.writes).toEqual([]);
  });
});
