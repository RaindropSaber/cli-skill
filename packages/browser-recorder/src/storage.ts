import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  RecorderActionRecord,
  RecorderDomSnapshotRecord,
  RecorderKeyframeRecord,
  RecorderNetworkRecord,
  RecorderSummary,
  RecorderTimelineRecord,
} from "./types.js";

export interface RecorderSessionPaths {
  recordingDir: string;
  assetsDir: string;
  domDir: string;
  authDir: string;
  storageStatePath: string;
  metaPath: string;
  actionsPath: string;
  networkPath: string;
  keyframesPath: string;
  domSnapshotsPath: string;
  timelinePath: string;
  summaryPath: string;
}

function timestampForDir(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export async function createRecorderSessionPaths(
  recordingRoot: string,
  browserStorageRoot: string,
): Promise<RecorderSessionPaths> {
  const recordingDir = path.join(recordingRoot, timestampForDir());
  const assetsDir = path.join(recordingDir, "assets");
  const domDir = path.join(recordingDir, "dom");
  const authDir = path.join(browserStorageRoot, ".auth");

  await mkdir(assetsDir, { recursive: true });
  await mkdir(domDir, { recursive: true });
  await mkdir(authDir, { recursive: true });

  return {
    recordingDir,
    assetsDir,
    domDir,
    authDir,
    storageStatePath: path.join(authDir, "user.json"),
    metaPath: path.join(recordingDir, "meta.json"),
    actionsPath: path.join(recordingDir, "actions.jsonl"),
    networkPath: path.join(recordingDir, "network.jsonl"),
    keyframesPath: path.join(recordingDir, "keyframes.json"),
    domSnapshotsPath: path.join(recordingDir, "dom-snapshots.json"),
    timelinePath: path.join(recordingDir, "timeline.json"),
    summaryPath: path.join(recordingDir, "summary.json"),
  };
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, value: string): Promise<void> {
  await writeFile(filePath, value, "utf8");
}

export async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function writeKeyframes(
  filePath: string,
  keyframes: RecorderKeyframeRecord[],
): Promise<void> {
  await writeJson(filePath, keyframes);
}

export async function writeSummary(filePath: string, summary: RecorderSummary): Promise<void> {
  await writeJson(filePath, summary);
}

export async function writeDomSnapshots(
  filePath: string,
  snapshots: RecorderDomSnapshotRecord[],
): Promise<void> {
  await writeJson(filePath, snapshots);
}

export async function writeTimeline(
  filePath: string,
  timeline: RecorderTimelineRecord[],
): Promise<void> {
  await writeJson(filePath, timeline);
}

function isKeyJsonResponse(record: RecorderNetworkRecord): boolean {
  return (
    record.phase === "response" &&
    !!record.contentType?.includes("application/json") &&
    typeof record.status === "number" &&
    record.status < 400 &&
    !!record.url.includes("/api/")
  );
}

export function createTimeline(args: {
  actions: RecorderActionRecord[];
  network: RecorderNetworkRecord[];
}): RecorderTimelineRecord[] {
  const items: RecorderTimelineRecord[] = [];

  for (const action of args.actions) {
    if (action.type === "navigate") {
      items.push({
        id: `timeline_${action.id}`,
        type: "navigate",
        timestamp: action.timestamp,
        title: "页面跳转",
        detail: action.url,
        url: action.url,
        actionId: action.id,
      });
      continue;
    }

    if (action.type === "click" || action.type === "submit" || action.type === "change") {
      items.push({
        id: `timeline_${action.id}`,
        type: "action",
        timestamp: action.timestamp,
        title: action.type === "click" ? "点击" : action.type === "submit" ? "提交" : "变更",
        detail:
          action.locatorHints?.name ||
          action.label ||
          action.placeholder ||
          action.text ||
          action.selector ||
          action.tagName,
        url: action.url,
        actionId: action.id,
      });
    }
  }

  for (const record of args.network) {
    if (!isKeyJsonResponse(record)) {
      continue;
    }

    items.push({
      id: `timeline_${record.id}`,
      type: "request",
      timestamp: record.timestamp,
      title: `${record.method ?? "GET"} ${new URL(record.url).pathname}`,
      detail: record.status ? `status ${record.status}` : undefined,
      url: record.url,
      networkId: record.id,
    });
  }

  items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return items;
}

export function createSummary(args: {
  sessionId: string;
  recordingDir: string;
  reviewUrl: string;
  startedAt?: string;
  endedAt?: string;
  finalUrl?: string;
  actions: RecorderActionRecord[];
  network: RecorderNetworkRecord[];
  keyframes: RecorderKeyframeRecord[];
  domSnapshots: RecorderDomSnapshotRecord[];
  paths: RecorderSessionPaths;
}): RecorderSummary {
  return {
    sessionId: args.sessionId,
    startedAt: args.startedAt,
    endedAt: args.endedAt,
    recordingDir: args.recordingDir,
    reviewUrl: args.reviewUrl,
    finalUrl: args.finalUrl,
    actionCount: args.actions.length,
    networkCount: args.network.length,
    keyframeCount: args.keyframes.length,
    domSnapshotCount: args.domSnapshots.length,
    steps: args.actions.map((action) => {
      switch (action.type) {
        case "navigate":
          return `导航到 ${action.url}`;
        case "click":
          return `点击 ${action.selector ?? action.tagName ?? "元素"}`;
        case "input":
        case "change":
          return `输入 ${action.selector ?? action.tagName ?? "字段"}`;
        case "submit":
          return `提交 ${action.selector ?? action.tagName ?? "表单"}`;
        default:
          return `${action.type} ${action.selector ?? action.url}`;
      }
    }),
    artifacts: {
      meta: args.paths.metaPath,
      actions: args.paths.actionsPath,
      network: args.paths.networkPath,
      keyframes: args.paths.keyframesPath,
      domSnapshots: args.paths.domSnapshotsPath,
      domDir: args.paths.domDir,
      timeline: args.paths.timelinePath,
      summary: args.paths.summaryPath,
      assetsDir: args.paths.assetsDir,
    },
  };
}
