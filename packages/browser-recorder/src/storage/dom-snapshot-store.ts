import type { RecorderDomSnapshotRecord } from "../model/types.js";
import { createId } from "../utils/id.js";
import { appendJsonLine, writeText } from "./io.js";

export interface DomSnapshotDraft {
  pageId?: string;
  timestamp: string;
  url: string;
  title?: string;
  html: string;
  triggerActionId?: string;
  triggerType?: RecorderDomSnapshotRecord["triggerType"];
  targetSelector?: string;
  targetText?: string;
  mutationCount?: number;
  windowStartedAt?: string;
  windowEndedAt?: string;
}

export function createDomSnapshotStore(domPath: string) {
  const records: RecorderDomSnapshotRecord[] = [];

  return {
    records,
    async init(): Promise<void> {
      await writeText(domPath, "");
    },
    async append(draft: DomSnapshotDraft): Promise<RecorderDomSnapshotRecord> {
      const domSnapshotId = createId("dom");
      const record: RecorderDomSnapshotRecord = {
        domSnapshotId,
        pageId: draft.pageId,
        timestamp: draft.timestamp,
        url: draft.url,
        title: draft.title,
        triggerActionId: draft.triggerActionId,
        triggerType: draft.triggerType,
        targetSelector: draft.targetSelector,
        targetText: draft.targetText,
        html: draft.html,
        mutationCount: draft.mutationCount,
        windowStartedAt: draft.windowStartedAt,
        windowEndedAt: draft.windowEndedAt,
      };
      records.push(record);
      await appendJsonLine(domPath, record);
      return record;
    },
  };
}
