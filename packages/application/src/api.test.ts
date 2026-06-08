import { describe, expect, it, vi } from "vitest";
import { AdrenaiApplicationApi, renderReadOnlyGui, type ApplicationApiServices } from "./api.js";

function services(): ApplicationApiServices {
  return {
    inspect: vi.fn(async () => ({ files: 4 })),
    suggest: vi.fn(async () => ({ strategies: ["reliable"] })),
    select: vi.fn(async () => ({ selected: ["reliable"] })),
    plan: vi.fn(async () => ({
      value: { phases: ["implement", "validate"] },
      approval: {
        id: "approval-1",
        operation: "execute",
        summary: "Write managed guidance.",
        effectPaths: [".adrenai/generated.json"],
        commands: [],
      },
    })),
    execute: vi.fn(async () => ({ written: [".adrenai/generated.json"] })),
    resume: vi.fn(async () => ({ session: "active" })),
    validate: vi.fn(async () => ({ value: { valid: true }, diagnostics: [] })),
  };
}

describe("UI-neutral application API", () => {
  it("exposes inspect, suggest, select, plan, resume, and validate with structured events", async () => {
    const adapters = services();
    const api = new AdrenaiApplicationApi(adapters);
    const observed: string[] = [];

    expect((await api.inspect({ root: "/project", onEvent: ({ stage }) => observed.push(stage) })).value)
      .toEqual({ files: 4 });
    expect((await api.suggest({ root: "/project" })).value).toEqual({ strategies: ["reliable"] });
    expect((await api.select({ root: "/project" })).value).toEqual({ selected: ["reliable"] });
    expect((await api.plan({ root: "/project" })).approval?.id).toBe("approval-1");
    expect((await api.resume({ root: "/project" })).value).toEqual({ session: "active" });
    expect((await api.validate({ root: "/project" })).value).toEqual({ valid: true });
    expect(adapters.validate).toHaveBeenCalledTimes(1);
    expect(observed).toEqual(["started", "completed"]);
  });

  it("requires matching approval before trusted execute services can run", async () => {
    const adapters = services();
    const api = new AdrenaiApplicationApi(adapters);
    const blocked = await api.execute({ root: "/project" });
    const approved = await api.execute({
      root: "/project",
      approval: { requestId: "approval-1", approved: true },
    });

    expect(blocked.diagnostics[0]?.id).toBe("application/approval-required");
    expect(adapters.execute).toHaveBeenCalledTimes(1);
    expect(approved.value).toEqual({ written: [".adrenai/generated.json"] });
  });

  it("supports cancellation without invoking trusted services", async () => {
    const adapters = services();
    const api = new AdrenaiApplicationApi(adapters);
    const cancelled = await api.execute({
      root: "/project",
      cancellation: { cancelled: true },
    });

    expect(cancelled.cancelled).toBe(true);
    expect(adapters.plan).not.toHaveBeenCalled();
    expect(adapters.execute).not.toHaveBeenCalled();
  });

  it("renders a minimal escaped read-only GUI snapshot", () => {
    const html = renderReadOnlyGui({
      title: "AdrenAI <Overview>",
      inspection: { root: "</script><script>bad()</script>" },
      suggestions: { strategies: ["reliable"] },
      plan: { phases: ["validate"] },
      diagnostics: [],
    });

    expect(html).toContain("Read-only AdrenAI application API proof of concept.");
    expect(html).not.toContain("</script><script>bad()");
    expect(html).toContain("\\u003c/script>");
    expect(html).toContain("AdrenAI &lt;Overview&gt;");
  });
});
