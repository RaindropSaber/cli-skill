import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  RecorderActionRecord,
  RecorderDomSnapshotRecord,
  RecorderExportBundle,
  RecorderListItem,
  RecorderNetworkRecord,
  RecorderSummary,
  RecorderTimelineRecord,
} from "../model/types.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function readJsonlFile<T>(filePath: string): Promise<T[]> {
  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export async function listRecordings(recordingRoot: string): Promise<RecorderListItem[]> {
  let names: string[] = [];
  try {
    names = await readdir(recordingRoot);
  } catch {
    return [];
  }

  const items = await Promise.all(
    names.map(async (name) => {
      const recordingDir = path.join(recordingRoot, name);
      const summary = await readJsonFile<RecorderSummary>(path.join(recordingDir, "summary.json"));

      if (!summary) {
        return null;
      }

      return {
        id: name,
        sessionId: summary.sessionId,
        recordingDir,
        startedAt: summary.startedAt,
        endedAt: summary.endedAt,
        finalUrl: summary.finalUrl,
        actionCount: summary.actionCount,
        networkCount: summary.networkCount,
        domSnapshotCount: summary.domSnapshotCount,
      } satisfies RecorderListItem;
    }),
  );

  const filtered = items.filter((item) => item !== null);
  return filtered.sort((a, b) => b.id.localeCompare(a.id));
}

export async function readRecordingExport(recordingRoot: string, recordingId: string): Promise<RecorderExportBundle | null> {
  const recordingDir = path.join(recordingRoot, recordingId);
  const summary = await readJsonFile<RecorderSummary>(path.join(recordingDir, "summary.json"));
  if (!summary) {
    return null;
  }

  const [timeline, actions, network, domSnapshots] = await Promise.all([
    readJsonlFile<RecorderTimelineRecord>(path.join(recordingDir, "timeline.jsonl")),
    readJsonlFile<RecorderActionRecord>(path.join(recordingDir, "actions.jsonl")),
    readJsonlFile<RecorderNetworkRecord>(path.join(recordingDir, "network.jsonl")),
    readJsonlFile<RecorderDomSnapshotRecord>(path.join(recordingDir, "dom.jsonl")),
  ]);

  return {
    summary,
    timeline,
    actions,
    network,
    domSnapshots,
  };
}
