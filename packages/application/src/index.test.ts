import { describe, expect, it } from "vitest";
import {
  inspectRepository,
  generatePortableSetup,
  doctorRepository,
  detectManagedDrift,
  generateManagedSetup,
  generatePackLockfile,
  loadPackCatalog,
  parseInstructionRequirements,
  recommendRepository,
  resolvePacks,
  resolveRecommendedPacks,
  validateRepositoryConfiguration,
  validateLockedConfiguration,
  type RepositoryFileSystem,
} from "./index.js";

class MemoryFileSystem implements RepositoryFileSystem {
  constructor(private readonly files: Record<string, string>) {}

  async listFiles(): Promise<string[]> {
    return Object.keys(this.files);
  }

  async readText(_root: string, relativePath: string): Promise<string> {
    return this.files[relativePath] ?? "";
  }
}

describe("inspectRepository", () => {
  it("detects technologies and supported agent configurations", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "package.json": JSON.stringify({
          dependencies: { next: "1.0.0", react: "1.0.0" },
          devDependencies: { typescript: "1.0.0", vitest: "1.0.0" },
        }),
        "AGENTS.md": "",
        "packages/api/CLAUDE.md": "",
        ".claude/skills/testing/SKILL.md": "",
        ".github/copilot-instructions.md": "",
        ".github/instructions/frontend.instructions.md": "",
        ".cursor/rules/project.mdc": "",
        ".kiro/steering/product.md": "",
        "GEMINI.md": "",
      }),
    );

    expect(inspection.technologies.map(({ id }) => id)).toEqual([
      "javascript",
      "typescript",
      "nextjs",
      "react",
      "vitest",
    ]);
    expect(inspection.agents.map(({ agent }) => agent)).toEqual([
      "codex",
      "claude-code",
      "github-copilot",
      "cursor",
      "kiro",
      "gemini",
    ]);
  });

  it("returns no agents when no configurations or skills exist", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({ "README.md": "" }),
    );

    expect(inspection.agents).toEqual([]);
  });
});

describe("recommendRepository", () => {
  it("recommends a portable baseline and detected technology guidance", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "package.json": JSON.stringify({
          devDependencies: { typescript: "1.0.0", vitest: "1.0.0" },
        }),
      }),
    );

    const recommendation = recommendRepository(inspection);

    expect(recommendation.profile).toBe("TypeScript project baseline");
    expect(recommendation.recommendations.map(({ id }) => id)).toEqual([
      "governance/portable-agent-baseline",
      "development/typescript-baseline",
      "testing/use-existing-test-tools",
      "security/secrets-protection",
    ]);
  });

  it("recommends synchronization instead of replacing existing agent guidance", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "AGENTS.md": "",
        "CLAUDE.md": "",
      }),
    );

    const recommendation = recommendRepository(inspection);
    const governance = recommendation.recommendations[0];

    expect(governance?.id).toBe("governance/synchronize-agent-guidance");
    expect(governance?.proposedActions).toContain(
      "Propose shared guidance without overwriting user content",
    );
    expect(governance?.evidence).toHaveLength(2);
  });
});

describe("generatePortableSetup", () => {
  it("generates portable guidance and a reproducible profile configuration", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "package.json": JSON.stringify({
          devDependencies: { typescript: "1.0.0", vitest: "1.0.0" },
        }),
      }),
    );

    const artifacts = generatePortableSetup(inspection);
    const agents = artifacts.find(({ path }) => path === "AGENTS.md");
    const config = artifacts.find(({ path }) => path === "adrenai.yaml");

    expect(agents?.content).toContain("Preserve strict TypeScript typing");
    expect(agents?.content).toContain("vitest");
    expect(config?.content).toContain("development/typescript-baseline");
    expect(config?.content).toContain("testing/use-existing-test-tools");
  });
});

