# Existing Project Synthesis

AdrenAI can synthesize repository inspection, authored agent requirements, and
diagnostics into a proposed project brief before asking questions.

The brief keeps provenance explicit:

- **Detected facts** come from repository evidence such as configuration,
  technologies, and existing agent files.
- **Authored constraints** come from user-maintained requirements and retain
  source file, line, scope, and polarity.
- **Inferred suggestions** are deterministic recommendations and are never
  presented as facts.
- **Optional AI suggestions** are added only through an explicit enhancement
  adapter and remain labeled as AI suggestions.

Conflicting requirements remain blocking diagnostics. Strategy and workflow
suggestions are ranked before unresolved questions. Questions use the guided
selection budget and appear only when an answer can materially change close
recommendations.

`renderProjectBriefMarkdown` creates a reviewable enterprise brief with facts,
constraints, suggestions, questions, conflicts, confidence, and evidence. The
brief remains `proposed` until explicitly reviewed.
