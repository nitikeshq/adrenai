import type {
  BriefStatement,
  ProjectBrief,
  ProjectSynthesisInput,
  SelectionBudget,
  SelectionContext,
  Strategy,
  WorkflowCandidate,
  WorkflowSuggestion,
} from "@adrenai/domain";
import { rankStrategies, suggestQuestions } from "./selection.js";

export interface ProjectBriefAiEnhancer {
  enhance(brief: ProjectBrief): Promise<Array<{ id: string; text: string; confidence: "high" | "medium" | "low" }>>;
}

function detectedStatements(input: ProjectSynthesisInput): BriefStatement[] {
  return [
    ...input.inspection.technologies.map((technology) => ({
      id: `technology/${technology.id}`,
      text: `Detected ${technology.kind}: ${technology.id}.`,
      sourceKind: "detected" as const,
      confidence: "high" as const,
      evidence: technology.evidence,
    })),
    ...input.inspection.agents.map((agent) => ({
      id: `agent/${agent.agent}`,
      text: `Detected configured AI agent: ${agent.agent}.`,
      sourceKind: "detected" as const,
      confidence: "high" as const,
      evidence: agent.evidence,
    })),
  ];
}

function authoredConstraints(input: ProjectSynthesisInput): BriefStatement[] {
  return input.requirements.map((requirement, index) => ({
    id: `requirement/${index + 1}`,
    text: `${requirement.polarity === "prohibit" ? "Prohibit" : "Require"}: ${requirement.text}`,
    sourceKind: "authored",
    confidence: "high",
    evidence: [{
      path: `${requirement.source}:${requirement.line}`,
      reason: `authored ${requirement.polarity} rule in scope ${requirement.scope}`,
    }],
  }));
}

function inferredStatements(input: ProjectSynthesisInput): BriefStatement[] {
  const technologyIds = new Set(input.inspection.technologies.map(({ id }) => id));
  const suggestions: BriefStatement[] = [];
  if (technologyIds.has("typescript")) {
    suggestions.push({
      id: "inference/typed-delivery",
      text: "Use a typed implementation and validation workflow.",
      sourceKind: "inferred",
      confidence: "medium",
      evidence: [{ path: "package.json", reason: "TypeScript detected" }],
    });
  }
  if (input.inspection.agents.length > 1) {
    suggestions.push({
      id: "inference/synchronized-guidance",
      text: "Use synchronized portable guidance across detected agents.",
      sourceKind: "inferred",
      confidence: "medium",
      evidence: input.inspection.agents.flatMap(({ evidence }) => evidence),
    });
  }
  return suggestions;
}

function suggestWorkflows(
  candidates: WorkflowCandidate[],
  context: SelectionContext,
  strategyIds: string[],
): WorkflowSuggestion[] {
  return candidates
    .map((candidate) => {
      const categoryMatches = candidate.categoryIds.filter((id) => context.categoryIds.includes(id));
      const strategyMatches = candidate.strategyIds.filter((id) => strategyIds.includes(id));
      const score = categoryMatches.length * 20 + strategyMatches.length * 10;
      return {
        workflowId: candidate.workflow.id,
        title: candidate.workflow.title,
        confidence: score >= 20 ? "high" as const : score > 0 ? "medium" as const : "low" as const,
        reasons: [
          ...categoryMatches.map((id) => `matches category ${id}`),
          ...strategyMatches.map((id) => `supports strategy ${id}`),
        ],
        score,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.workflowId.localeCompare(right.workflowId))
    .map(({ score: _score, ...suggestion }) => suggestion);
}

export function synthesizeProjectBrief(
  input: ProjectSynthesisInput,
  strategies: Strategy[],
  workflows: WorkflowCandidate[],
  context: SelectionContext,
  budget: SelectionBudget,
): ProjectBrief {
  const strategySuggestions = rankStrategies(strategies, context);
  return {
    schemaVersion: 1,
    root: input.inspection.root,
    title: "Existing Project Brief",
    facts: detectedStatements(input),
    constraints: authoredConstraints(input),
    inferredSuggestions: inferredStatements(input),
    aiSuggestions: [],
    unresolvedQuestions: suggestQuestions(strategySuggestions, context, budget),
    conflicts: input.diagnostics.filter(({ severity }) => severity === "error"),
    strategySuggestions,
    workflowSuggestions: suggestWorkflows(
      workflows,
      context,
      strategySuggestions.slice(0, 3).map(({ strategy }) => strategy.id),
    ),
    sourceRequirements: input.requirements,
    reviewStatus: "proposed",
  };
}

export async function enhanceProjectBrief(
  brief: ProjectBrief,
  enhancer: ProjectBriefAiEnhancer,
): Promise<ProjectBrief> {
  const suggestions = await enhancer.enhance(brief);
  return {
    ...brief,
    aiSuggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      sourceKind: "ai-suggested",
      evidence: [],
    })),
  };
}

function section(title: string, lines: string[]): string[] {
  return [`## ${title}`, "", ...(lines.length ? lines : ["- None"]), ""];
}

export function renderProjectBriefMarkdown(brief: ProjectBrief): string {
  const statements = (items: BriefStatement[]) =>
    items.map(({ text, sourceKind, confidence, evidence }) =>
      `- ${text} [${sourceKind}; ${confidence}; evidence: ${evidence.map(({ path }) => path).join(", ") || "none"}]`,
    );
  return [
    `# ${brief.title}`,
    "",
    `Status: ${brief.reviewStatus}`,
    `Root: ${brief.root}`,
    "",
    ...section("Verified Facts", statements(brief.facts)),
    ...section("Authored Constraints", statements(brief.constraints)),
    ...section("Inferred Suggestions", statements(brief.inferredSuggestions)),
    ...section("Optional AI Suggestions", statements(brief.aiSuggestions)),
    ...section("Strategy Suggestions", brief.strategySuggestions.map(({ strategy, confidence, reasons }) =>
      `- ${strategy.title} (${confidence}): ${reasons.join("; ") || "catalog fallback"}`,
    )),
    ...section("Workflow Suggestions", brief.workflowSuggestions.map(({ title, confidence, reasons }) =>
      `- ${title} (${confidence}): ${reasons.join("; ")}`,
    )),
    ...section("Unresolved Questions", brief.unresolvedQuestions.map(({ prompt, reason }) => `- ${prompt} Why: ${reason}`)),
    ...section("Conflicts", brief.conflicts.map(({ message }) => `- ${message}`)),
  ].join("\n");
}
