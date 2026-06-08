import type { AgentId } from "@adrenai/domain";

export type CommandName =
  | "apply"
  | "check"
  | "doctor"
  | "drift"
  | "inspect"
  | "onboard"
  | "packs"
  | "strategies"
  | "workflows"
  | "workflow-plan"
  | "session-start"
  | "session-status"
  | "session-action"
  | "ai-status"
  | "ai-preview"
  | "registry-list"
  | "registry-import"
  | "registry-update-preview"
  | "recommend"
  | "sync"
  | "tui"
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
  category?: string;
  workflow?: string;
  session?: string;
  action?: "pause" | "resume" | "handoff" | "complete";
  gates?: string[];
  source?: string;
  registry?: string;
  next?: string;
  capability?: "summarize" | "gap-analysis" | "custom-strategy";
  content?: string;
}

const COMMANDS = new Set<CommandName>([
  "apply",
  "check",
  "doctor",
  "drift",
  "inspect",
  "onboard",
  "packs",
  "strategies",
  "workflows",
  "workflow-plan",
  "session-start",
  "session-status",
  "session-action",
  "ai-status",
  "ai-preview",
  "registry-list",
  "registry-import",
  "registry-update-preview",
  "recommend",
  "sync",
  "tui",
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
  let category: string | undefined;
  let workflow: string | undefined;
  let session: string | undefined;
  let action: ParsedArguments["action"];
  let gates: string[] | undefined;
  let source: string | undefined;
  let registry: string | undefined;
  let next: string | undefined;
  let capability: ParsedArguments["capability"];
  let content: string | undefined;

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
      && !argument.startsWith("--category=")
      && !argument.startsWith("--workflow=")
      && !argument.startsWith("--session=")
      && !argument.startsWith("--action=")
      && !argument.startsWith("--gates=")
      && !argument.startsWith("--source=")
      && !argument.startsWith("--registry=")
      && !argument.startsWith("--next=")
      && !argument.startsWith("--capability=")
      && !argument.startsWith("--content=")
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
    if (argument.startsWith("--category=")) category = argument.slice(11);
    if (argument.startsWith("--workflow=")) workflow = argument.slice(11);
    if (argument.startsWith("--session=")) session = argument.slice(10);
    if (argument.startsWith("--action=")) {
      const value = argument.slice(9);
      if (!["pause", "resume", "handoff", "complete"].includes(value)) throw new Error(`Unsupported session action: ${value}`);
      action = value as ParsedArguments["action"];
    }
    if (argument.startsWith("--gates=")) gates = [...new Set(argument.slice(8).split(",").filter(Boolean))];
    if (argument.startsWith("--source=")) source = argument.slice(9);
    if (argument.startsWith("--registry=")) registry = argument.slice(11);
    if (argument.startsWith("--next=")) next = argument.slice(7);
    if (argument.startsWith("--content=")) content = argument.slice(10);
    if (argument.startsWith("--capability=")) {
      const value = argument.slice(13);
      if (!["summarize", "gap-analysis", "custom-strategy"].includes(value)) throw new Error(`Unsupported AI capability: ${value}`);
      capability = value as ParsedArguments["capability"];
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
  if (args.includes("--write") && !["apply", "sync", "session-start", "session-action", "registry-import"].includes(commandValue ?? "")) {
    throw new Error("--write is not supported by this command.");
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
    category,
    workflow,
    session,
    action,
    gates,
    source,
    registry,
    next,
    capability,
    content,
  };
}
