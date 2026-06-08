import type {
  Diagnostic,
  GenerationManifest,
  GeneratedArtifact,
  ManagedArtifact,
  Pack,
  PackResolution,
} from "@adrenai/domain";

export interface SynchronizationFileSystem {
  listFiles(root: string): Promise<string[]>;
  readText(root: string, relativePath: string): Promise<string>;
  writeText(root: string, relativePath: string, content: string): Promise<void>;
}

export interface SynchronizationHasher {
  hash(content: string): string;
}

export type SynchronizationActionKind =
  | "create"
  | "update"
  | "unchanged"
  | "preserve"
  | "blocked";

export interface SynchronizationAction {
  path: string;
  purpose: string;
  kind: SynchronizationActionKind;
  content?: string;
  expectedContentHash?: string;
  reason?: string;
}

export interface SynchronizationPlan {
  root: string;
  canApply: boolean;
  actions: SynchronizationAction[];
  diagnostics: Diagnostic[];
  manifest: GenerationManifest;
}

export interface SynchronizationResult {
  written: string[];
  unchanged: string[];
  preserved: string[];
}

interface PackLockEntry {
  id: string;
  version: string;
  contentHash: string;
}

interface PackLockfile {
  version: 1;
  requested: string[];
  packs: PackLockEntry[];
}

const MANIFEST_PATH = ".adrenai/generated.json";
const LOCKFILE_PATH = "adrenai.lock.json";

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function isSafeRelativePath(path: string): boolean {
  const normalized = normalizePath(path);
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !/^[a-z]:\//i.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function packHashInput(pack: Pack): string {
  return JSON.stringify(stableValue(pack));
}

export function generatePackLockfile(
  resolution: PackResolution,
  hasher: SynchronizationHasher,
): GeneratedArtifact {
  const lockfile: PackLockfile = {
    version: 1,
    requested: [...new Set(resolution.requested)].sort(),
    packs: [...resolution.resolved]
      .sort((left, right) => compareText(left.id, right.id))
      .map((pack) => ({
        id: pack.id,
        version: pack.version,
        contentHash: hasher.hash(packHashInput(pack)),
      })),
  };

  return {
    path: LOCKFILE_PATH,
    purpose: "Deterministic lockfile for resolved AdrenAI pack versions and content.",
    content: stableJson(lockfile),
  };
}

function validManifest(value: unknown): value is GenerationManifest {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<GenerationManifest>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.artifacts) &&
    candidate.artifacts.every(
      (artifact) =>
        artifact !== null &&
        typeof artifact === "object" &&
        typeof artifact.path === "string" &&
        typeof artifact.purpose === "string" &&
        typeof artifact.contentHash === "string",
    )
  );
}

async function readManifest(
  root: string,
  files: Set<string>,
  fileSystem: SynchronizationFileSystem,
): Promise<{ manifest?: GenerationManifest; diagnostic?: Diagnostic }> {
  if (!files.has(MANIFEST_PATH)) {
    return {};
  }
  try {
    const value: unknown = JSON.parse(await fileSystem.readText(root, MANIFEST_PATH));
    if (validManifest(value)) {
      return { manifest: value };
    }
  } catch {
    // The diagnostic below intentionally treats unreadable and invalid manifests alike.
  }
  return {
    diagnostic: {
      id: "sync/invalid-manifest",
      severity: "error",
      message: "The existing AdrenAI ownership manifest is invalid; synchronization is blocked.",
      evidence: [{ path: MANIFEST_PATH, reason: "invalid or unreadable ownership manifest" }],
    },
  };
}

function managedArtifact(
  artifact: GeneratedArtifact,
  hasher: SynchronizationHasher,
): ManagedArtifact {
  return {
    path: normalizePath(artifact.path),
    purpose: artifact.purpose,
    contentHash: hasher.hash(artifact.content),
  };
}

function blockedAction(
  artifact: GeneratedArtifact,
  reason: string,
): SynchronizationAction {
  return {
    path: normalizePath(artifact.path),
    purpose: artifact.purpose,
    kind: "blocked",
    reason,
  };
}

