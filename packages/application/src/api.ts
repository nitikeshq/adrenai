import type { Diagnostic } from "@adrenai/domain";

export type ApplicationOperation =
  | "inspect"
  | "suggest"
  | "select"
  | "plan"
  | "execute"
  | "resume"
  | "validate";

export interface ApplicationEvent {
  operation: ApplicationOperation;
  stage: "started" | "progress" | "approval-required" | "completed" | "cancelled" | "failed";
  message: string;
  progress?: number;
  diagnostics?: Diagnostic[];
}

export interface CancellationSignal {
  readonly cancelled: boolean;
}

export interface ApprovalRequest {
  id: string;
  operation: ApplicationOperation;
  summary: string;
  effectPaths: string[];
  commands: string[];
}

export interface ApprovalGrant {
  requestId: string;
  approved: true;
}

export interface ApplicationRequest<T = unknown> {
  root: string;
  input?: T;
  cancellation?: CancellationSignal;
  onEvent?: (event: ApplicationEvent) => void;
}

export interface ExecutionRequest<T = unknown> extends ApplicationRequest<T> {
  approval?: ApprovalGrant;
}

export interface ApplicationResult<T> {
  value?: T;
  diagnostics: Diagnostic[];
  events: ApplicationEvent[];
  approval?: ApprovalRequest;
  cancelled: boolean;
}

export interface ApplicationApiServices {
  inspect(root: string, input?: unknown): Promise<unknown>;
  suggest(root: string, input?: unknown): Promise<unknown>;
  select(root: string, input?: unknown): Promise<unknown>;
  plan(root: string, input?: unknown): Promise<{ value: unknown; approval?: ApprovalRequest }>;
  execute(root: string, input?: unknown): Promise<unknown>;
  resume(root: string, input?: unknown): Promise<unknown>;
  validate(root: string, input?: unknown): Promise<{ value: unknown; diagnostics: Diagnostic[] }>;
}

function cancellationDiagnostic(operation: ApplicationOperation): Diagnostic {
  return {
    id: "application/cancelled",
    severity: "info",
    message: `Application operation ${operation} was cancelled.`,
    evidence: [],
  };
}

export class AdrenaiApplicationApi {
  constructor(private readonly services: ApplicationApiServices) {}

  inspect(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("inspect", request, () => this.services.inspect(request.root, request.input));
  }

  suggest(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("suggest", request, () => this.services.suggest(request.root, request.input));
  }

  select(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("select", request, () => this.services.select(request.root, request.input));
  }

  resume(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("resume", request, () => this.services.resume(request.root, request.input));
  }

  validate(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("validate", request, () => this.services.validate(request.root, request.input))
      .then((result) => {
        const validated = result.value as { value: unknown; diagnostics: Diagnostic[] } | undefined;
        if (!validated) return result;
        return { ...result, value: validated.value, diagnostics: validated.diagnostics };
      });
  }

  async plan(request: ApplicationRequest): Promise<ApplicationResult<unknown>> {
    return this.run("plan", request, async () => {
      const planned = await this.services.plan(request.root, request.input);
      return planned;
    }).then((result) => {
      const planned = result.value as { value: unknown; approval?: ApprovalRequest } | undefined;
      if (!planned) return result;
      if (planned.approval) {
        const event: ApplicationEvent = {
          operation: "plan",
          stage: "approval-required",
          message: planned.approval.summary,
        };
        request.onEvent?.(event);
        return { ...result, value: planned.value, approval: planned.approval, events: [...result.events, event] };
      }
      return { ...result, value: planned.value };
    });
  }

  async execute(request: ExecutionRequest): Promise<ApplicationResult<unknown>> {
    if (request.cancellation?.cancelled) {
      return this.run("execute", request, () => this.services.execute(request.root, request.input));
    }
    const planned = await this.services.plan(request.root, request.input);
    if (!planned.approval || request.approval?.requestId !== planned.approval.id) {
      const event: ApplicationEvent = {
        operation: "execute",
        stage: "approval-required",
        message: planned.approval?.summary ?? "Execution requires an approved effect plan.",
      };
      request.onEvent?.(event);
      return {
        diagnostics: [{
          id: "application/approval-required",
          severity: "error",
          message: event.message,
          evidence: [],
        }],
        events: [event],
        approval: planned.approval,
        cancelled: false,
      };
    }
    return this.run("execute", request, () => this.services.execute(request.root, request.input));
  }

  private async run<T>(
    operation: ApplicationOperation,
    request: ApplicationRequest,
    action: () => Promise<T>,
  ): Promise<ApplicationResult<T>> {
    const events: ApplicationEvent[] = [];
    const emit = (event: ApplicationEvent) => {
      events.push(event);
      request.onEvent?.(event);
    };
    if (request.cancellation?.cancelled) {
      const diagnostic = cancellationDiagnostic(operation);
      emit({ operation, stage: "cancelled", message: diagnostic.message, diagnostics: [diagnostic] });
      return { diagnostics: [diagnostic], events, cancelled: true };
    }
    emit({ operation, stage: "started", message: `${operation} started.`, progress: 0 });
    try {
      const value = await action();
      if (request.cancellation?.cancelled) {
        const diagnostic = cancellationDiagnostic(operation);
        emit({ operation, stage: "cancelled", message: diagnostic.message, diagnostics: [diagnostic] });
        return { diagnostics: [diagnostic], events, cancelled: true };
      }
      const diagnostics: Diagnostic[] = [];
      emit({ operation, stage: "completed", message: `${operation} completed.`, progress: 100, diagnostics });
      return { value, diagnostics, events, cancelled: false };
    } catch (error) {
      const diagnostic: Diagnostic = {
        id: "application/operation-failed",
        severity: "error",
        message: error instanceof Error ? error.message : `${operation} failed.`,
        evidence: [],
      };
      emit({ operation, stage: "failed", message: diagnostic.message, diagnostics: [diagnostic] });
      return { diagnostics: [diagnostic], events, cancelled: false };
    }
  }
}

export interface ReadOnlyGuiSnapshot {
  title: string;
  inspection: unknown;
  suggestions: unknown;
  plan: unknown;
  diagnostics: Diagnostic[];
}

export function renderReadOnlyGui(snapshot: ReadOnlyGuiSnapshot): string {
  const encoded = JSON.stringify(snapshot).replaceAll("<", "\\u003c");
  const title = snapshot.title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body>
<main><h1>${title}</h1><p>Read-only AdrenAI application API proof of concept.</p><pre id="snapshot"></pre></main>
<script>document.getElementById("snapshot").textContent = JSON.stringify(${encoded}, null, 2);</script>
</body>
</html>`;
}