describe("pack catalog", () => {
  it("loads valid packs and reports invalid or duplicate manifests", async () => {
    const valid = {
      id: "governance/baseline",
      version: "1.0.0",
      type: "governance",
      title: "Baseline",
      description: "Baseline guidance.",
      appliesWhen: {},
      requires: [],
      conflicts: [],
      guidance: ["Preserve user work."],
      checks: [],
    };
    const result = await loadPackCatalog(
      "/catalog",
      new MemoryFileSystem({
        "one/pack.json": JSON.stringify(valid),
        "two/pack.json": JSON.stringify(valid),
        "bad/pack.json": "{",
      }),
    );

    expect(result.packs).toHaveLength(1);
    expect(result.diagnostics.map(({ id }) => id)).toEqual([
      "catalog/invalid-json",
      "catalog/duplicate-pack-id",
    ]);
  });

  it("resolves dependencies before requested packs and reports conflicts", () => {
    const base = {
      version: "1.0.0",
      type: "governance" as const,
      title: "Pack",
      description: "Pack description.",
      appliesWhen: {},
      guidance: [],
      checks: [],
    };
    const resolution = resolvePacks(
      [
        { ...base, id: "governance/base", requires: [], conflicts: [] },
        {
          ...base,
          id: "governance/feature",
          requires: ["governance/base"],
          conflicts: ["governance/other"],
        },
        { ...base, id: "governance/other", requires: [], conflicts: [] },
      ],
      ["governance/feature", "governance/other"],
    );

    expect(resolution.resolved.map(({ id }) => id)).toEqual([
      "governance/base",
      "governance/feature",
      "governance/other",
    ]);
    expect(resolution.diagnostics[0]?.id).toBe("catalog/pack-conflict");
  });

  it("resolves recommendation packs and their transitive dependencies", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "package.json": JSON.stringify({ devDependencies: { typescript: "1.0.0" } }),
      }),
    );
    const base = {
      version: "1.0.0",
      title: "Pack",
      description: "Pack description.",
      appliesWhen: {},
      conflicts: [],
      guidance: [],
      checks: [],
    };
    const catalog = [
      {
        ...base,
        id: "governance/portable-agent-baseline",
        type: "governance" as const,
        requires: [],
      },
      {
        ...base,
        id: "architecture/existing-conventions",
        type: "architecture" as const,
        requires: [],
      },
      {
        ...base,
        id: "development/typescript-baseline",
        type: "development" as const,
        appliesWhen: { technologies: ["typescript"] },
        requires: ["architecture/existing-conventions"],
      },
      {
        ...base,
        id: "security/secrets-protection",
        type: "security" as const,
        requires: [],
      },
    ];

    const resolution = resolveRecommendedPacks(inspection, catalog);

    expect(resolution.resolved.map(({ id }) => id)).toEqual([
      "governance/portable-agent-baseline",
      "architecture/existing-conventions",
      "development/typescript-baseline",
      "security/secrets-protection",
    ]);
    expect(resolution.diagnostics).toEqual([]);
  });

  it("warns when a resolved pack does not apply to detected technologies", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({ "package.json": "{}" }),
    );
    const resolution = resolveRecommendedPacks(
      inspection,
      [
        {
          id: "governance/portable-agent-baseline",
          version: "1.0.0",
          type: "governance",
          title: "Portable",
          description: "Portable baseline.",
          appliesWhen: {},
          requires: [],
          conflicts: [],
          guidance: [],
          checks: [],
        },
        {
          id: "security/secrets-protection",
          version: "1.0.0",
          type: "security",
          title: "Secrets",
          description: "Secrets baseline.",
          appliesWhen: { technologies: ["python"] },
          requires: [],
          conflicts: [],
          guidance: [],
          checks: [],
        },
      ],
    );

    expect(resolution.diagnostics[0]?.id).toBe("catalog/inapplicable-pack");
  });
});