export async function planSynchronization(
  root: string,
  generatedArtifacts: GeneratedArtifact[],
  resolution: PackResolution,
  fileSystem: SynchronizationFileSystem,
  hasher: SynchronizationHasher,
): Promise<SynchronizationPlan> {
  const repositoryFiles = new Set(
    (await fileSystem.listFiles(root)).map(normalizePath),
  );
  const manifestRead = await readManifest(root, repositoryFiles, fileSystem);
  const diagnostics: Diagnostic[] = manifestRead.diagnostic ? [manifestRead.diagnostic] : [];
  const previousArtifacts = new Map(
    (manifestRead.manifest?.artifacts ?? []).map((artifact) => [
      normalizePath(artifact.path),
      artifact,
    ]),
  );
  const desired = new Map<string, GeneratedArtifact>();
  const lockfile = generatePackLockfile(resolution, hasher);

  for (const artifact of [...generatedArtifacts, lockfile]) {
    const path = normalizePath(artifact.path);
    if (path === MANIFEST_PATH) {
      continue;
    }
    if (desired.has(path)) {
      diagnostics.push({
        id: "sync/duplicate-generated-path",
        severity: "error",
        message: `More than one generated artifact targets ${path}.`,
        evidence: [{ path, reason: "duplicate generated path" }],
      });
      continue;
    }
    desired.set(path, { ...artifact, path });
  }

  const actions: SynchronizationAction[] = [];
  const nextManaged = new Map<string, ManagedArtifact>();

  for (const artifact of desired.values()) {
    if (!isSafeRelativePath(artifact.path)) {
      actions.push(blockedAction(artifact, "path escapes the repository boundary"));
      diagnostics.push({
        id: "sync/unsafe-generated-path",
        severity: "error",
        message: `Generated artifact path ${artifact.path} is unsafe.`,
        evidence: [{ path: artifact.path, reason: "repository boundary violation" }],
      });
      continue;
    }

    const previous = previousArtifacts.get(artifact.path);
    if (!repositoryFiles.has(artifact.path)) {
      actions.push({
        path: artifact.path,
        purpose: artifact.purpose,
        kind: "create",
        content: artifact.content,
      });
      nextManaged.set(artifact.path, managedArtifact(artifact, hasher));
      continue;
    }
    if (!previous) {
      actions.push(blockedAction(artifact, "existing file is not owned by AdrenAI"));
      diagnostics.push({
        id: "sync/unmanaged-file-conflict",
        severity: "error",
        message: `Existing file ${artifact.path} is not owned by AdrenAI.`,
        evidence: [{ path: artifact.path, reason: "would require overwriting user-owned content" }],
      });
      continue;
    }

    try {
      const currentContent = await fileSystem.readText(root, artifact.path);
      const currentHash = hasher.hash(currentContent);
      if (currentHash !== previous.contentHash) {
        actions.push(blockedAction(artifact, "managed file contains user changes"));
        diagnostics.push({
          id: "sync/managed-file-drift",
          severity: "error",
          message: `Managed file ${artifact.path} contains changes that would be overwritten.`,
          evidence: [{ path: artifact.path, reason: "content differs from ownership manifest" }],
        });
        continue;
      }
      const kind = currentContent === artifact.content ? "unchanged" : "update";
      actions.push({
        path: artifact.path,
        purpose: artifact.purpose,
        kind,
        content: artifact.content,
        expectedContentHash: currentHash,
      });
      nextManaged.set(artifact.path, managedArtifact(artifact, hasher));
    } catch {
      actions.push(blockedAction(artifact, "managed file is unreadable"));
      diagnostics.push({
        id: "sync/unreadable-managed-file",
        severity: "error",
        message: `Managed file ${artifact.path} could not be read.`,
        evidence: [{ path: artifact.path, reason: "read failed" }],
      });
    }
  }

  for (const previous of previousArtifacts.values()) {
    const path = normalizePath(previous.path);
    if (desired.has(path)) {
      continue;
    }
    if (!isSafeRelativePath(path)) {
      actions.push({
        path,
        purpose: previous.purpose,
        kind: "blocked",
        reason: "ownership manifest contains an unsafe artifact path",
      });
      diagnostics.push({
        id: "sync/unsafe-managed-path",
        severity: "error",
        message: `Managed artifact path ${path} is unsafe.`,
        evidence: [{ path: MANIFEST_PATH, reason: `unsafe managed path ${path}` }],
      });
      continue;
    }
    actions.push({
      path,
      purpose: previous.purpose,
      kind: "preserve",
      expectedContentHash: previous.contentHash,
      reason: "previously managed artifact is no longer generated and will not be deleted",
    });
    nextManaged.set(path, { ...previous, path });
    diagnostics.push({
      id: "sync/stale-managed-file",
      severity: "warning",
      message: `Previously managed file ${path} is no longer generated and will be preserved.`,
      evidence: [{ path, reason: "safe synchronization never deletes stale artifacts" }],
    });
  }

  const manifest: GenerationManifest = {
    version: 1,
    artifacts: [...nextManaged.values()].sort((left, right) => compareText(left.path, right.path)),
  };
  const manifestContent = stableJson(manifest);
  if (manifestRead.diagnostic) {
    actions.push({
      path: MANIFEST_PATH,
      purpose: "AdrenAI managed-artifact ownership and drift manifest.",
      kind: "blocked",
      reason: "existing ownership manifest is invalid",
    });
  } else if (!repositoryFiles.has(MANIFEST_PATH)) {
    actions.push({
      path: MANIFEST_PATH,
      purpose: "AdrenAI managed-artifact ownership and drift manifest.",
      kind: "create",
      content: manifestContent,
    });
  } else {
    const currentManifest = await fileSystem.readText(root, MANIFEST_PATH);
    actions.push({
      path: MANIFEST_PATH,
      purpose: "AdrenAI managed-artifact ownership and drift manifest.",
      kind: currentManifest === manifestContent ? "unchanged" : "update",
      content: manifestContent,
      expectedContentHash: hasher.hash(currentManifest),
    });
  }

  return {
    root,
    canApply:
      !actions.some(({ kind }) => kind === "blocked") &&
      !diagnostics.some(({ severity }) => severity === "error"),
    actions,
    diagnostics,
    manifest,
  };
}

