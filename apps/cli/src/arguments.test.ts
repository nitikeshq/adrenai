import { describe, expect, it } from "vitest";
import { parseArguments } from "./arguments.js";

describe("parseArguments", () => {
  it("parses command options and explicit agents", () => {
    expect(
      parseArguments(["apply", "./repo", "--write", "--json", "--agents=codex,cursor"]),
    ).toEqual({
      command: "apply",
      path: "./repo",
      json: true,
      write: true,
      run: false,
      help: false,
      version: false,
      agents: ["codex", "cursor"],
      category: undefined,
      workflow: undefined,
      session: undefined,
      action: undefined,
      gates: undefined,
    });
  });

  it("parses platform catalog and session selectors", () => {
    expect(parseArguments(["session-action", ".", "--session=launch", "--action=resume", "--gates=test,lint", "--json"]))
      .toMatchObject({ command: "session-action", session: "launch", action: "resume", gates: ["test", "lint"], json: true });
    expect(parseArguments(["strategies", "--category=design/visual-system"]))
      .toMatchObject({ command: "strategies", category: "design/visual-system" });
  });

  it("rejects unknown commands, options, and misplaced apply options", () => {
    expect(() => parseArguments(["unknown"])).toThrow("Unknown command");
    expect(() => parseArguments(["inspect", "--unknown"])).toThrow("Unknown option");
    expect(() => parseArguments(["doctor", "--write"])).toThrow("--write is only supported");
    expect(() => parseArguments(["doctor", "--run"])).toThrow("--run is only supported");
    expect(() => parseArguments(["doctor", "--agents=codex"])).toThrow(
      "--agents is only supported",
    );
  });

  it("deduplicates agents and rejects unsupported targets", () => {
    expect(parseArguments(["apply", "--agents=codex,codex"]).agents).toEqual(["codex"]);
    expect(() => parseArguments(["apply", "--agents=unknown"])).toThrow(
      "Unsupported agent",
    );
  });

  it("accepts the read-only onboarding command", () => {
    expect(parseArguments(["onboard", "./repo", "--json"])).toMatchObject({
      command: "onboard",
      path: "./repo",
      json: true,
    });
  });

  it("accepts the interactive TUI command and JSON snapshot parity", () => {
    expect(parseArguments(["tui", "./repo", "--json"])).toMatchObject({
      command: "tui",
      path: "./repo",
      json: true,
    });
  });
});
