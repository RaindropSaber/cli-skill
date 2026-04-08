import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { z } from "zod";

describe("runTool", () => {
  let createRuntimeCalls: Array<Record<string, unknown>>;

  beforeEach(() => {
    createRuntimeCalls = [];
    mock.module("../src/runtime", () => ({
      createRuntime: async (options: Record<string, unknown>) => {
        createRuntimeCalls.push(options);
        return {
          skill: { name: "demo" },
          config: { value: {}, get: () => undefined, set: () => {} },
          env: {},
          paths: {
            storageRoot: "/tmp/demo-storage",
            browserUserDataDir: "/tmp/demo-storage/user-data",
            authDir: "/tmp/demo-storage/user-data/.auth",
            screenshotsDir: "/tmp/demo-storage/screenshots",
            tracesDir: "/tmp/demo-storage/traces",
          },
          storageStatePath: "/tmp/demo-storage/user-data/.auth/user.json",
          browserRunRecording: {
            sessionId: "rec_test",
            recordingDir: "/tmp/browser-runs/rec_test",
            summaryPath: "/tmp/browser-runs/rec_test/summary.json",
          },
        };
      },
      disposeRuntime: async () => undefined,
    }));
  });

  afterEach(() => {
    mock.restore();
  });

  test("includes browser run recording paths when tool execution fails", async () => {
    const { defineSkill, defineTool } = await import("../src/skill");
    const { runTool } = await import("../src/run");

    const tool = defineTool({
      name: "explode",
      description: "explode",
      plugins: [],
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      async run() {
        throw new Error("boom");
      },
    });

    const skill = defineSkill({
      name: "demo",
      description: "demo",
      config: {},
      tools: [tool],
    });

    await expect(runTool(skill, "explode", "{}")).rejects.toMatchObject({
      message: expect.stringContaining("Browser run recording:"),
      browserRunRecording: {
        sessionId: "rec_test",
        recordingDir: "/tmp/browser-runs/rec_test",
        summaryPath: "/tmp/browser-runs/rec_test/summary.json",
      },
    });
  });

  test("uses tool headed default when cli flags are absent", async () => {
    const { defineSkill, defineTool } = await import("../src/skill");
    const { runTool } = await import("../src/run");

    const tool = defineTool({
      name: "open_visible",
      description: "open visible",
      plugins: [],
      headed: true,
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      async run() {
        return { ok: true };
      },
    });

    const skill = defineSkill({
      name: "demo",
      description: "demo",
      config: {},
      tools: [tool],
    });

    await runTool(skill, "open_visible", "{}");

    expect(createRuntimeCalls.at(-1)).toMatchObject({
      headed: true,
      skill,
    });
  });

  test("headless flag overrides tool headed default", async () => {
    const { defineSkill, defineTool } = await import("../src/skill");
    const { runTool } = await import("../src/run");

    const tool = defineTool({
      name: "open_visible",
      description: "open visible",
      plugins: [],
      headed: true,
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      async run() {
        return { ok: true };
      },
    });

    const skill = defineSkill({
      name: "demo",
      description: "demo",
      config: {},
      tools: [tool],
    });

    await runTool(skill, "open_visible", "{}", { headless: true });

    expect(createRuntimeCalls.at(-1)).toMatchObject({
      headed: false,
      skill,
    });
  });
});
