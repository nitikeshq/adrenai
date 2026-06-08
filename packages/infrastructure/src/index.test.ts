import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { applyArtifacts, runQualityGatePlans, Sha256ContentHasher } from "./index.js";

const createdDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function temporaryRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "adrenai-test-"));
  createdDirectories.push(directory);
  return directory;
}

describe("applyArtifacts", () => {
  it("creates missing artifacts and preserves existing files", async () => {
    const root = await temporaryRepository();
    await writeFile(join(root, "AGENTS.md"), "user content\n");

    const result = await applyArtifacts(root, [
      { path: "AGENTS.md", purpose: "guidance", content: "generated\n" },
      { path: "adrenai.yaml", purpose: "config", content: "version: 1\n" },
    ]);

    expect(result).toEqual({
      written: ["adrenai.yaml"],
      skipped: ["AGENTS.md"],
    });
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe("user content\n");
  });

  it("rejects artifacts that escape the repository root", async () => {
    const root = await temporaryRepository();

    await expect(
      applyArtifacts(root, [
        { path: "../outside.md", purpose: "invalid", content: "unsafe\n" },
      ]),
    ).rejects.toThrow("escapes repository root");
  });

  it("does not claim ownership of existing skipped files", async () => {
    const root = await temporaryRepository();
    await writeFile(join(root, "AGENTS.md"), "user content\n");

    await applyArtifacts(root, [
      { path: "AGENTS.md", purpose: "guidance", content: "generated\n" },
      {
        path: ".adrenai/generated.json",
        purpose: "manifest",
        content: `${JSON.stringify({
          version: 1,
          artifacts: [
            { path: "AGENTS.md", purpose: "guidance", contentHash: "generated-hash" },
          ],
        })}\n`,
      },
    ]);

    const manifest = JSON.parse(
      await readFile(join(root, ".adrenai/generated.json"), "utf8"),
    );
    expect(manifest.artifacts).toEqual([]);
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe("user content\n");
  });

  it("rejects writes through repository symlinks that escape the root", async () => {
    const root = await temporaryRepository();
    const outside = await temporaryRepository();
    await mkdir(join(outside, "target"), { recursive: true });
    await symlink(
      join(outside, "target"),
      join(root, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(
      applyArtifacts(root, [
        { path: "linked/AGENTS.md", purpose: "unsafe", content: "unsafe\n" },
      ]),
    ).rejects.toThrow("outside repository root");
  });
});

describe("Sha256ContentHasher", () => {
  it("creates deterministic content hashes", () => {
    const hasher = new Sha256ContentHasher();

    expect(hasher.hash("content")).toBe(hasher.hash("content"));
    expect(hasher.hash("content")).not.toBe(hasher.hash("changed"));
  });
});

describe("runQualityGatePlans", () => {
  it("rejects unsafe commands without executing them", async () => {
    const executions = await runQualityGatePlans(".", [
      {
        id: "unsafe",
        title: "Unsafe",
        category: "test",
        command: { executable: "powershell", args: ["-Command", "echo bad"] },
        required: true,
        requiresApproval: true,
        timeoutMs: 1000,
      },
    ]);

    expect(executions[0]?.error).toContain("Unsafe");
  });
});
