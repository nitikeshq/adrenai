import { describe, expect, it } from "vitest";
import { loadPlatformCatalog, resolveCatalogPolicies, type RepositoryFileSystem } from "./index.js";

class MemoryFileSystem implements RepositoryFileSystem {
  constructor(private readonly files: Record<string, string>) {}
  async listFiles(): Promise<string[]> { return Object.keys(this.files); }
  async readText(_root: string, path: string): Promise<string> { return this.files[path]!; }
}

describe("platform catalog loading", () => {
  it("loads validated taxonomies, workflows, and applicable policy layers", async () => {
    const fs = new MemoryFileSystem({
      "taxonomies/test.json": JSON.stringify({
        schemaVersion: 1, namespace: "test",
        categories: [{ id: "test/design", version: "1.0.0", title: "Design", description: "Design category." }],
        strategies: [], capabilities: [], constraints: [], deliverables: [], audiences: [],
      }),
      "workflows/test.json": JSON.stringify({
        schemaVersion: 1, id: "test/workflow", version: "1.0.0", title: "Test",
        phases: [{ id: "plan", title: "Plan", dependsOn: [], inputs: [], outputs: [], gateIds: [], approvalRequired: true, optional: false, retryLimit: 1 }],
      }),
      "policies/test.json": JSON.stringify({
        schemaVersion: 1, layers: [{
          id: "test/design-policy", version: "1.0.0", scope: "category", target: "design",
          rules: [{ id: "test/accessibility", key: "quality.accessibility", statement: "Review accessibility.", enforcement: "enforceable", overrideAllowed: false, mandatoryGateIds: ["accessibility-review"] }],
        }],
      }),
    });
    const catalog = await loadPlatformCatalog(".", fs);
    expect(catalog.taxonomies).toHaveLength(1);
    expect(catalog.workflows.map(({ id }) => id)).toEqual(["test/workflow"]);
    expect(resolveCatalogPolicies(catalog, "test/design").mandatoryGateIds).toEqual(["accessibility-review"]);
  });

  it("surfaces malformed catalog files as blocking diagnostics", async () => {
    const catalog = await loadPlatformCatalog(".", new MemoryFileSystem({ "workflows/bad.json": "{" }));
    expect(catalog.diagnostics[0]?.id).toBe("platform-catalog/invalid-json");
  });
});
