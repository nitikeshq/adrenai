# Guided Strategy Selection

AdrenAI selection is deterministic and suggestion-first. It ranks strategies
from detected category, capability, constraint, deliverable, audience, maturity,
and risk context before asking a question.

Questions are proposed only when the leading strategies are close and an answer
can change the recommendation. Every question explains why it is needed and is
bounded by `maximumQuestions`. AI credits are tracked separately; deterministic
ranking and zero-question defaults use zero credits.

UI clients can use the same application services to:

- search and filter large catalogs
- apply presets
- compare prerequisites, conflicts, outputs, and compatibility
- combine compatible strategies into hybrids
- skip recommendations or add explicit manual overrides
- review confidence, reasons, budgets, conflicts, prerequisites, and expected
  deliverables before approval

`createSelectionPlan` always returns `approved: false`. Writing files or
activating a workflow requires a separate explicit approval boundary.
