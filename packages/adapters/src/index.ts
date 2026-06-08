import type {
  AgentId,
  GeneratedArtifact,
  PackResolution,
  RepositoryRecommendation,
} from "@adrenai/domain";

export interface AgentGenerationContext {
  recommendation: RepositoryRecommendation;
  packResolution: PackResolution;
}

export interface AgentAdapter {
  id: AgentId;
  generate(context: AgentGenerationContext): GeneratedArtifact[];
}

function guidanceDocument(
  title: string,
  context: AgentGenerationContext,
  frontmatter: string[] = [],
): string {
  return [
    ...frontmatter,
    `# ${title}`,
    "",
    "<!-- Managed by AdrenAI. Regenerate instead of editing this file directly. -->",
    "",
    `Profile: ${context.recommendation.profile}`,
    "",
    "## Guidance",
    "",
    ...[...new Set(context.packResolution.resolved.flatMap(({ guidance }) => guidance))].map(
      (rule) => `- ${rule}`,
    ),
    "",
  ].join("\n");
}

const adapters: AgentAdapter[] = [
  {
    id: "generic",
    generate: (context) => [{
      path: "AGENTS.md",
      purpose: "Portable shared guidance for supported AI coding agents.",
      content: guidanceDocument("Repository Guidance", context),
    }],
  },
  {
    id: "codex",
    generate: (context) => [{
      path: "AGENTS.md",
      purpose: "Codex repository guidance.",
      content: guidanceDocument("Repository Guidance", context),
    }],
  },
  {
    id: "claude-code",
    generate: (context) => [{
      path: ".claude/skills/adrenai-project-guidance/SKILL.md",
      purpose: "Claude Code project skill generated from the resolved AdrenAI profile.",
      content: guidanceDocument("AdrenAI Project Guidance", context, [
        "---",
        "name: adrenai-project-guidance",
        "description: Apply the repository's resolved AdrenAI guidance.",
        "---",
        "",
      ]),
    }],
  },
  {
    id: "github-copilot",
    generate: (context) => [{
      path: ".github/copilot-instructions.md",
      purpose: "GitHub Copilot repository instructions.",
      content: guidanceDocument("GitHub Copilot Instructions", context),
    }],
  },
  {
    id: "cursor",
    generate: (context) => [{
      path: ".cursor/rules/adrenai.mdc",
      purpose: "Cursor project rule generated from the resolved AdrenAI profile.",
      content: guidanceDocument("AdrenAI Project Rule", context, [
        "---",
        "description: Resolved AdrenAI repository guidance",
        "alwaysApply: true",
        "---",
        "",
      ]),
    }],
  },
  {
    id: "kiro",
    generate: (context) => [{
      path: ".kiro/steering/adrenai.md",
      purpose: "Kiro steering guidance generated from the resolved AdrenAI profile.",
      content: guidanceDocument("AdrenAI Steering", context),
    }],
  },
  {
    id: "gemini",
    generate: (context) => [{
      path: "GEMINI.md",
      purpose: "Gemini CLI repository guidance.",
      content: guidanceDocument("Gemini Repository Guidance", context),
    }],
  },
];

const byId = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function generateAgentArtifacts(
  targets: AgentId[],
  context: AgentGenerationContext,
): GeneratedArtifact[] {
  const artifacts = new Map<string, GeneratedArtifact>();
  for (const target of [...new Set(targets)]) {
    const adapter = byId.get(target);
    for (const artifact of adapter?.generate(context) ?? []) {
      artifacts.set(artifact.path, artifact);
    }
  }
  return [...artifacts.values()].sort((left, right) => left.path.localeCompare(right.path));
}
