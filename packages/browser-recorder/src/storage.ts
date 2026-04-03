import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  RecorderActionRecord,
  RecorderKeyframeRecord,
  RecorderNetworkRecord,
  RecorderSummary,
} from "./types.js";

export interface RecorderSessionPaths {
  recordingDir: string;
  assetsDir: string;
  authDir: string;
  storageStatePath: string;
  metaPath: string;
  actionsPath: string;
  networkPath: string;
  keyframesPath: string;
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
  const authDir = path.join(browserStorageRoot, ".auth");

  await mkdir(assetsDir, { recursive: true });
  await mkdir(authDir, { recursive: true });

  return {
    recordingDir,
    assetsDir,
    authDir,
    storageStatePath: path.join(authDir, "user.json"),
    metaPath: path.join(recordingDir, "meta.json"),
    actionsPath: path.join(recordingDir, "actions.jsonl"),
    networkPath: path.join(recordingDir, "network.jsonl"),
    keyframesPath: path.join(recordingDir, "keyframes.json"),
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
      summary: args.paths.summaryPath,
      assetsDir: args.paths.assetsDir,
    },
  };
}
