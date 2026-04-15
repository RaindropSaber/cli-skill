import type { Browser, BrowserContext, Page } from "playwright";
import { buildRecorderBridgeScript } from "../bridge/build-recorder-script.js";
import { registerBridgeBindings } from "../bridge/bindings.js";
import { createDomSnapshotCollector } from "../collectors/dom-snapshot-collector.js";
import { registerNetworkCollector } from "../collectors/network-collector.js";
import { createPageCollector } from "../collectors/page-collector.js";
import type { BrowserRecorderResult } from "../model/types.js";
import { RecorderSession } from "../session/recorder-session.js";
import { createActionStore } from "../storage/action-store.js";
import { createDomSnapshotStore } from "../storage/dom-snapshot-store.js";
import { writeJson, writeJsonLines } from "../storage/io.js";
import { createNetworkStore } from "../storage/network-store.js";
import { createRecorderSessionPaths } from "../storage/paths.js";
import { createSummary } from "../summary/summary.js";
import { createTimeline } from "../summary/timeline.js";
import { createId } from "../utils/id.js";

type StopReason = BrowserRecorderResult["stopReason"];

export interface AttachedRecorderHandle {
  sessionId: string;
  recordingDir: string;
  summaryPath: string;
  finalize(reason?: StopReason): Promise<BrowserRecorderResult>;
}

export async function attachBrowserRecorder(args: {
  storageRoot: string;
  browserUserDataDir: string;
  context: BrowserContext;
  browser: Browser;
  page?: Page;
  showIndicator?: boolean;
}): Promise<AttachedRecorderHandle> {
  const paths = await createRecorderSessionPaths(args.storageRoot, args.browserUserDataDir);
  const session = new RecorderSession({
    sessionId: paths.recordingDir.split("/").at(-1) ?? createId("rec"),
    recordingDir: paths.recordingDir,
    summaryPath: paths.summaryPath,
  });
  const actionStore = createActionStore(paths.actionsPath);
  const networkStore = createNetworkStore(paths.networkPath);
  const domSnapshotStore = createDomSnapshotStore(paths.domPath);
  const domSnapshotCollector = createDomSnapshotCollector(domSnapshotStore);
  let currentPage = args.page ?? null;
  const pageIds = new WeakMap<Page, string>();
  let finalizePromise: Promise<BrowserRecorderResult> | null = null;

  function getPageId(targetPage: Page): string {
    const existing = pageIds.get(targetPage);
    if (existing) {
      return existing;
    }
    const next = createId("page");
    pageIds.set(targetPage, next);
    return next;
  }

  async function persistDerivedArtifacts(): Promise<void> {
    await writeJsonLines(paths.timelinePath, createTimeline({
      actions: actionStore.records,
      network: networkStore.records,
      domSnapshots: domSnapshotStore.records,
    }));
  }

  async function persistResult(): Promise<void> {
    session.updateFinalUrl(currentPage?.url());
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

  async function injectBridge(targetPage: Page) {
    const bridgeScript = await buildRecorderBridgeScript(session.sessionId, {
      showIndicator: args.showIndicator ?? false,
    });
    await targetPage.addInitScript({ content: bridgeScript });
    await targetPage.evaluate(bridgeScript).catch(() => undefined);
  }

  async function finalize(reason: StopReason = "completed"): Promise<BrowserRecorderResult> {
    if (finalizePromise) {
      return finalizePromise;
    }

    finalizePromise = (async () => {
      session.beginStop(reason, currentPage?.url());
      await persistResult();
      session.finish();
      return session.toResult();
    })();

    return finalizePromise;
  }

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

  await args.context.addInitScript({
    content: await buildRecorderBridgeScript(session.sessionId, {
      showIndicator: args.showIndicator ?? false,
    }),
  });

  const pageCollector = createPageCollector({
    context: args.context,
    actionStore,
    isRecording: () => session.active,
    onAllPagesClosed: () => {
      void finalize("browser_closed");
    },
    onPageActivated: (page) => {
      currentPage = page;
    },
    injectOverlay: injectBridge,
    getPageId,
  });

  await registerBridgeBindings({
    context: args.context,
    getState: () => session.getState(),
    isRecording: () => session.active,
    actionStore,
    getPageId,
    onActionPage: (page) => {
      currentPage = page;
    },
    onDomSnapshot: async (sourcePage, payload, trigger) => {
      if (sourcePage) {
        currentPage = sourcePage;
        payload.pageId = getPageId(sourcePage);
      }
      await domSnapshotCollector.persistPayload(payload, trigger);
      await persistDerivedArtifacts();
    },
  });

  registerNetworkCollector({
    context: args.context,
    networkStore,
    isRecording: () => session.active,
    getPageId,
  });

  args.context.on("close", () => {
    void finalize("browser_closed");
  });
  args.browser.on("disconnected", () => {
    void finalize("browser_closed");
  });

  currentPage = await pageCollector.init();

  return {
    sessionId: session.sessionId,
    recordingDir: paths.recordingDir,
    summaryPath: paths.summaryPath,
    finalize,
  };
}
