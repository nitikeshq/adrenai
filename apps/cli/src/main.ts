#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import packageMetadata from "../../../package.json" with { type: "json" };
import {
  applySynchronization,
  doctorRepository,
  detectManagedDrift,
  evaluateQualityGateResults,
  generateManagedSetup,
  inspectRepository,
  loadPackCatalog,
  loadPlatformCatalog,
  resolveCatalogPolicies,
  createSession,
  diagnoseSessionAlignment,
  hashSessionContext,
  transitionSession,
  detectAiProviderEnvironments,
  detectInstalledAgentEnvironments,
  previewAiRequest,
  redactAiContent,
  planQualityGates,
  planSynchronization,
  recommendRepository,
  resolveRecommendedPacks,
  validateLockedConfiguration,
} from "@adrenai/application";
import { planWorkflow, type DoctorReport, type RepositoryInspection, type RepositoryRecommendation, type SessionManifest } from "@adrenai/domain";
import {
  applyArtifacts,
  NodeRepositoryFileSystem,
  runQualityGatePlans,
  Sha256ContentHasher,
} from "@adrenai/infrastructure";
import {
  createRegistryLockfile,
  previewRegistryUpdate,
  quarantineExternalSkill,
  validateRegistry,
  type RegistryEntry,
} from "@adrenai/sdk";
import {
  formatApplyResult,
  formatArtifacts,
  formatCatalog,
  formatDoctorReport,
  formatDriftReport,
  formatDiagnostics,
  formatQualityGateEvaluation,
  formatQualityGatePlan,
  formatInspection,
  formatOnboarding,
  formatRecommendation,
  formatSynchronizationPlan,
  formatSynchronizationResult,
} from "./presentation.js";
import { parseArguments } from "./arguments.js";
import { runInteractiveTui, type TuiModel } from "./tui.js";

function printHelp(): void {
  console.log(`AdrenAI

Usage:
  adrenai onboard [path] [--json]
  adrenai inspect [path] [--json]
  adrenai recommend [path] [--json]
  adrenai apply [path] [--write] [--agents=codex,claude-code,cursor]
  adrenai doctor [path] [--json]
  adrenai packs [--json]
  adrenai strategies [--category=design/visual-system] [--json]
  adrenai workflows [--json]
  adrenai workflow-plan [--workflow=design/interface-delivery] [--category=design/visual-system] [--json]
  adrenai session-start [path] --workflow=design/interface-delivery --session=my-session [--write] [--json]
  adrenai session-status [path] --session=my-session [--json]
  adrenai session-action [path] --session=my-session --action=pause|resume|handoff|complete [--write] [--json]
  adrenai ai-status [path] [--json]
  adrenai ai-preview [path] --capability=summarize --content="text" [--json]
  adrenai registry-list [path] --registry=registry.json [--json]
  adrenai registry-import [path] --source=skill.md [--write] [--json]
  adrenai registry-update-preview [path] --registry=current.json --next=next.json [--json]
  adrenai drift [path] [--json]
  adrenai validate [path] [--json]
  adrenai sync [path] [--write] [--agents=codex,claude-code,cursor]
  adrenai check [path] [--run] [--json]
  adrenai tui [path] [--json]
  adrenai --help
`);
}

