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
  planQualityGates,
  planSynchronization,
  recommendRepository,
  resolveRecommendedPacks,
  validateLockedConfiguration,
} from "@adrenai/application";
import type { DoctorReport, RepositoryInspection, RepositoryRecommendation } from "@adrenai/domain";
import {
  applyArtifacts,
  NodeRepositoryFileSystem,
  runQualityGatePlans,
  Sha256ContentHasher,
} from "@adrenai/infrastructure";
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
  if (command === "packs") {
    const catalog = await loadPackCatalog(catalogRoot, fileSystem);
    console.log(parsed.json ? JSON.stringify(catalog, null, 2) : formatCatalog(catalog));
    if (catalog.diagnostics.some(({ severity }) => severity === "error")) {
      process.exitCode = 1;
    }
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
      strategies: resolution.resolved.map((pack) => ({
        id: pack.id,
        title: pack.title,
        category: pack.type,
        confidence: recommendationById.get(pack.id)?.confidence ?? "medium",
        reasons: [recommendationById.get(pack.id)?.reason ?? pack.description],
        conflicts: pack.conflicts,
        prerequisites: pack.requires,
        outputs: pack.checks,
      })),
      questionLines: [
        "No material unresolved questions for the current deterministic recommendation.",
      ],
      workflowLines: [
        "1. Review detected context and suggested strategies",
        "2. Review generated guidance and required gates",
        "3. Approve effects through sync/apply",
        `Gates: ${resolution.resolved.flatMap(({ checks }) => checks).join(", ") || "none"}`,
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
