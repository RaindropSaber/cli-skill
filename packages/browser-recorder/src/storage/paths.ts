import path from "node:path";
import { ensureDir } from "./io.js";

export interface RecorderSessionPaths {
  recordingDir: string;
  userDataDir: string;
  actionsPath: string;
  networkPath: string;
  domPath: string;
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
  browserUserDataDir: string,
): Promise<RecorderSessionPaths> {
  const recordingDir = path.join(recordingRoot, timestampForDir());
  const userDataDir = browserUserDataDir;

  await ensureDir(recordingDir);
  await ensureDir(userDataDir);

  return {
    recordingDir,
    userDataDir,
    actionsPath: path.join(recordingDir, "actions.jsonl"),
    networkPath: path.join(recordingDir, "network.jsonl"),
    domPath: path.join(recordingDir, "dom.jsonl"),
    timelinePath: path.join(recordingDir, "timeline.jsonl"),
    summaryPath: path.join(recordingDir, "summary.json"),
  };
}
