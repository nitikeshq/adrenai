export type QualityGateCategory =
  | "build"
  | "lint"
  | "security"
  | "test"
  | "typecheck";

export type QualityGateStatus = "failed" | "not-run" | "passed";

export interface QualityGateCommand {
  executable: string;
  args: string[];
}

export interface QualityGatePlan {
  id: string;
  title: string;
  category: QualityGateCategory;
  command: QualityGateCommand;
  required: boolean;
  requiresApproval: true;
  timeoutMs: number;
  configuredScript?: string;
}

export interface QualityGateExecution {
  gateId: string;
  exitCode?: number;
  timedOut?: boolean;
  error?: string;
}

export interface QualityGateResult {
  gateId: string;
  status: QualityGateStatus;
  exitCode?: number;
  message: string;
}

export interface QualityGateEvaluation {
  status: "failed" | "incomplete" | "passed";
  results: QualityGateResult[];
  unknownExecutions: string[];
}

const SAFE_SCRIPT_NAMES = new Set([
  "audit",
  "build",
  "check",
  "lint",
  "secret-scan",
  "security",
  "test",
  "typecheck",
]);

function isSafePackageCommand(executable: string, args: string[]): boolean {
  if (executable === "npm" || executable === "pnpm") {
    return (
      (args.length === 1 && args[0] === "test") ||
      (args.length === 2 && args[0] === "run" && SAFE_SCRIPT_NAMES.has(args[1] ?? ""))
    );
  }
  if (executable === "yarn") {
    return args.length === 1 && SAFE_SCRIPT_NAMES.has(args[0] ?? "");
  }
  if (executable === "bun") {
    return (
      (args.length === 1 && args[0] === "test") ||
      (args.length === 2 && args[0] === "run" && SAFE_SCRIPT_NAMES.has(args[1] ?? ""))
    );
  }
  return false;
}

function equals(args: string[], expected: string[]): boolean {
  return args.length === expected.length && args.every((arg, index) => arg === expected[index]);
}

export function isSafeQualityGateCommand(command: QualityGateCommand): boolean {
  if (
    !/^[a-z0-9][a-z0-9.-]*$/i.test(command.executable) ||
    command.args.some((arg) => /[\r\n;&|><`$]/.test(arg))
  ) {
    return false;
  }

  if (isSafePackageCommand(command.executable, command.args)) {
    return true;
  }
  if (command.executable === "corepack" && command.args.length >= 2) {
    const [manager, ...args] = command.args;
    return (manager === "pnpm" || manager === "yarn") && isSafePackageCommand(manager, args);
  }

  const allowed: Record<string, string[][]> = {
    cargo: [["check"], ["clippy"], ["test"]],
    dotnet: [["test"]],
    go: [["test", "./..."]],
    python: [
      ["-m", "mypy", "."],
      ["-m", "pytest"],
      ["-m", "ruff", "check", "."],
    ],
    python3: [
      ["-m", "mypy", "."],
      ["-m", "pytest"],
      ["-m", "ruff", "check", "."],
    ],
    pytest: [[]],
    uv: [
      ["run", "mypy", "."],
      ["run", "pytest"],
      ["run", "ruff", "check", "."],
    ],
  };

  return (allowed[command.executable] ?? []).some((args) => equals(command.args, args));
}

export function createQualityGatePlan(
  plan: Omit<QualityGatePlan, "requiresApproval">,
): QualityGatePlan | undefined {
  if (
    !plan.id ||
    !plan.title ||
    plan.timeoutMs < 1_000 ||
    plan.timeoutMs > 30 * 60 * 1_000 ||
    !isSafeQualityGateCommand(plan.command)
  ) {
    return undefined;
  }
  return { ...plan, requiresApproval: true };
}

export function evaluateQualityGateResults(
  plans: QualityGatePlan[],
  executions: QualityGateExecution[],
): QualityGateEvaluation {
  const executionByGate = new Map(executions.map((execution) => [execution.gateId, execution]));
  const knownGateIds = new Set(plans.map(({ id }) => id));
  const unknownExecutions = [
    ...new Set(executions.filter(({ gateId }) => !knownGateIds.has(gateId)).map(({ gateId }) => gateId)),
  ].sort();

  const results = plans.map((plan): QualityGateResult => {
    const execution = executionByGate.get(plan.id);
    if (!execution) {
      return {
        gateId: plan.id,
        status: "not-run",
        message: "Quality gate was not executed.",
      };
    }
    if (execution.timedOut) {
      return {
        gateId: plan.id,
        status: "failed",
        exitCode: execution.exitCode,
        message: "Quality gate timed out.",
      };
    }
    if (execution.error) {
      return {
        gateId: plan.id,
        status: "failed",
        exitCode: execution.exitCode,
        message: execution.error,
      };
    }
    if (execution.exitCode !== 0) {
      return {
        gateId: plan.id,
        status: "failed",
        exitCode: execution.exitCode,
        message:
          execution.exitCode === undefined
            ? "Quality gate did not report an exit code."
            : `Quality gate exited with code ${execution.exitCode}.`,
      };
    }
    return {
      gateId: plan.id,
      status: "passed",
      exitCode: 0,
      message: "Quality gate passed.",
    };
  });

  if (
    results.some(
      (result) =>
        result.status === "failed" && plans.find(({ id }) => id === result.gateId)?.required,
    )
  ) {
    return { status: "failed", results, unknownExecutions };
  }
  if (
    results.some(
      (result) =>
        result.status === "not-run" && plans.find(({ id }) => id === result.gateId)?.required,
    )
  ) {
    return { status: "incomplete", results, unknownExecutions };
  }
  return { status: "passed", results, unknownExecutions };
}
