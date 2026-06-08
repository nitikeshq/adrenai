import type {
  ApplyResult,
  DriftReport,
  DoctorReport,
  GeneratedArtifact,
  RepositoryInspection,
  RepositoryRecommendation,
} from "@adrenai/domain";

export interface OnboardingSummary {
  inspection: RepositoryInspection;
  recommendation: RepositoryRecommendation;
  resolvedPacks: string[];
}

export function formatOnboarding(summary: OnboardingSummary): string {
  const technologies = summary.inspection.technologies.map(({ id }) => id);
  const agents = summary.inspection.agents.map(({ agent }) => agent);
  const agentArgument = agents.length > 0 ? ` --agents=${agents.join(",")}` : "";
  const lines = [
    "AdrenAI onboarding",
    `Repository: ${summary.inspection.root}`,
    "",
    "Detected:",
    technologies.length > 0
      ? `  Technologies: ${technologies.join(", ")}`
      : "  Technologies: no supported technologies detected",
    agents.length > 0
      ? `  Existing agent configs: ${agents.join(", ")}`
      : "  Existing agent configs: none detected",
    "",
    `Recommended profile: ${summary.recommendation.profile}`,
    `Resolved guidance packs: ${summary.resolvedPacks.length}`,
    ...summary.resolvedPacks.map((id) => `  - ${id}`),
    "",
    "Next steps:",
    `  Preview:  adrenai sync .${agentArgument}`,
    `  Apply:    adrenai sync . --write${agentArgument}`,
    "  Validate: adrenai validate .",
    "  Run gates: adrenai check . --run",
    "",
    "No files written. No AI provider or credits used.",
  ];
  return lines.join("\n");
}
import type { CatalogLoadResult } from "@adrenai/application";
import type {
  QualityGateEvaluation,
  QualityGatePlanningResult,
  SynchronizationPlan,
  SynchronizationResult,
} from "@adrenai/application";

export function formatInspection(inspection: RepositoryInspection): string {
  const lines = [`Repository: ${inspection.root}`, "", "Technologies:"];
  if (inspection.technologies.length === 0) {
    lines.push("  No supported technologies detected.");
  }
  for (const item of inspection.technologies) {
    lines.push(`  - ${item.id} (${item.kind})`);
  }

  lines.push("", "Agent configurations:");
  if (inspection.agents.length === 0) {
    lines.push("  No supported agent configuration detected.");
    lines.push("  Run `adrenai recommend` to review a portable setup.");
  }
  for (const agent of inspection.agents) {
    lines.push(`  - ${agent.agent}`);
    for (const file of agent.configurationFiles) {
      lines.push(`      config: ${file}`);
    }
    for (const file of agent.skillFiles) {
      lines.push(`      skill:  ${file}`);
    }
  }
  return lines.join("\n");
}

export function formatRecommendation(recommendation: RepositoryRecommendation): string {
  const lines = [
    `Repository: ${recommendation.root}`,
    `Recommended profile: ${recommendation.profile}`,
    "",
    "Recommendations:",
  ];
  for (const item of recommendation.recommendations) {
    lines.push(`  - ${item.title} [${item.confidence}]`);
    lines.push(`    ${item.reason}`);
    for (const action of item.proposedActions) {
      lines.push(`      + ${action}`);
    }
  }
  return lines.join("\n");
}

export function formatArtifacts(artifacts: GeneratedArtifact[]): string {
  const lines = ["Generated setup preview:"];
  for (const artifact of artifacts) {
    lines.push("", `--- ${artifact.path}`, `Purpose: ${artifact.purpose}`, "", artifact.content.trimEnd());
  }
  lines.push("", "No files written. Run with `--write` to create missing files.");
  return lines.join("\n");
}

export function formatApplyResult(result: ApplyResult): string {
  const lines = ["Apply result:"];
  for (const path of result.written) {
    lines.push(`  + created ${path}`);
  }
  for (const path of result.skipped) {
    lines.push(`  ! skipped existing ${path}`);
  }
  return lines.join("\n");
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = [
    `Repository: ${report.root}`,
    `Extracted requirements: ${report.requirements.length}`,
    `Estimated instruction tokens: ${report.estimatedInstructionTokens}`,
    "",
    "Diagnostics:",
  ];
  if (report.diagnostics.length === 0) {
    lines.push("  No instruction diagnostics found.");
  }
  for (const diagnostic of report.diagnostics) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.message}`);
    for (const evidence of diagnostic.evidence) {
      lines.push(`      ${evidence.path}: ${evidence.reason}`);
    }
  }
  return lines.join("\n");
}

export function formatCatalog(result: CatalogLoadResult): string {
  const lines = [`Validated packs: ${result.packs.length}`, "", "Packs:"];
  for (const pack of result.packs) {
    lines.push(`  - ${pack.id}@${pack.version} (${pack.type})`);
  }
  lines.push("", "Diagnostics:");
  if (result.diagnostics.length === 0) {
    lines.push("  No catalog diagnostics found.");
  }
  for (const diagnostic of result.diagnostics) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.message}`);
  }
  return lines.join("\n");
}

export function formatDriftReport(report: DriftReport): string {
  const lines = [`Repository: ${report.root}`, "", "Managed-file drift:"];
  if (report.diagnostics.length === 0) {
    lines.push("  No managed-file drift detected.");
  }
  for (const diagnostic of report.diagnostics) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.message}`);
  }
  return lines.join("\n");
}

export function formatDiagnostics(title: string, diagnostics: DoctorReport["diagnostics"]): string {
  const lines = [title];
  if (diagnostics.length === 0) {
    lines.push("  No diagnostics found.");
  }
  for (const diagnostic of diagnostics) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.message}`);
    for (const evidence of diagnostic.evidence) {
      lines.push(`      ${evidence.path}: ${evidence.reason}`);
    }
  }
  return lines.join("\n");
}

export function formatSynchronizationPlan(plan: SynchronizationPlan): string {
  const lines = [`Synchronization can apply: ${plan.canApply ? "yes" : "no"}`, "", "Actions:"];
  for (const action of plan.actions) {
    lines.push(`  - ${action.kind}: ${action.path}${action.reason ? ` (${action.reason})` : ""}`);
  }
  for (const diagnostic of plan.diagnostics) {
    lines.push(`  - [${diagnostic.severity}] ${diagnostic.message}`);
  }
  lines.push("", "No files written. Run with `--write` to apply this plan.");
  return lines.join("\n");
}

export function formatSynchronizationResult(result: SynchronizationResult): string {
  return [
    "Synchronization result:",
    ...result.written.map((path) => `  + written ${path}`),
    ...result.unchanged.map((path) => `  = unchanged ${path}`),
    ...result.preserved.map((path) => `  ! preserved ${path}`),
  ].join("\n");
}

export function formatQualityGatePlan(result: QualityGatePlanningResult): string {
  return [
    "Quality gates:",
    ...result.plans.map(
      (plan) =>
        `  - ${plan.id}: ${plan.command.executable} ${plan.command.args.join(" ")}${
          plan.configuredScript ? `\n      configured script: ${plan.configuredScript}` : ""
        }`,
    ),
    ...result.diagnostics.map(
      (diagnostic) => `  - [${diagnostic.severity}] ${diagnostic.message}`,
    ),
    "",
    "No commands executed. Run with `--run` to execute approved safe gates.",
  ].join("\n");
}

export function formatQualityGateEvaluation(evaluation: QualityGateEvaluation): string {
  return [
    `Quality-gate status: ${evaluation.status}`,
    ...evaluation.results.map((result) => `  - ${result.gateId}: ${result.status}`),
  ].join("\n");
}
