import type { Diagnostic } from "@adrenai/domain";

export type TuiScreen = "context" | "strategies" | "questions" | "workflow" | "review";

export interface TuiStrategyView {
  id: string;
  title: string;
  category: string;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  conflicts: string[];
  prerequisites: string[];
  outputs: string[];
}

export interface TuiModel {
  screen: TuiScreen;
  query: string;
  categoryFilter?: string;
  cursor: number;
  selectedIds: string[];
  cancelled: boolean;
  approvalRequested: boolean;
  contextLines: string[];
  strategies: TuiStrategyView[];
  questionLines: string[];
  workflowLines: string[];
  fileChangeLines: string[];
  diagnostics: Diagnostic[];
}

export type TuiAction =
  | { type: "next" }
  | { type: "previous" }
  | { type: "next-screen" }
  | { type: "previous-screen" }
  | { type: "toggle" }
  | { type: "search"; query: string }
  | { type: "filter"; category?: string }
  | { type: "review" }
  | { type: "cancel" };

const SCREENS: TuiScreen[] = ["context", "strategies", "questions", "workflow", "review"];

export function visibleStrategies(model: TuiModel): TuiStrategyView[] {
  const query = model.query.trim().toLowerCase();
  return model.strategies.filter(
    (strategy) =>
      (!model.categoryFilter || strategy.category === model.categoryFilter) &&
      (!query ||
        [strategy.id, strategy.title, ...strategy.reasons]
          .some((value) => value.toLowerCase().includes(query))),
  );
}

export function updateTui(model: TuiModel, action: TuiAction): TuiModel {
  const visible = visibleStrategies(model);
  const maxCursor = Math.max(0, visible.length - 1);
  if (action.type === "cancel") return { ...model, cancelled: true };
  if (action.type === "search") return { ...model, query: action.query, cursor: 0 };
  if (action.type === "filter") return { ...model, categoryFilter: action.category, cursor: 0 };
  if (action.type === "next") return { ...model, cursor: Math.min(maxCursor, model.cursor + 1) };
  if (action.type === "previous") return { ...model, cursor: Math.max(0, model.cursor - 1) };
  if (action.type === "next-screen" || action.type === "previous-screen") {
    const current = SCREENS.indexOf(model.screen);
    const delta = action.type === "next-screen" ? 1 : -1;
    return { ...model, screen: SCREENS[(current + delta + SCREENS.length) % SCREENS.length]!, cursor: 0 };
  }
  if (action.type === "toggle") {
    const selected = visible[model.cursor];
    if (!selected) return model;
    return {
      ...model,
      selectedIds: model.selectedIds.includes(selected.id)
        ? model.selectedIds.filter((id) => id !== selected.id)
        : [...model.selectedIds, selected.id],
    };
  }
  if (action.type === "review") return { ...model, screen: "review", approvalRequested: true };
  return model;
}

function linesForStrategies(model: TuiModel): string[] {
  return visibleStrategies(model).flatMap((strategy, index) => [
    `${index === model.cursor ? ">" : " "} ${model.selectedIds.includes(strategy.id) ? "[x]" : "[ ]"} ${strategy.title} [${strategy.confidence}] (${strategy.category})`,
    `    ${strategy.reasons.join("; ") || "No ranking reasons."}`,
    ...(model.selectedIds.includes(strategy.id)
      ? [
          `    prerequisites: ${strategy.prerequisites.join(", ") || "none"}`,
          `    conflicts: ${strategy.conflicts.join(", ") || "none"}`,
          `    outputs: ${strategy.outputs.join(", ") || "none"}`,
        ]
      : []),
  ]);
}

export function renderTui(model: TuiModel): string {
  const body =
    model.screen === "context"
      ? model.contextLines
      : model.screen === "strategies"
        ? [`Search: ${model.query || "(none)"}  Filter: ${model.categoryFilter ?? "(all)"}`, ...linesForStrategies(model)]
        : model.screen === "questions"
          ? model.questionLines
          : model.screen === "workflow"
            ? [...model.workflowLines, "", "File changes:", ...model.fileChangeLines]
            : [
                `Selected: ${model.selectedIds.join(", ") || "none"}`,
                `Approval requested: ${model.approvalRequested ? "yes" : "no"}`,
                ...model.diagnostics.map(({ severity, message }) => `[${severity}] ${message}`),
              ];
  return [
    "AdrenAI TUI",
    `Screen: ${model.screen}`,
    "",
    ...body,
    "",
    "Keyboard: j/k move | space select | tab next screen | shift-tab previous | / search | f filter | enter review | q cancel",
    "No files written. Effects require a separate approved application API execute request.",
  ].join("\n");
}

export async function runInteractiveTui(initial: TuiModel): Promise<TuiModel> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write(`${renderTui(initial)}\n`);
    return initial;
  }
  let model = initial;
  let searchBuffer: string | undefined;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  const draw = () => process.stdout.write(
    `\x1B[2J\x1B[H${renderTui(model)}${searchBuffer === undefined ? "" : `\nSearch input: ${searchBuffer}`}`,
  );
  draw();
  return new Promise((resolve) => {
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      resolve(model);
    };
    process.stdin.on("data", (key: string) => {
      if (searchBuffer !== undefined) {
        if (key === "\r") {
          model = updateTui(model, { type: "search", query: searchBuffer });
          searchBuffer = undefined;
        } else if (key === "\u001B") {
          searchBuffer = undefined;
        } else if (key === "\u007F") {
          searchBuffer = searchBuffer.slice(0, -1);
        } else if (/^[ -~]$/.test(key)) {
          searchBuffer += key;
        }
        draw();
        return;
      }
      if (key === "q" || key === "\u0003") {
        model = updateTui(model, { type: "cancel" });
        return finish();
      }
      if (key === "j" || key === "\u001B[B") model = updateTui(model, { type: "next" });
      else if (key === "k" || key === "\u001B[A") model = updateTui(model, { type: "previous" });
      else if (key === " ") model = updateTui(model, { type: "toggle" });
      else if (key === "\t") model = updateTui(model, { type: "next-screen" });
      else if (key === "\u001B[Z") model = updateTui(model, { type: "previous-screen" });
      else if (key === "/") searchBuffer = "";
      else if (key === "f") {
        const categories = [...new Set(model.strategies.map(({ category }) => category))].sort();
        const current = model.categoryFilter ? categories.indexOf(model.categoryFilter) : -1;
        model = updateTui(model, {
          type: "filter",
          category: current + 1 >= categories.length ? undefined : categories[current + 1],
        });
      }
      else if (key === "\r") model = updateTui(model, { type: "review" });
      draw();
    });
  });
}