describe("managed generation", () => {
  const hasher = {
    hash: (content: string) => content.length.toString(16).padStart(64, "0"),
  };

  it("generates detected agent artifacts and a content-hash manifest", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({
        "CLAUDE.md": "- Preserve user work.\n",
        ".cursor/rules/existing.mdc": "- Run tests.\n",
      }),
    );
    const recommendation = recommendRepository(inspection);
    const resolution = {
      requested: [],
      diagnostics: [],
      resolved: [
        {
          id: "governance/synchronize-agent-guidance",
          version: "1.0.0",
          type: "governance" as const,
          title: "Sync",
          description: "Sync guidance.",
          appliesWhen: {},
          requires: [],
          conflicts: [],
          guidance: ["Preserve user-authored instructions."],
          checks: [],
        },
      ],
    };

    const artifacts = generateManagedSetup(inspection, recommendation, resolution, hasher);
    const manifest = JSON.parse(
      artifacts.find(({ path }) => path === ".adrenai/generated.json")?.content ?? "{}",
    );

    expect(artifacts.map(({ path }) => path)).toEqual([
      ".claude/skills/adrenai-project-guidance/SKILL.md",
      ".cursor/rules/adrenai.mdc",
      "adrenai.yaml",
      ".adrenai/generated.json",
    ]);
    expect(manifest.artifacts).toHaveLength(3);
    expect(manifest.artifacts[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports modified and missing managed files", async () => {
    const manifest = {
      version: 1,
      artifacts: [
        { path: "AGENTS.md", purpose: "guidance", contentHash: "0".repeat(64) },
        { path: "adrenai.yaml", purpose: "config", contentHash: "0".repeat(64) },
      ],
    };
    const report = await detectManagedDrift(
      "/project",
      new MemoryFileSystem({
        ".adrenai/generated.json": JSON.stringify(manifest),
        "AGENTS.md": "changed",
      }),
      hasher,
    );

    expect(report.diagnostics.map(({ id }) => id)).toEqual([
      "generation/managed-file-drift",
      "generation/missing-managed-file",
    ]);
  });

  it("generates explicitly requested agents when none are detected", async () => {
    const inspection = await inspectRepository(
      "/project",
      new MemoryFileSystem({ "package.json": "{}" }),
    );
    const recommendation = recommendRepository(inspection);
    const resolution = { requested: [], diagnostics: [], resolved: [] };

    const artifacts = generateManagedSetup(
      inspection,
      recommendation,
      resolution,
      hasher,
      ["codex", "claude-code"],
    );

    expect(artifacts.map(({ path }) => path)).toContain("AGENTS.md");
    expect(artifacts.map(({ path }) => path)).toContain(
      ".claude/skills/adrenai-project-guidance/SKILL.md",
    );
    expect(artifacts.find(({ path }) => path === "adrenai.yaml")?.content).toContain(
      "    - claude-code",
    );
  });

  it("rejects unsafe paths in a repository-controlled generation manifest", async () => {
    const report = await detectManagedDrift(
      "/project",
      new MemoryFileSystem({
        ".adrenai/generated.json": JSON.stringify({
          version: 1,
          artifacts: [
            { path: "../secret.txt", purpose: "unsafe", contentHash: "0".repeat(64) },
          ],
        }),
      }),
      hasher,
    );

    expect(report.diagnostics[0]?.id).toBe("generation/unsafe-managed-path");
  });
});

describe("validateRepositoryConfiguration", () => {
  it("accepts generated configuration and reports invalid or missing configuration", async () => {
    const valid = await validateRepositoryConfiguration(
      "/project",
      new MemoryFileSystem({
        "adrenai.yaml": [
          "version: 1",
          "profile: TypeScript baseline",
          "mode: portable",
          "selected_packs:",
          "  - development/typescript-baseline",
          "agents:",
          "  targets:",
          "    - codex",
        ].join("\n"),
      }),
    );
    const invalid = await validateRepositoryConfiguration(
      "/project",
      new MemoryFileSystem({ "adrenai.yaml": "version: [" }),
    );
    const missing = await validateRepositoryConfiguration(
      "/project",
      new MemoryFileSystem({}),
    );

    expect(valid).toEqual([]);
    expect(invalid[0]?.id).toBe("configuration/invalid-yaml");
    expect(missing[0]?.id).toBe("configuration/missing-config");
  });
});

