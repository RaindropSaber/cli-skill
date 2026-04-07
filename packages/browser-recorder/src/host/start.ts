import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { buildRecorderBridgeScript } from "../bridge/build-recorder-script.js";
import type { BrowserRecorderResult } from "../model/types.js";
import { RecorderSession } from "../session/recorder-session.js";
import { createRecorderSessionPaths } from "../storage/paths.js";
import { createActionStore } from "../storage/action-store.js";
import { createNetworkStore } from "../storage/network-store.js";
import { createDomSnapshotStore } from "../storage/dom-snapshot-store.js";
import { writeJson, writeJsonLines } from "../storage/io.js";
import { createTimeline } from "../summary/timeline.js";
import { createSummary } from "../summary/summary.js";
import { createPageCollector } from "../collectors/page-collector.js";
import { registerNetworkCollector } from "../collectors/network-collector.js";
import { createDomSnapshotCollector, type DomSnapshotPayload } from "../collectors/dom-snapshot-collector.js";
import { registerBridgeBindings } from "../bridge/bindings.js";
import { createId } from "../utils/id.js";

interface StartBrowserRecorderOptions {
  storageRoot: string;
  browserExecutablePath?: string;
  browserUserDataDir: string;
}

type StopReason = BrowserRecorderResult["stopReason"];

export async function startBrowserRecorder(
  options: StartBrowserRecorderOptions,
): Promise<BrowserRecorderResult> {
  const paths = await createRecorderSessionPaths(
    options.storageRoot,
    options.browserUserDataDir,
  );
  const session = new RecorderSession({
    sessionId: paths.recordingDir.split("/").at(-1) ?? createId("rec"),
    recordingDir: paths.recordingDir,
    summaryPath: paths.summaryPath,
  });
  const actionStore = createActionStore(paths.actionsPath);
  const networkStore = createNetworkStore(paths.networkPath);
  const domSnapshotStore = createDomSnapshotStore(paths.domPath);
  const domSnapshotCollector = createDomSnapshotCollector(domSnapshotStore);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let resolveResult: ((value: BrowserRecorderResult) => void) | null = null;
  let shutdownPromise: Promise<void> | null = null;
  let overlayScript = "";

  async function persistDerivedArtifacts(): Promise<void> {
    await writeJsonLines(paths.timelinePath, createTimeline({
      actions: actionStore.records,
      network: networkStore.records,
      domSnapshots: domSnapshotStore.records,
    }));
  }

  async function persistResult(): Promise<void> {
    session.updateFinalUrl(page?.url());
    if (context) {
      try {
        await context.storageState({ path: paths.storageStatePath });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Target page, context or browser has been closed")) {
          throw error;
        }
      }
    }
    const summary = createSummary({
      sessionId: session.sessionId,
      recordingDir: paths.recordingDir,
      startedAt: session.getState().startedAt,
      endedAt: session.getState().endedAt,
      finalUrl: session.getState().finalUrl,
      stopReason: session.getState().stopReason,
      actions: actionStore.records,
      network: networkStore.records,
      domSnapshots: domSnapshotStore.records,
      paths,
    });
    await persistDerivedArtifacts();
    await writeJson(paths.summaryPath, summary);
  }

  function handleExternalClose(reason: StopReason) {
    if (shutdownPromise) {
      return;
    }
    session.beginStop(reason, page?.url());
    void shutdown(reason, { closeBrowser: false });
  }

  async function injectOverlay(targetPage: Page) {
    await targetPage.addInitScript({ content: overlayScript });
    await targetPage.evaluate(overlayScript).catch(() => undefined);
  }

  async function finalizeResult() {
    if (session.isFinished) {
      return;
    }

    await persistResult();
    session.finish();
    resolveResult?.(session.toResult());
  }

  async function shutdown(reason: StopReason, options?: { closeBrowser?: boolean }): Promise<void> {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      try {
        await finalizeResult();
      } finally {
        if (context) {
          await context.close().catch(() => undefined);
        }
        if (options?.closeBrowser !== false && browser?.isConnected()) {
          await browser.close().catch(() => undefined);
        }
      }
    })();

    return shutdownPromise;
  }

  console.log(`Browser recorder session: ${session.sessionId}`);
  console.log(`Recording directory: ${paths.recordingDir}`);

  await actionStore.init();
  await networkStore.init();
  await domSnapshotStore.init();
  await writeJsonLines(paths.timelinePath, []);
  await writeJson(paths.summaryPath, createSummary({
    sessionId: session.sessionId,
    recordingDir: paths.recordingDir,
    startedAt: session.getState().startedAt,
    endedAt: session.getState().endedAt,
    finalUrl: session.getState().finalUrl,
    stopReason: session.getState().stopReason,
    actions: actionStore.records,
    network: networkStore.records,
    domSnapshots: domSnapshotStore.records,
    paths,
  }));

  try {
    context = await chromium.launchPersistentContext(paths.userDataDir, {
      headless: false,
      executablePath: options.browserExecutablePath || undefined,
      viewport: { width: 1440, height: 960 },
      args: ["--window-size=1440,960"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist") || message.includes("Please run the following command to download new browsers")) {
      throw new Error(
        [
          "Playwright browser binaries are not installed for browser recorder.",
          "Run `bunx playwright install chromium` and try again.",
          "",
          message,
        ].join("\n"),
      );
    }
    throw error;
  }

  browser = context.browser();
  if (!browser) {
    await context.close().catch(() => undefined);
    throw new Error("Failed to get browser instance from persistent context.");
  }

  overlayScript = await buildRecorderBridgeScript(session.sessionId);
  await context.addInitScript({ content: overlayScript });
  const pageCollector = createPageCollector({
    context,
    actionStore,
    isRecording: () => session.active,
    onAllPagesClosed: () => handleExternalClose("browser_closed"),
    onPageActivated: (nextPage) => {
      page = nextPage;
    },
    injectOverlay,
  });
  await registerBridgeBindings({
    context,
    getState: () => session.getState(),
    isRecording: () => session.active,
    actionStore,
    onClickAction: async (sourcePage, record) => {
      await domSnapshotCollector.capturePageSnapshot(sourcePage, {
        actionId: record.actionId,
        type: record.type,
        selector: record.selector,
        text: record.text,
      });
      await persistDerivedArtifacts();
    },
    onDomSnapshot: async (payload, trigger) => {
      await domSnapshotCollector.persistPayload(payload, trigger);
      await persistDerivedArtifacts();
    },
  });
  registerNetworkCollector({
    context,
    networkStore,
    isRecording: () => session.active,
  });

  context.on("close", () => {
    handleExternalClose("browser_closed");
  });
  browser.on("disconnected", () => {
    handleExternalClose("browser_closed");
  });

  page = await pageCollector.init();
  await page.goto("about:blank");

  return await new Promise<BrowserRecorderResult>((resolve) => {
    resolveResult = resolve;
  });
}
