import { describe, expect, it } from "vitest";
import { renderTui, updateTui, visibleStrategies, type TuiModel } from "./tui.js";

const model: TuiModel = {
  screen: "strategies",
  query: "",
  cursor: 0,
  selectedIds: [],
  cancelled: false,
  approvalRequested: false,
  contextLines: ["Detected TypeScript and Codex."],
  strategies: [
    {
      id: "example/reliable",
      title: "Reliable Delivery",
      category: "software",
      confidence: "high",
      reasons: ["matches TypeScript"],
      conflicts: [],
      prerequisites: ["example/testing"],
      outputs: ["test report"],
    },
    {
      id: "example/rapid",
      title: "Rapid Prototype",
      category: "design",
      confidence: "medium",
      reasons: ["matches prototype output"],
      conflicts: ["example/reliable"],
      prerequisites: [],
      outputs: ["prototype"],
    },
  ],
  questionLines: ["Which output matters most? Why: changes the leading strategy."],
  workflowLines: ["1. Implement", "2. Validate", "Gates: tests, secret scan"],
  fileChangeLines: ["create .adrenai/session.json"],
  diagnostics: [],
};

describe("TUI interaction model", () => {
  it("supports keyboard-style navigation, selection, review, and cancellation", () => {
    let state = updateTui(model, { type: "next" });
    state = updateTui(state, { type: "toggle" });
    state = updateTui(state, { type: "review" });
    expect(state.selectedIds).toEqual(["example/rapid"]);
    expect(state.screen).toBe("review");
    expect(state.approvalRequested).toBe(true);
    expect(updateTui(state, { type: "cancel" }).cancelled).toBe(true);
  });

  it("searches and filters prepared strategies without changing business data", () => {
    const searched = updateTui(model, { type: "search", query: "TypeScript" });
    expect(visibleStrategies(searched).map(({ id }) => id)).toEqual(["example/reliable"]);
    const filtered = updateTui(model, { type: "filter", category: "design" });
    expect(visibleStrategies(filtered).map(({ id }) => id)).toEqual(["example/rapid"]);
  });

  it("renders context, confidence, comparisons, questions, workflow, gates, and files", () => {
    const selected = updateTui(model, { type: "toggle" });
    expect(renderTui(selected)).toContain("Reliable Delivery [high]");
    expect(renderTui(selected)).toContain("prerequisites: example/testing");
    expect(renderTui({ ...selected, screen: "questions" })).toContain("changes the leading strategy");
    expect(renderTui({ ...selected, screen: "workflow" })).toContain("Gates: tests, secret scan");
    expect(renderTui({ ...selected, screen: "workflow" })).toContain("create .adrenai/session.json");
  });
});