describe("validateLockedConfiguration", () => {
  it("reports missing and stale lockfiles", async () => {
    const hasher = { hash: (content: string) => content.length.toString(16).padStart(64, "0") };
    const pack = {
      id: "development/typescript-baseline",
      version: "1.0.0",
      type: "development" as const,
      title: "TypeScript",
      description: "TypeScript.",
      appliesWhen: {},
      requires: [],
      conflicts: [],
      guidance: [],
      checks: [],
    };
    const config = [
      "version: 1",
      "profile: TypeScript baseline",
      "mode: portable",
      "selected_packs:",
      "  - development/typescript-baseline",
      "agents:",
      "  targets:",
      "    - codex",
    ].join("\n");

    const missing = await validateLockedConfiguration(
      "/project",
      [pack],
      new MemoryFileSystem({ "adrenai.yaml": config }),
      hasher,
    );
    const stale = await validateLockedConfiguration(
      "/project",
      [pack],
      new MemoryFileSystem({
        "adrenai.yaml": config,
        "adrenai.lock.json": "{}\n",
      }),
      hasher,
    );
    const valid = await validateLockedConfiguration(
      "/project",
      [pack],
      new MemoryFileSystem({
        "adrenai.yaml": config,
        "adrenai.lock.json": generatePackLockfile(
          { requested: [pack.id], resolved: [pack], diagnostics: [] },
          hasher,
        ).content,
      }),
      hasher,
    );

    expect(missing[0]?.id).toBe("configuration/missing-lockfile");
    expect(stale[0]?.id).toBe("configuration/lockfile-drift");
    expect(valid).toEqual([]);
  });
});

describe("instruction analysis", () => {
  it("extracts list requirements with source, scope, line, and polarity", () => {
    const requirements = parseInstructionRequirements(
      "packages/api/AGENTS.md",
      "# Rules\n\n- Run tests before completion.\n- Do not expose secrets.\n",
    );

    expect(requirements).toEqual([
      {
        text: "Run tests before completion.",
        normalized: "run tests before completion",
        polarity: "require",
        source: "packages/api/AGENTS.md",
        scope: "packages/api",
        line: 3,
      },
      {
        text: "Do not expose secrets.",
        normalized: "expose secrets",
        polarity: "prohibit",
        source: "packages/api/AGENTS.md",
        scope: "packages/api",
        line: 4,
      },
    ]);
  });

  it("reports duplicates and conflicts only within the same scope", async () => {
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": "- Run tests.\n- Never expose secrets.\n",
      "CLAUDE.md": "- Run tests.\n- Expose secrets.\n",
      "packages/api/AGENTS.md": "- Run tests.\n",
    });
    const inspection = await inspectRepository("/project", fileSystem);

    const report = await doctorRepository(inspection, fileSystem);

    expect(report.requirements).toHaveLength(5);
    expect(report.diagnostics.map(({ id }) => id)).toEqual([
      "instructions/duplicate-requirements",
      "instructions/conflicting-requirements",
    ]);
  });

  it("reports missing Markdown instructions", async () => {
    const fileSystem = new MemoryFileSystem({ "package.json": "{}" });
    const inspection = await inspectRepository("/project", fileSystem);

    const report = await doctorRepository(inspection, fileSystem);

    expect(report.diagnostics[0]?.id).toBe("instructions/missing-configuration");
    expect(report.estimatedInstructionTokens).toBe(0);
  });

  it("reports broken relative references and excessive instruction context", async () => {
    const longRule = `- Follow ${"careful guidance ".repeat(220)}.\n`;
    const fileSystem = new MemoryFileSystem({
      "AGENTS.md": `${longRule}\nSee [testing](./docs/missing.md).\nSee [project](./docs/project.md).\n`,
      "docs/project.md": "# Project\n",
    });
    const inspection = await inspectRepository("/project", fileSystem);

    const report = await doctorRepository(inspection, fileSystem);

    expect(report.estimatedInstructionTokens).toBeGreaterThan(700);
    expect(report.diagnostics.map(({ id }) => id)).toContain(
      "instructions/broken-reference",
    );
    expect(report.diagnostics.map(({ id }) => id)).toContain(
      "instructions/context-budget-exceeded",
    );
  });
});
