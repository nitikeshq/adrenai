import { describe, expect, it } from "vitest";
import type { Pack, PackResolution, RepositoryInspection } from "@adrenai/domain";
import {
  createQualityGatePlan,
  evaluateQualityGateResults,
  isSafeQualityGateCommand,
} from "../../domain/src/checks.js";
import { planQualityGates } from "./checks.js";

function inspection(technologies: string[] = []): RepositoryInspection {
  return {
    root: "/project",
    agents: [],
    technologies: technologies.map((id) => ({
      id,
      kind: id === "pnpm" ? "package-manager" : "language",
      evidence: [],
    })),
  };
}

function resolution(checks: string[]): PackResolution {
  const pack: Pack = {
    id: "testing/example",
    version: "1.0.0",
    type: "testing",
    title: "Example",
    description: "Example pack.",
    appliesWhen: {},
    requires: [],
    conflicts: [],
    guidance: [],
    checks,
  };
  return { requested: [pack.id], resolved: [pack], diagnostics: [] };
}

describe("quality-gate command safety", () => {
  it("allows explicit check commands and rejects shell syntax or arbitrary scripts", () => {
    expect(isSafeQualityGateCommand({ executable: "pnpm", args: ["run", "typecheck"] })).toBe(true);
    expect(
      isSafeQualityGateCommand({ executable: "corepack", args: ["pnpm", "run", "typecheck"] }),
    ).toBe(true);
    expect(isSafeQualityGateCommand({ executable: "go", args: ["test", "./..."] })).toBe(true);
    expect(isSafeQualityGateCommand({ executable: "pnpm", args: ["run", "deploy"] })).toBe(false);
    expect(isSafeQualityGateCommand({ executable: "npm", args: ["test", "&&", "echo"] })).toBe(false);
  });

  it("only creates approval-required plans with bounded timeouts", () => {
    const plan = createQualityGatePlan({
      id: "typecheck",
      title: "Type check",
      category: "typecheck",
      command: { executable: "npm", args: ["run", "typecheck"] },
      required: true,
      timeoutMs: 60_000,
    });

    expect(plan?.requiresApproval).toBe(true);
    expect(
      createQualityGatePlan({
        id: "unsafe",
        title: "Unsafe",
        category: "build",
        command: { executable: "npm", args: ["run", "deploy"] },
        required: true,
        timeoutMs: 60_000,
      }),
    ).toBeUndefined();
  });
});

describe("planQualityGates", () => {
  it("plans only recognized scripts selected by resolved packs", () => {
    const result = planQualityGates(
      inspection(["typescript", "pnpm"]),
      resolution(["configured-typecheck", "configured-tests", "secret-scan"]),
      {
        packageScripts: ["typecheck", "test"],
        packageScriptCommands: {
          typecheck: "tsc --noEmit",
          test: "vitest run",
        },
      },
    );

    expect(result.plans.map(({ id }) => id)).toEqual([
      "configured-tests",
      "configured-typecheck",
    ]);
    expect(result.plans[0]?.command).toEqual({
      executable: "corepack",
      args: ["pnpm", "test"],
    });
    expect(result.plans[1]?.command).toEqual({
      executable: "corepack",
      args: ["pnpm", "run", "typecheck"],
    });
    expect(result.plans[0]?.configuredScript).toBe("vitest run");
    expect(result.diagnostics[0]?.id).toBe("checks/missing-configured-command");
  });

  it("does not invent local commands for CI-only or unknown checks", () => {
    const result = planQualityGates(
      inspection(),
      resolution(["existing-ci-workflows", "third-party-check"]),
    );

    expect(result.plans).toEqual([]);
    expect(result.diagnostics.map(({ id }) => id)).toEqual([
      "checks/ci-gate-not-local",
      "checks/unknown-check",
    ]);
  });
});

describe("evaluateQualityGateResults", () => {
  const requiredPlan = createQualityGatePlan({
    id: "test",
    title: "Tests",
    category: "test",
    command: { executable: "npm", args: ["test"] },
    required: true,
    timeoutMs: 60_000,
  });

  it("distinguishes passed, failed, and incomplete required gates", () => {
    expect(evaluateQualityGateResults([requiredPlan!], [{ gateId: "test", exitCode: 0 }]).status)
      .toBe("passed");
    expect(evaluateQualityGateResults([requiredPlan!], [{ gateId: "test", exitCode: 1 }]).status)
      .toBe("failed");
    expect(evaluateQualityGateResults([requiredPlan!], []).status).toBe("incomplete");
  });

  it("reports unknown executions and timeout failures", () => {
    const result = evaluateQualityGateResults(
      [requiredPlan!],
      [
        { gateId: "test", timedOut: true },
        { gateId: "unplanned", exitCode: 0 },
      ],
    );

    expect(result.status).toBe("failed");
    expect(result.results[0]?.message).toBe("Quality gate timed out.");
    expect(result.unknownExecutions).toEqual(["unplanned"]);
  });
});
