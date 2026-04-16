import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

interface MockPage {
  url(): string;
}

interface MockContext {
  browser(): object;
  pages(): MockPage[];
  newPage(): Promise<MockPage>;
  request: object;
  close(): Promise<void>;
}

describe("browserPlugin", () => {
  const originalCwd = process.cwd();
  let calls: {
    attach: Array<Record<string, unknown>>;
    finalize: string[];
    contextClosed: number;
  };

  beforeEach(() => {
    calls = {
      attach: [],
      finalize: [],
      contextClosed: 0,
    };

    mock.module("playwright", () => {
      const page: MockPage = {
        url: () => "https://example.com",
      };
      const browser = { isConnected: () => true };
      const context: MockContext = {
        browser: () => browser,
        pages: () => [page],
        newPage: async () => page,
        request: {},
        close: async () => {
          calls.contextClosed += 1;
        },
      };

      return {
        chromium: {
          launchPersistentContext: async () => context,
        },
      };
    });

    mock.module("@cli-skill/browser-recorder", () => ({
      attachBrowserRecorder: async (args: Record<string, unknown>) => {
        calls.attach.push(args);
        return {
          sessionId: "rec_test",
          recordingDir: "/tmp/browser-runs/rec_test",
          summaryPath: "/tmp/browser-runs/rec_test/summary.json",
          finalize: async (reason = "completed") => {
            calls.finalize.push(String(reason));
            return {
              sessionId: "rec_test",
              recordingDir: "/tmp/browser-runs/rec_test",
              summaryPath: "/tmp/browser-runs/rec_test/summary.json",
              stopReason: reason,
            };
          },
        };
      },
    }));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    mock.restore();
  });

  test("attaches shared browser recorder when recordBrowserRun is enabled", async () => {
    const { browserPlugin } = await import("../src/plugins/browser");

    const ctx = {
      skill: { name: "demo" },
      config: { value: {}, get: () => undefined, set: () => {} },
      env: {},
      paths: {
        storageRoot: "/tmp/demo-storage/user-data",
        browserRunsRoot: "/tmp/.cli-skill/browser-runs",
        browserUserDataDir: "/tmp/demo-storage/user-data",
        screenshotsDir: "/tmp/demo-storage/user-data/screenshots",
        tracesDir: "/tmp/demo-storage/user-data/traces",
      },
    };

    const pluginCtx = await browserPlugin.setup(ctx, {
      headed: true,
      skill: {
        name: "demo",
        description: "demo",
        config: {},
        tools: [],
      },
      globalConfig: {
        recordBrowserRun: true,
        browserExecutablePath: "",
      },
    });

    expect(calls.attach).toHaveLength(1);
    expect(calls.attach[0]).toMatchObject({
      storageRoot: ctx.paths.browserRunsRoot,
      browserUserDataDir: ctx.paths.browserUserDataDir,
      showIndicator: false,
    });
    expect(pluginCtx.browserRunRecording).toEqual({
      sessionId: "rec_test",
      recordingDir: "/tmp/browser-runs/rec_test",
      summaryPath: "/tmp/browser-runs/rec_test/summary.json",
    });

    await browserPlugin.dispose({
      ...ctx,
      ...pluginCtx,
    });

    expect(calls.finalize).toEqual(["completed"]);
    expect(calls.contextClosed).toBe(1);
  });

  test("does not attach browser recorder when recordBrowserRun is disabled", async () => {
    const { browserPlugin } = await import("../src/plugins/browser");

    const ctx = {
      skill: { name: "demo" },
      config: { value: {}, get: () => undefined, set: () => {} },
      env: {},
      paths: {
        storageRoot: "/tmp/demo-storage/user-data",
        browserRunsRoot: "/tmp/.cli-skill/browser-runs",
        browserUserDataDir: "/tmp/demo-storage/user-data",
        screenshotsDir: "/tmp/demo-storage/user-data/screenshots",
        tracesDir: "/tmp/demo-storage/user-data/traces",
      },
    };

    const pluginCtx = await browserPlugin.setup(ctx, {
      headed: true,
      skill: {
        name: "demo",
        description: "demo",
        config: {},
        tools: [],
      },
      globalConfig: {
        recordBrowserRun: false,
        browserExecutablePath: "",
      },
    });

    expect(calls.attach).toHaveLength(0);
    expect(pluginCtx.browserRunRecording).toBeUndefined();

    await browserPlugin.dispose({
      ...ctx,
      ...pluginCtx,
    });

    expect(calls.finalize).toEqual([]);
    expect(calls.contextClosed).toBe(1);
  });
});
