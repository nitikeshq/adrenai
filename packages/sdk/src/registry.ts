import type { Diagnostic, Strategy } from "@adrenai/domain";
import type { ContributionBundle } from "./index.js";
import { validateContributionBundle } from "./index.js";

export type RegistryTrust = "unreviewed" | "community-reviewed" | "maintainer-reviewed";
export type ModerationStatus = "pending" | "approved" | "rejected" | "takedown";

export interface RegistryProvenance {
  sourceUrl: string;
  sourceType: "local" | "offline-bundle" | "skills-sh" | "registry";
  publisher: string;
  importedAt: string;
}

export interface RegistryEntry {
  id: string;
  version: string;
  license: string;
  compatibility: { adrenai: string };
  provenance: RegistryProvenance;
  trust: RegistryTrust;
  moderation: ModerationStatus;
  checksum: string;
  signature?: string;
  dependencies: Array<{ id: string; version: string; checksum: string }>;
  bundle: ContributionBundle;
}

export interface RegistryLockfile {
  schemaVersion: 1;
  entries: Array<{ id: string; version: string; checksum: string; dependencies: RegistryEntry["dependencies"] }>;
}

export interface QuarantinedImport {
  source: RegistryProvenance;
  rawContent: string;
  checksum: string;
  reviewed: false;
  executable: false;
}

export interface RegistryCrypto {
  checksum(content: string): string;
  verifySignature(content: string, signature: string, publisher: string): boolean;
}

export interface UpdatePreview {
  id: string;
  fromVersion: string;
  toVersion: string;
  checksumChanged: boolean;
  dependencyChanges: string[];
  moderationChanged: boolean;
  requiresApproval: true;
}

function diagnostic(id: string, message: string, path: string, reason: string): Diagnostic {
  return { id, severity: "error", message, evidence: [{ path, reason }] };
}

export function quarantineExternalSkill(
  rawContent: string,
  source: RegistryProvenance,
  crypto: RegistryCrypto,
): QuarantinedImport {
  return {
    source,
    rawContent,
    checksum: crypto.checksum(rawContent),
    reviewed: false,
    executable: false,
  };
}

function plainGuidance(rawContent: string): string[] {
  return rawContent.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/);
    const text = match?.[1]?.trim();
    if (
      !text ||
      /(?:curl|wget)\s+.+\|\s*(?:sh|bash)|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text)
    ) return [];
    return [text];
  });
}

export function normalizeQuarantinedSkill(
  item: QuarantinedImport,
  options: {
    namespace: string;
    strategyName: string;
    categoryId: string;
    license: string;
  },
): { strategy: Strategy; guidance: string[]; reviewed: false } {
  const guidance = plainGuidance(item.rawContent);
  return {
    strategy: {
      id: `${options.namespace}/${options.strategyName}`,
      version: "0.1.0",
      title: options.strategyName.replaceAll("-", " "),
      description: `Quarantined import normalized from ${item.source.sourceType}.`,
      categoryId: options.categoryId,
      capabilityIds: [],
      constraintIds: [],
      deliverableIds: [],
      audienceIds: [],
      prerequisites: [],
      conflicts: [],
      compatibleWith: [],
      evidence: [{ source: item.source.sourceUrl, summary: "External source pending review." }],
      maturity: "experimental",
      license: options.license,
      risk: "high",
    },
    guidance,
    reviewed: false,
  };
}

export function validateRegistryEntry(
  entry: RegistryEntry,
  crypto: RegistryCrypto,
  adrenaiVersion = "0.1.0",
): { valid: boolean; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const content = JSON.stringify(entry.bundle);
  if (crypto.checksum(content) !== entry.checksum) {
    diagnostics.push(diagnostic("registry/checksum-mismatch", `Registry entry ${entry.id} checksum does not match.`, entry.id, "supply-chain verification"));
  }
  if (entry.signature && !crypto.verifySignature(content, entry.signature, entry.provenance.publisher)) {
    diagnostics.push(diagnostic("registry/signature-invalid", `Registry entry ${entry.id} signature is invalid.`, entry.id, "signature verification"));
  }
  if (entry.moderation !== "approved") {
    diagnostics.push(diagnostic("registry/not-approved", `Registry entry ${entry.id} is not approved for installation.`, entry.id, `moderation status ${entry.moderation}`));
  }
  const minimum = entry.compatibility.adrenai.match(/^>=([0-9]+\.[0-9]+\.[0-9]+)$/)?.[1];
  if (!minimum || compareVersions(adrenaiVersion, minimum) < 0) {
    diagnostics.push(diagnostic("registry/incompatible-version", `Registry entry ${entry.id} is incompatible with AdrenAI ${adrenaiVersion}.`, entry.compatibility.adrenai, "compatibility check"));
  }
  const validation = validateContributionBundle(entry.bundle);
  diagnostics.push(...validation.diagnostics);
  const locked = new Set(entry.dependencies.map(({ id }) => id));
  for (const pack of entry.bundle.packs) {
    for (const dependency of pack.requires) {
      if (!entry.bundle.packs.some(({ id }) => id === dependency) && !locked.has(dependency)) {
        diagnostics.push(diagnostic("registry/unlocked-dependency", `Dependency ${dependency} is not locked.`, dependency, "dependency locking"));
      }
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

function compareVersions(left: string, right: string): number {
  const parts = (version: string) => version.split(".").map(Number);
  const leftParts = parts(left);
  const rightParts = parts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function validateRegistry(entries: RegistryEntry[], crypto: RegistryCrypto, adrenaiVersion = "0.1.0"): {
  valid: boolean;
  diagnostics: Diagnostic[];
} {
  const diagnostics = entries.flatMap((entry) =>
    validateRegistryEntry(entry, crypto, adrenaiVersion).diagnostics,
  );
  const identities = new Set<string>();
  for (const entry of entries) {
    const identity = `${entry.id}@${entry.version}`;
    if (identities.has(identity)) diagnostics.push(diagnostic("registry/duplicate-entry", `Registry entry ${identity} is declared more than once.`, identity, "registry conflict"));
    identities.add(identity);
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export function createRegistryLockfile(entries: RegistryEntry[]): RegistryLockfile {
  return {
    schemaVersion: 1,
    entries: [...entries]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, version, checksum, dependencies }) => ({
        id,
        version,
        checksum,
        dependencies: [...dependencies].sort((left, right) => left.id.localeCompare(right.id)),
      })),
  };
}

export function previewRegistryUpdate(current: RegistryEntry, next: RegistryEntry): UpdatePreview {
  const dependency = (entry: RegistryEntry) =>
    new Set(entry.dependencies.map(({ id, version, checksum }) => `${id}@${version}:${checksum}`));
  const before = dependency(current);
  const after = dependency(next);
  return {
    id: current.id,
    fromVersion: current.version,
    toVersion: next.version,
    checksumChanged: current.checksum !== next.checksum,
    dependencyChanges: [
      ...[...before].filter((value) => !after.has(value)).map((value) => `remove ${value}`),
      ...[...after].filter((value) => !before.has(value)).map((value) => `add ${value}`),
    ].sort(),
    moderationChanged: current.moderation !== next.moderation,
    requiresApproval: true,
  };
}
