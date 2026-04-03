import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Frame, type Page, type Request, type Response } from "playwright";
import {
  appendJsonLine,
  createRecorderSessionPaths,
  createSummary,
  createTimeline,
  writeDomSnapshots,
  writeJson,
  writeKeyframes,
  writeSummary,
  writeText,
  writeTimeline,
} from "./storage.js";
import { getOverlayScript } from "./page/overlay.js";
import { getRecordPageHtml } from "./page/record.js";
import { getReviewPageHtml } from "./page/review.js";
import type {
  BrowserRecorderResult,
  RecorderActionRecord,
  RecorderDomSnapshotRecord,
  RecorderKeyframeRecord,
  RecorderNetworkRecord,
} from "./types.js";

interface StartBrowserRecorderOptions {
  storageRoot: string;
  browserStorageRoot: string;
}

interface ToggleResult {
  active: boolean;
}

interface FinishPayload {}

interface KeyframePayload {
  timestamp: string;
  url: string;
  title?: string;
}

interface DomSnapshotPayload {
  timestamp: string;
  url: string;
  title?: string;
  html: string;
  targetSelector?: string;
  targetText?: string;
}

interface BindingSourceLike {
  page?: Page;
}

const RESPONSE_PREVIEW_LIMIT = 4_000;
type StopReason = BrowserRecorderResult["stopReason"];

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function respondJson(response: import("node:http").ServerResponse, value: unknown) {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function tryParseJson(value: string | null): unknown {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function truncatePreview(value: string, limit = RESPONSE_PREVIEW_LIMIT): string {
  return value.length > limit ? `${value.slice(0, limit)}\n...[truncated]` : value;
}

export async function startBrowserRecorder(
  options: StartBrowserRecorderOptions,
): Promise<BrowserRecorderResult> {
  const sessionId = createId("rec");
  const paths = await createRecorderSessionPaths(options.storageRoot, options.browserStorageRoot);
  const actions: RecorderActionRecord[] = [];
  const network: RecorderNetworkRecord[] = [];
  const keyframes: RecorderKeyframeRecord[] = [];
  const domSnapshots: RecorderDomSnapshotRecord[] = [];

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let active = false;
  let startedAt: string | undefined;
  let endedAt: string | undefined;
  let finalUrl: string | undefined;
  let resolveResult: ((value: BrowserRecorderResult) => void) | null = null;
  let resolved = false;
  let finalizing = false;
  let serverPort = 0;
  let shutdownPromise: Promise<void> | null = null;
  let serverClosed = false;
  let stopReason: StopReason | null = null;
  const trackedPages = new Set<Page>();

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (requestUrl.pathname === `/sessions/${sessionId}/record`) {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(getRecordPageHtml(sessionId, `http://127.0.0.1:${serverPort}/sessions/${sessionId}`));
      return;
    }

    if (requestUrl.pathname === `/sessions/${sessionId}`) {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(getReviewPageHtml(sessionId));
      return;
    }

    if (requestUrl.pathname === `/api/sessions/${sessionId}/export`) {
      const reviewUrl = `http://127.0.0.1:${serverPort}/sessions/${sessionId}`;
      const summary = createSummary({
        sessionId,
        recordingDir: paths.recordingDir,
        reviewUrl,
        startedAt,
        endedAt,
        finalUrl,
        actions,
        network,
        keyframes,
        domSnapshots,
        paths,
      });
      const timeline = createTimeline({ actions, network });
      respondJson(response, {
        summary,
        timeline,
        actions,
        network,
        domSnapshots,
        keyframes: keyframes.map((item) => ({
          ...item,
          screenshotUrl: `/assets/${path.basename(item.screenshotPath)}`,
        })),
      });
      return;
    }

    if (requestUrl.pathname.startsWith("/assets/")) {
      const assetName = path.basename(requestUrl.pathname);
      const assetPath = path.join(paths.assetsDir, assetName);
      try {
        const file = await readFile(assetPath);
        response.statusCode = 200;
        response.setHeader("content-type", "image/png");
        response.end(file);
      } catch {
        response.statusCode = 404;
        response.end("Not found");
      }
      return;
    }

    response.statusCode = 404;
    response.end("Not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start browser recorder server.");
  }
  serverPort = address.port;

  const reviewUrl = `http://127.0.0.1:${serverPort}/sessions/${sessionId}`;
  const recordUrl = `http://127.0.0.1:${serverPort}/sessions/${sessionId}/record`;
  console.log(`Browser recorder session: ${sessionId}`);
  console.log(`Recording directory: ${paths.recordingDir}`);
  console.log(`Record URL: ${recordUrl}`);
  console.log(`Review URL: ${reviewUrl}`);

  await writeJson(paths.metaPath, {
    sessionId,
    startedAt: null,
    endedAt: null,
    finalUrl: null,
    reviewUrl,
    recordingDir: paths.recordingDir,
  });
  await writeText(paths.actionsPath, "");
  await writeText(paths.networkPath, "");
  await writeKeyframes(paths.keyframesPath, keyframes);
  await writeDomSnapshots(paths.domSnapshotsPath, domSnapshots);
  await writeTimeline(paths.timelinePath, []);
  await writeSummary(paths.summaryPath, createSummary({
    sessionId,
    recordingDir: paths.recordingDir,
    reviewUrl,
    startedAt,
    endedAt,
    finalUrl,
    actions,
    network,
    keyframes,
    domSnapshots,
    paths,
  }));

  async function persistDerivedArtifacts() {
    await writeDomSnapshots(paths.domSnapshotsPath, domSnapshots);
    await writeTimeline(paths.timelinePath, createTimeline({ actions, network }));
  }

  async function persistResult() {
    finalUrl = page?.url() ?? finalUrl;
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
      sessionId,
      recordingDir: paths.recordingDir,
      reviewUrl,
      startedAt,
      endedAt,
      finalUrl,
      actions,
      network,
      keyframes,
      domSnapshots,
      paths,
    });
    await persistDerivedArtifacts();
    await writeSummary(paths.summaryPath, summary);
    await writeJson(paths.metaPath, {
      sessionId,
      startedAt,
      endedAt,
      finalUrl,
      reviewUrl,
      recordingDir: paths.recordingDir,
    });
  }

  function currentState(): ToggleResult {
    return { active: active && !finalizing };
  }

  function attachPage(nextPage: Page) {
    if (trackedPages.has(nextPage)) {
      return;
    }
    trackedPages.add(nextPage);

    nextPage.on("framenavigated", async (frame: Frame) => {
      if (frame !== nextPage.mainFrame() || !active) {
        return;
      }

      const record: RecorderActionRecord = {
        id: createId("act"),
        type: "navigate",
        timestamp: new Date().toISOString(),
        url: frame.url(),
        title: await nextPage.title().catch(() => undefined),
      };
      actions.push(record);
      await appendJsonLine(paths.actionsPath, record);
    });

    nextPage.on("close", () => {
      trackedPages.delete(nextPage);
      if (page === nextPage) {
        page = null;
      }
    });
  }

  async function captureDomSnapshot(
    targetPage: Page,
    trigger?: { actionId?: string; type?: RecorderActionRecord["type"]; selector?: string; text?: string },
  ) {
    const snapshotId = createId("dom");
    const htmlPath = path.join(paths.domDir, `${snapshotId}.html`);
    const snapshot = await targetPage.evaluate(() => {
      function findPrimaryContainer(): Element | null {
        const selectors = [
          '[role="dialog"]',
          ".n-modal",
          ".n-drawer",
          ".n-popover",
          "form",
          "main",
          "body",
        ];
        for (const selector of selectors) {
          const node = document.querySelector(selector);
          if (node) return node;
        }
        return document.body;
      }

      const container = findPrimaryContainer();
      return {
        url: location.href,
        title: document.title,
        html: (container?.outerHTML || document.body?.outerHTML || "").trim(),
      };
    });

    await writeText(htmlPath, snapshot.html);
    const record: RecorderDomSnapshotRecord = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      url: snapshot.url,
      title: snapshot.title,
      triggerActionId: trigger?.actionId,
      triggerType: trigger?.type,
      targetSelector: trigger?.selector,
      targetText: trigger?.text,
      htmlPath,
    };
    domSnapshots.push(record);
    await persistDerivedArtifacts();
  }

  async function persistDomSnapshot(
    payload: DomSnapshotPayload,
    trigger?: { actionId?: string; type?: RecorderActionRecord["type"] | "mutation"; selector?: string; text?: string },
  ) {
    const snapshotId = createId("dom");
    const htmlPath = path.join(paths.domDir, `${snapshotId}.html`);
    await writeText(htmlPath, payload.html);
    const record: RecorderDomSnapshotRecord = {
      id: snapshotId,
      timestamp: payload.timestamp,
      url: payload.url,
      title: payload.title,
      triggerActionId: trigger?.actionId,
      triggerType: trigger?.type,
      targetSelector: trigger?.selector ?? payload.targetSelector,
      targetText: trigger?.text ?? payload.targetText,
      htmlPath,
    };
    domSnapshots.push(record);
    await persistDerivedArtifacts();
  }

  async function finalizeResult() {
    if (resolved) {
      return;
    }

    await persistResult();
    resolved = true;
    resolveResult?.({
      sessionId,
      recordingDir: paths.recordingDir,
      reviewUrl,
      summaryPath: paths.summaryPath,
      stopReason: stopReason ?? "browser_closed",
    });
  }

  async function closeServer(): Promise<void> {
    if (serverClosed) {
      return;
    }
    serverClosed = true;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  async function shutdown(reason: StopReason, options?: { closeBrowser?: boolean }): Promise<void> {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    stopReason ??= reason;

    shutdownPromise = (async () => {
      try {
        await finalizeResult();
      } finally {
        await closeServer();
        if (options?.closeBrowser !== false && browser?.isConnected()) {
          await browser.close().catch(() => undefined);
        }
      }
    })();

    return shutdownPromise;
  }

  try {
    browser = await chromium.launch({ headless: false });
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
  const storageState = (await fileExists(paths.storageStatePath)) ? paths.storageStatePath : undefined;
  context = await browser.newContext({ storageState });
  await context.addInitScript({
    content: getOverlayScript(sessionId, reviewUrl),
  });
  await context.exposeBinding("__cliSkillRecorderGetState", async () => currentState());
  await context.exposeBinding("__cliSkillRecorderToggle", async () => {
    active = !active;
    if (active && !startedAt) {
      startedAt = new Date().toISOString();
      endedAt = undefined;
    }
    if (!active) {
      endedAt = new Date().toISOString();
      finalUrl = page?.url() ?? finalUrl;
    }
    return currentState();
  });
  await context.exposeBinding(
    "__cliSkillRecorderStop",
    async (source: BindingSourceLike, _payload: FinishPayload) => {
      if (finalizing) {
        return currentState();
      }

      finalizing = true;
      active = false;
      endedAt = new Date().toISOString();

      const targetPage = source.page ?? page;
      finalUrl = targetPage?.url() ?? finalUrl;
      await persistResult();

      stopReason = "user_stop";

      // Resolve the page-side binding first, then tear everything down explicitly.
      queueMicrotask(() => {
        void shutdown("user_stop");
      });
      return currentState();
    },
  );
  await context.exposeBinding(
    "__cliSkillRecorderAction",
    async (_source: BindingSourceLike, record: Omit<RecorderActionRecord, "id">) => {
      if (!active) {
        return;
      }

      const nextRecord: RecorderActionRecord = {
        id: createId("act"),
        ...record,
      };
      actions.push(nextRecord);
      await appendJsonLine(paths.actionsPath, nextRecord);

      if (_source.page && nextRecord.type === "click") {
        queueMicrotask(() => {
          void captureDomSnapshot(_source.page!, {
            actionId: nextRecord.id,
            type: nextRecord.type,
            selector: nextRecord.selector,
            text: nextRecord.text,
          }).catch(() => undefined);
        });
      }
    },
  );
  await context.exposeBinding(
    "__cliSkillRecorderCaptureKeyframe",
    async (source: BindingSourceLike, payload: KeyframePayload) => {
      const targetPage = source.page ?? page;
      if (!targetPage) {
        return;
      }

      const keyframeId = createId("keyframe");
      const screenshotPath = path.join(paths.assetsDir, `${keyframeId}.png`);
      await targetPage.screenshot({ path: screenshotPath, fullPage: true });
      const record: RecorderKeyframeRecord = {
        id: keyframeId,
        timestamp: payload.timestamp,
        url: payload.url,
        title: payload.title,
        screenshotPath,
      };
      keyframes.push(record);
      await writeKeyframes(paths.keyframesPath, keyframes);
    },
  );
  await context.exposeBinding(
    "__cliSkillRecorderDomSnapshot",
    async (_source: BindingSourceLike, payload: DomSnapshotPayload) => {
      if (!active || !payload.html?.trim()) {
        return;
      }
      await persistDomSnapshot(payload, {
        type: "mutation",
        selector: payload.targetSelector,
        text: payload.targetText,
      });
    },
  );
  page = await context.newPage();
  attachPage(page);
  context.on("page", (nextPage) => {
    page = nextPage;
    attachPage(nextPage);
  });

  context.on("request", async (request: Request) => {
    if (!active) {
      return;
    }

    const postData = request.postData();

    const record: RecorderNetworkRecord = {
      id: createId("net"),
      phase: "request",
      timestamp: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      postData: postData ?? undefined,
      postDataJson: tryParseJson(postData ?? null),
    };
    network.push(record);
    await appendJsonLine(paths.networkPath, record);
  });

  context.on("response", async (response: Response) => {
    if (!active) {
      return;
    }

    const request = response.request();
    let responseBodyPreview: string | undefined;
    try {
      const bodyText = await response.text();
      responseBodyPreview = bodyText ? truncatePreview(bodyText) : undefined;
    } catch {}

    const record: RecorderNetworkRecord = {
      id: createId("net"),
      phase: "response",
      timestamp: new Date().toISOString(),
      url: response.url(),
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
      contentType: response.headers()["content-type"],
      responseBodyPreview,
    };
    network.push(record);
    await appendJsonLine(paths.networkPath, record);
  });

  browser.on("disconnected", () => {
    if (!shutdownPromise) {
      finalizing = true;
      active = false;
      endedAt ??= new Date().toISOString();
      finalUrl = page?.url() ?? finalUrl;
      void shutdown("browser_closed", { closeBrowser: false });
    }
  });

  await page.goto(recordUrl);

  try {
    return await new Promise<BrowserRecorderResult>((resolve) => {
      resolveResult = resolve;
    });
  } catch (error) {
    stopReason = "error";
    throw error;
  }
}

export * from "./types.js";