async function main(): Promise<void> {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.version) {
    console.log(packageMetadata.version);
    return;
  }
  if (parsed.help) {
    printHelp();
    return;
  }

  const command = parsed.command ?? "onboard";
  const root = resolve(parsed.path);
  const fileSystem = new NodeRepositoryFileSystem();
  const hasher = new Sha256ContentHasher();
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const catalogRoot = [
    resolve(moduleDirectory, "../catalog/packs"),
    resolve(moduleDirectory, "../../../catalog/packs"),
  ].find(existsSync);
  if (!catalogRoot) {
    throw new Error("Built-in pack catalog could not be located.");
  }
  const platformRoot = resolve(catalogRoot, "..");
  const loadPlatform = () => loadPlatformCatalog(platformRoot, fileSystem);
  const registryCrypto = {
    checksum: (content: string) => hasher.hash(content),
    verifySignature: () => false,
  };
  if (command === "packs") {
    const catalog = await loadPackCatalog(catalogRoot, fileSystem);
    console.log(parsed.json ? JSON.stringify(catalog, null, 2) : formatCatalog(catalog));
    if (catalog.diagnostics.some(({ severity }) => severity === "error")) {
      process.exitCode = 1;
    }
    return;
  }
  if (command === "strategies") {
    const catalog = await loadPlatform();
    const strategies = catalog.strategies.filter(({ categoryId }) => !parsed.category || categoryId === parsed.category);
    const output = { category: parsed.category, strategies, diagnostics: catalog.diagnostics };
    console.log(parsed.json ? JSON.stringify(output, null, 2) : strategies.map(({ id, title, categoryId }) => `${id} | ${categoryId} | ${title}`).join("\n"));
    if (catalog.diagnostics.some(({ severity }) => severity === "error")) process.exitCode = 1;
    return;
  }
  if (command === "workflows") {
    const catalog = await loadPlatform();
    console.log(parsed.json ? JSON.stringify(catalog.workflows, null, 2) : catalog.workflows.map(({ id, title }) => `${id} | ${title}`).join("\n"));
    if (catalog.diagnostics.some(({ severity }) => severity === "error")) process.exitCode = 1;
    return;
  }
  if (command === "ai-status") {
    const files = await fileSystem.listFiles(root);
    const output = {
      installedAgents: detectInstalledAgentEnvironments(files.map((path) => path.replaceAll("\\", "/"))),
      availableProviders: detectAiProviderEnvironments(Object.keys(process.env)),
      note: "Provider availability requires a provider environment key; agent configuration alone is not a provider.",
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  if (command === "ai-preview") {
    if (!parsed.capability || parsed.content === undefined) throw new Error("ai-preview requires --capability=<id> and --content=<text>.");
    const provider = detectAiProviderEnvironments(Object.keys(process.env))[0] ?? {
      id: "offline-preview", title: "Offline preview only",
      capabilities: ["summarize", "gap-analysis", "custom-strategy"] as const,
      detectionEvidence: ["no provider available; nothing will be transmitted"],
    };
    const preview = previewAiRequest(provider, parsed.capability, parsed.content, "Use deterministic offline selection and templates.");
    console.log(JSON.stringify({ preview, transmission: "none", nextStep: "Integrate an explicitly consented provider adapter to execute." }, null, 2));
    return;
  }
  if (command === "registry-list") {
    if (!parsed.registry) throw new Error("registry-list requires --registry=<path>.");
    const value = JSON.parse(await fileSystem.readText(root, parsed.registry)) as unknown;
    const candidates = Array.isArray(value) ? value : (value as { entries?: unknown[] }).entries;
    if (!Array.isArray(candidates)) throw new Error("Registry must be an entry array or an object containing entries.");
    const embedded = candidates.filter((entry): entry is RegistryEntry => typeof entry === "object" && entry !== null && "bundle" in entry);
    const validation = validateRegistry(embedded, registryCrypto);
    console.log(JSON.stringify({
      entries: candidates,
      embeddedEntryCount: embedded.length,
      lockfile: createRegistryLockfile(embedded),
      diagnostics: validation.diagnostics,
      note: embedded.length === candidates.length ? "All entries validated." : "Index descriptors listed; import referenced bundles separately before validation.",
    }, null, 2));
    if (!validation.valid) process.exitCode = 1;
    return;
  }
  if (command === "registry-import") {
    if (!parsed.source) throw new Error("registry-import requires --source=<path>.");
    const raw = await fileSystem.readText(root, parsed.source);
    const redacted = redactAiContent(raw);
    const item = quarantineExternalSkill(redacted.content, {
      sourceUrl: parsed.source, sourceType: "local", publisher: "local-user",
      importedAt: new Date().toISOString(),
    }, registryCrypto);
    const path = `.adrenai/registry/quarantine/${item.checksum}.json`;
    if (parsed.write) await fileSystem.writeText(root, path, `${JSON.stringify(item, null, 2)}\n`);
    console.log(JSON.stringify({ preview: !parsed.write, path, redactions: redacted.redactions, quarantine: item }, null, 2));
    return;
  }
  if (command === "registry-update-preview") {
    if (!parsed.registry || !parsed.next) throw new Error("registry-update-preview requires --registry=<current-entry> and --next=<next-entry>.");
    const current = JSON.parse(await fileSystem.readText(root, parsed.registry)) as RegistryEntry;
    const next = JSON.parse(await fileSystem.readText(root, parsed.next)) as RegistryEntry;
    console.log(JSON.stringify(previewRegistryUpdate(current, next), null, 2));
    return;
  }
  if (command === "workflow-plan") {
    if (!parsed.workflow) throw new Error("workflow-plan requires --workflow=<id>.");
    const catalog = await loadPlatform();
    const workflow = catalog.workflows.find(({ id }) => id === parsed.workflow);
    if (!workflow) throw new Error(`Unknown workflow: ${parsed.workflow}`);
    const policy = resolveCatalogPolicies(catalog, parsed.category);
    const output = { workflow: planWorkflow(workflow), mandatoryPolicyGateIds: policy.mandatoryGateIds, policyDiagnostics: policy.diagnostics };
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  if (["session-start", "session-status", "session-action"].includes(command)) {
    if (!parsed.session) throw new Error(`${command} requires --session=<id>.`);
    const relativePath = `.adrenai/sessions/${parsed.session}/session.json`;
    if (command === "session-status") {
      const manifest = JSON.parse(await fileSystem.readText(root, relativePath)) as SessionManifest;
      const inspection = await inspectRepository(root, fileSystem);
      const report = diagnoseSessionAlignment(manifest, {
        workflowId: manifest.workflowId,
        workflowVersion: manifest.workflowVersion,
        currentPhaseId: manifest.currentPhaseId,
        contextHash: hashSessionContext({ inspection, workflowId: manifest.workflowId, workflowVersion: manifest.workflowVersion, currentPhaseId: manifest.currentPhaseId }, hasher),
      });
      console.log(JSON.stringify({ manifest, report }, null, 2));
      if (!report.aligned) process.exitCode = 1;
      return;
    }
    if (command === "session-action") {
      if (!parsed.action) throw new Error("session-action requires --action=pause|resume|handoff|complete.");
      const manifest = JSON.parse(await fileSystem.readText(root, relativePath)) as SessionManifest;
      const unknownGates = (parsed.gates ?? []).filter((gate) => !manifest.requiredGateIds.includes(gate));
      if (unknownGates.length > 0) throw new Error(`Session does not require gate(s): ${unknownGates.join(", ")}.`);
      const withGates = { ...manifest, completedGateIds: [...new Set([...manifest.completedGateIds, ...(parsed.gates ?? [])])].sort() };
      const updated = transitionSession(withGates, parsed.action);
      if (parsed.write) await fileSystem.writeText(root, relativePath, `${JSON.stringify(updated, null, 2)}\n`);
      console.log(JSON.stringify({ preview: !parsed.write, manifest: updated }, null, 2));
      return;
    }
    if (!parsed.workflow) throw new Error("session-start requires --workflow=<id>.");
    const catalog = await loadPlatform();
    const workflow = catalog.workflows.find(({ id }) => id === parsed.workflow);
    if (!workflow) throw new Error(`Unknown workflow: ${parsed.workflow}`);
    const inspection = await inspectRepository(root, fileSystem);
    const policy = resolveCatalogPolicies(catalog, parsed.category);
    const firstPhaseId = planWorkflow(workflow).orderedPhaseIds[0];
    if (!firstPhaseId) throw new Error(`Workflow ${workflow.id} has no active phases.`);
    const generation = createSession({
      id: parsed.session,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      currentPhaseId: firstPhaseId,
      decisions: {},
      activeGuidance: policy.rules.map(({ statement }) => statement),
      targetAgents: inspection.agents.length > 0 ? inspection.agents.map(({ agent }) => agent) : ["generic"],
      requiredGateIds: [...new Set([...planWorkflow(workflow).gateIds, ...policy.mandatoryGateIds])],
      completedGateIds: [],
      context: { inspection, workflowId: workflow.id, workflowVersion: workflow.version, currentPhaseId: firstPhaseId },
    }, hasher);
    if (parsed.write) await applyArtifacts(root, generation.artifacts);
    console.log(JSON.stringify({ preview: !parsed.write, generation }, null, 2));
    return;
  }
  if (command === "drift") {
    const report = await detectManagedDrift(root, fileSystem, hasher);
    console.log(parsed.json ? JSON.stringify(report, null, 2) : formatDriftReport(report));
    if (report.diagnostics.some(({ severity }) => severity !== "info")) {
      process.exitCode = 1;
    }
    return;
  }
  if (command === "validate") {
    const catalog = await loadPackCatalog(catalogRoot, fileSystem);
    const diagnostics = [
      ...catalog.diagnostics,
      ...(catalog.diagnostics.some(({ severity }) => severity === "error")
        ? []
        : await validateLockedConfiguration(root, catalog.packs, fileSystem, hasher)),
    ];
    console.log(
      parsed.json
        ? JSON.stringify({ root, diagnostics }, null, 2)
        : formatDiagnostics("Configuration validation:", diagnostics),
    );
    if (diagnostics.some(({ severity }) => severity === "error")) {
      process.exitCode = 1;
    }
    return;
  }
  const inspection = await inspectRepository(root, fileSystem);
  const resolveSetup = async () => {
    const catalog = await loadPackCatalog(catalogRoot, fileSystem);
    const recommendation = recommendRepository(inspection);
    const resolution = resolveRecommendedPacks(inspection, catalog.packs, recommendation);
    const blockingDiagnostics = [...catalog.diagnostics, ...resolution.diagnostics].filter(
      ({ severity }) => severity === "error",
    );
    if (blockingDiagnostics.length > 0) {
      throw new Error(
        `Cannot resolve setup:\n${blockingDiagnostics.map(({ message }) => `- ${message}`).join("\n")}`,
      );
    }
    return { recommendation, resolution };
  };
  if (command === "onboard") {
    const { recommendation, resolution } = await resolveSetup();
    const summary = {
      inspection,
      recommendation,
      resolvedPacks: resolution.resolved.map(({ id }) => id),
    };
    console.log(parsed.json ? JSON.stringify(summary, null, 2) : formatOnboarding(summary));
    return;
  }
  if (command === "tui") {
    const { recommendation, resolution } = await resolveSetup();
    const platform = await loadPlatform();
    const artifacts = generateManagedSetup(inspection, recommendation, resolution, hasher);
    const recommendationById = new Map(
      recommendation.recommendations.map((item) => [item.id, item]),
    );
    const model: TuiModel = {
      screen: "context",
      query: "",
      cursor: 0,
      selectedIds: resolution.requested,
      cancelled: false,
      approvalRequested: false,
      contextLines: [
        `Repository: ${inspection.root}`,
        `Technologies: ${inspection.technologies.map(({ id }) => id).join(", ") || "none"}`,
        `Agents: ${inspection.agents.map(({ agent }) => agent).join(", ") || "none"}`,
        `Profile: ${recommendation.profile}`,
      ],
      strategies: [
        ...resolution.resolved.map((pack) => ({
        id: pack.id,
        title: pack.title,
        category: pack.type,
        confidence: recommendationById.get(pack.id)?.confidence ?? "medium",
        reasons: [recommendationById.get(pack.id)?.reason ?? pack.description],
        conflicts: pack.conflicts,
        prerequisites: pack.requires,
        outputs: pack.checks,
        })),
        ...platform.strategies.map((strategy) => ({
          id: strategy.id, title: strategy.title, category: strategy.categoryId,
          confidence: "medium" as const, reasons: [strategy.description], conflicts: strategy.conflicts,
          prerequisites: strategy.prerequisites, outputs: strategy.deliverableIds,
        })),
      ],
      questionLines: [
        "No material unresolved questions for the current deterministic recommendation.",
      ],
      workflowLines: [
        "1. Review detected context and suggested strategies",
        "2. Review generated guidance and required gates",
        "3. Approve effects through sync/apply",
        `Gates: ${resolution.resolved.flatMap(({ checks }) => checks).join(", ") || "none"}`,
        `Available workflows: ${platform.workflows.map(({ id }) => id).join(", ")}`,
      ],
      fileChangeLines: artifacts.map(({ path }) => `create or synchronize ${path}`),
      diagnostics: resolution.diagnostics,
    };
    if (parsed.json) {
      console.log(JSON.stringify(model, null, 2));
    } else {
      await runInteractiveTui(model);
    }
    return;
  }
  if (command === "apply") {
    const { recommendation, resolution } = await resolveSetup();
    const artifacts = generateManagedSetup(
      inspection,
      recommendation,
      resolution,
      hasher,
      parsed.agents,
    );
    if (parsed.write) {
      const result = await applyArtifacts(root, artifacts);
      console.log(parsed.json ? JSON.stringify(result, null, 2) : formatApplyResult(result));
    } else {
      console.log(parsed.json ? JSON.stringify(artifacts, null, 2) : formatArtifacts(artifacts));
    }
    return;
  }
  if (command === "sync") {
    const { recommendation, resolution } = await resolveSetup();
    const artifacts = generateManagedSetup(
      inspection,
      recommendation,
      resolution,
      hasher,
      parsed.agents,
    );
    const plan = await planSynchronization(root, artifacts, resolution, fileSystem, hasher);
    if (parsed.write) {
      const result = await applySynchronization(plan, fileSystem, hasher);
      console.log(
        parsed.json ? JSON.stringify(result, null, 2) : formatSynchronizationResult(result),
      );
    } else {
      console.log(parsed.json ? JSON.stringify(plan, null, 2) : formatSynchronizationPlan(plan));
      if (!plan.canApply) {
        process.exitCode = 1;
      }
    }
    return;
  }
  if (command === "check") {
    const { resolution } = await resolveSetup();
    let scripts: string[] = [];
    let scriptCommands: Record<string, string> = {};
    try {
      const packageJson = JSON.parse(await fileSystem.readText(root, "package.json")) as {
        scripts?: Record<string, string>;
      };
      scriptCommands = packageJson.scripts ?? {};
      scripts = Object.keys(scriptCommands);
    } catch {
      // Non-Node repositories are supported; other runners are added through future check adapters.
    }
    const planning = planQualityGates(inspection, resolution, {
      packageScripts: scripts,
      packageScriptCommands: scriptCommands,
    });
    if (!parsed.run) {
      console.log(
        parsed.json ? JSON.stringify(planning, null, 2) : formatQualityGatePlan(planning),
      );
      return;
    }
    const evaluation = evaluateQualityGateResults(
      planning.plans,
      await runQualityGatePlans(root, planning.plans),
    );
    console.log(
      parsed.json ? JSON.stringify(evaluation, null, 2) : formatQualityGateEvaluation(evaluation),
    );
    if (evaluation.status !== "passed") {
      process.exitCode = 1;
    }
    return;
  }

  const output =
    command === "recommend"
      ? recommendRepository(inspection)
      : command === "doctor"
        ? await doctorRepository(inspection, fileSystem)
        : inspection;

  if (parsed.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(
      command === "recommend"
        ? formatRecommendation(output as RepositoryRecommendation)
        : command === "doctor"
          ? formatDoctorReport(output as DoctorReport)
        : formatInspection(output as RepositoryInspection),
    );
  }
  if (
    command === "doctor" &&
    (output as DoctorReport).diagnostics.some(({ severity }) => severity === "error")
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
