# Workflow Authoring

Workflows are versioned declarative phase graphs. Each phase declares inputs,
outputs, dependencies, approvals, gates, optional branching, and a bounded retry
limit. Manifests cannot execute code.

`planWorkflow` performs a deterministic dry run, orders dependencies, evaluates
declared decisions, lists approvals and gates, and reports missing dependencies
or cycles before execution. `createWorkflowState` creates resumable local state;
ready phases are derived only after their dependencies complete or skip.

Workflow state is stored under `.adrenai/workflows/`. Persistence rejects
secret-like keys and uses repository-contained writes. States may be marked
paused and resumed without losing decisions, attempts, or phase status.
Each declared gate must record a passing result with evidence before its phase
can complete. Failed or missing gates block completion, and retrying a phase
clears its prior gate results so changed work must be validated again. Older
saved state without `gateResults` remains readable and behaves as having no
passing gates.

The reference manifest at `catalog/workflows/software-development.json` shows
approval, branching, optional phases, retries, outputs, and quality gates.
