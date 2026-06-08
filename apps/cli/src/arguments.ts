import type { AgentId } from "@adrenai/domain";

export type CommandName =
  | "apply"
  | "check"
  | "doctor"
  | "drift"
  | "inspect"
  | "onboard"
  | "packs"
  | "recommend"
  | "sync"
  | "validate";

export interface ParsedArguments {
  command?: CommandName;
  path: string;
  json: boolean;
  write: boolean;
  run: boolean;
  help: boolean;
  version: boolean;
  agents?: AgentId[];
}

const COMMANDS = new Set<CommandName>([
  "apply",
  "check",
  "doctor",
  "drift",
  "inspect",
  "onboard",
  "packs",
  "recommend",
  "sync",
  "validate",
]);
const AGENTS = new Set<AgentId>([
  "claude-code",
  "codex",
  "cursor",
  "gemini",
  "github-copilot",
  "kiro",
  "generic",
]);

export function parseArguments(args: string[]): ParsedArguments {
  const positional: string[] = [];
  let agents: AgentId[] | undefined;

  for (const argument of args) {
    if (!argument.startsWith("-")) {
      positional.push(argument);
      continue;
    }
    if (
      argument !== "--json" &&
      argument !== "--write" &&
      argument !== "--run" &&
      argument !== "--help" &&
      argument !== "-h" &&
      argument !== "--version" &&
      argument !== "-v" &&
      !argument.startsWith("--agents=")
    ) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (argument.startsWith("--agents=")) {
      const values = [...new Set(argument.slice(9).split(",").filter(Boolean))];
      if (values.length === 0) {
        throw new Error("At least one agent must follow --agents=.");
      }
      const invalid = values.filter((agent) => !AGENTS.has(agent as AgentId));
      if (invalid.length > 0) {
        throw new Error(`Unsupported agent target(s): ${invalid.join(", ")}`);
      }
      agents = values as AgentId[];
    }
  }

  const commandValue = positional[0];
  if (commandValue && !COMMANDS.has(commandValue as CommandName)) {
    throw new Error(`Unknown command: ${commandValue}`);
  }
  if (positional.length > 2) {
    throw new Error(`Unexpected argument: ${positional[2]}`);
  }
  if (agents && commandValue !== "apply" && commandValue !== "sync") {
    throw new Error("--agents is only supported by the apply and sync commands.");
  }
  if (args.includes("--write") && commandValue !== "apply" && commandValue !== "sync") {
    throw new Error("--write is only supported by the apply and sync commands.");
  }
  if (args.includes("--run") && commandValue !== "check") {
    throw new Error("--run is only supported by the check command.");
  }

  return {
    command: commandValue as CommandName | undefined,
    path: positional[1] ?? ".",
    json: args.includes("--json"),
    write: args.includes("--write"),
    run: args.includes("--run"),
    help: args.includes("--help") || args.includes("-h"),
    version: args.includes("--version") || args.includes("-v"),
    agents,
  };
}