async function assertPlanStillSafe(
  plan: SynchronizationPlan,
  fileSystem: SynchronizationFileSystem,
  hasher: SynchronizationHasher,
): Promise<void> {
  const files = new Set((await fileSystem.listFiles(plan.root)).map(normalizePath));
  for (const action of plan.actions) {
    if (action.kind === "create" && files.has(action.path)) {
      throw new Error(`Synchronization aborted because ${action.path} was created after preview.`);
    }
    if (
      (action.kind === "update" || action.kind === "unchanged") &&
      action.expectedContentHash !== undefined
    ) {
      const current = await fileSystem.readText(plan.root, action.path);
      if (hasher.hash(current) !== action.expectedContentHash) {
        throw new Error(`Synchronization aborted because ${action.path} changed after preview.`);
      }
    }
  }
}

export async function applySynchronization(
  plan: SynchronizationPlan,
  fileSystem: SynchronizationFileSystem,
  hasher: SynchronizationHasher,
): Promise<SynchronizationResult> {
  if (!plan.canApply || plan.actions.some(({ kind }) => kind === "blocked")) {
    throw new Error("Synchronization plan contains blocked changes.");
  }
  await assertPlanStillSafe(plan, fileSystem, hasher);

  const written: string[] = [];
  const writable = plan.actions.filter(
    (action) => action.kind === "create" || action.kind === "update",
  );
  const manifest = writable.find(({ path }) => path === MANIFEST_PATH);
  for (const action of writable.filter(({ path }) => path !== MANIFEST_PATH)) {
    await fileSystem.writeText(plan.root, action.path, action.content ?? "");
    written.push(action.path);
  }
  if (manifest) {
    await fileSystem.writeText(plan.root, manifest.path, manifest.content ?? "");
    written.push(manifest.path);
  }

  return {
    written,
    unchanged: plan.actions
      .filter(({ kind }) => kind === "unchanged")
      .map(({ path }) => path),
    preserved: plan.actions
      .filter(({ kind }) => kind === "preserve")
      .map(({ path }) => path),
  };
}
