import { describe, expect, it } from "vitest";
import {
  formatApplyResult,
  formatArtifacts,
  formatCatalog,
  formatDoctorReport,
  formatDriftReport,
  formatDiagnostics,
  formatQualityGateEvaluation,
  formatQualityGatePlan,
  formatSynchronizationPlan,
  formatInspection,
  formatOnboarding,
  formatOrchestrationPlan,
  formatRecommendation,
} from "./presentation.js";

describe("CLI presentation", () => {
  it("directs unconfigured repositories to recommendations", () => {
    const output = formatInspection({
      root: "/project",
      agents: [],
      technologies: [],
    });

    expect(output).toContain("No supported agent configuration detected.");
    expect(output).toContain("adrenai recommend");
  });

  it("formats recommendation reasons and actions", () => {
    const output = formatRecommendation({
      root: "/project",
      profile: "Portable repository baseline",
      recommendations: [
        {
          id: "governance/portable-agent-baseline",
          title: "Create a portable agent baseline",
          reason: "No supported agent configuration was detected.",
          confidence: "high",
          evidence: [],
          proposedActions: ["Create AGENTS.md after approval"],
        },
      ],
    });

    expect(output).toContain("Recommended profile: Portable repository baseline");
    expect(output).toContain("Create a portable agent baseline [high]");
    expect(output).toContain("+ Create AGENTS.md after approval");
  });

  it("formats a low-friction read-only onboarding summary", () => {
    const output = formatOnboarding({
      inspection: {
        root: "/project",
        technologies: [{ id: "typescript", kind: "language", evidence: [] }],
        agents: [],
      },
      recommendation: {
        root: "/project",
        profile: "Portable repository baseline",
        recommendations: [],
      },
      resolvedPacks: ["governance/portable-agent-baseline"],
    });

    expect(output).toContain("Recommended profile: Portable repository baseline");
    expect(output).toContain("adrenai sync . --write");
    expect(output).toContain("No files written. No AI provider or credits used.");
  });

  it("formats an approval-first orchestration preview", () => {
    const output = formatOrchestrationPlan({
      schemaVersion: 1,
      root: "/project",
      profile: "CMS",
      mode: "offline-first",
      inspection: { root: "/project", technologies: [], agents: [] },
      recommendation: { root: "/project", profile: "CMS", recommendations: [] },
      targetAgents: ["generic"],
      questions: [],
      skillSources: [],
      executionPhases: ["Audit", "Plan", "Build"],
      qualityAreas: ["security"],
      parallelism: {
        recommendedAgents: 2, maximumAgents: 2, availableMemoryMb: 4096,
        logicalCpuCount: 8, independentTaskCount: 3, providerLimit: 4, costLimit: 2, reasons: [],
      },
      agentGuidance: [],
      diagnostics: [],
      approvalRequired: true,
    });

    expect(output).toContain("Parallel agents: recommend 2");
    expect(output).toContain("No files written");
  });

  it("formats a non-writing preview and safe apply result", () => {
    const preview = formatArtifacts([
      { path: "AGENTS.md", purpose: "Shared guidance", content: "# Guidance\n" },
    ]);
    const result = formatApplyResult({
      written: ["adrenai.yaml"],
      skipped: ["AGENTS.md"],
    });

    expect(preview).toContain("No files written.");
    expect(result).toContain("+ created adrenai.yaml");
    expect(result).toContain("! skipped existing AGENTS.md");
  });

  it("formats doctor diagnostics with evidence", () => {
    const output = formatDoctorReport({
      root: "/project",
      requirements: [],
      estimatedInstructionTokens: 120,
      diagnostics: [
        {
          id: "instructions/conflicting-requirements",
          severity: "error",
          message: "Conflicting requirements.",
          evidence: [{ path: "AGENTS.md:3", reason: "require rule in scope /" }],
        },
      ],
    });

    expect(output).toContain("[error] Conflicting requirements.");
    expect(output).toContain("AGENTS.md:3");
    expect(output).toContain("Estimated instruction tokens: 120");
  });

  it("formats a validated catalog summary", () => {
    const output = formatCatalog({
      packs: [
        {
          id: "security/secrets-protection",
          version: "0.1.0",
          type: "security",
          title: "Secrets Protection",
          description: "Protect secrets.",
          appliesWhen: {},
          requires: [],
          conflicts: [],
          guidance: [],
          checks: [],
        },
      ],
      diagnostics: [],
    });

    expect(output).toContain("Validated packs: 1");
    expect(output).toContain("security/secrets-protection@0.1.0");
    expect(output).toContain("No catalog diagnostics found.");
  });

  it("formats managed-file drift diagnostics", () => {
    const output = formatDriftReport({
      root: "/project",
      diagnostics: [
        {
          id: "generation/managed-file-drift",
          severity: "warning",
          message: "Managed file AGENTS.md differs.",
          evidence: [],
        },
      ],
    });

    expect(output).toContain("[warning] Managed file AGENTS.md differs.");
  });

  it("formats generic diagnostics", () => {
    expect(formatDiagnostics("Validation:", [])).toContain("No diagnostics found.");
  });

  it("formats synchronization and quality-gate previews", () => {
    expect(
      formatSynchronizationPlan({
        root: "/project",
        canApply: true,
        actions: [],
        diagnostics: [],
        manifest: { version: 1, artifacts: [] },
      }),
    ).toContain("No files written");
    expect(formatQualityGatePlan({ plans: [], diagnostics: [] })).toContain(
      "No commands executed",
    );
    expect(
      formatQualityGateEvaluation({ status: "passed", results: [], unknownExecutions: [] }),
    ).toContain("passed");
  });
});
