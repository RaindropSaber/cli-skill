import type { Page } from "playwright";
import type { RecorderActionRecord } from "../model/types.js";
import type { ReturnTypeCreateDomSnapshotStore } from "./types.js";

export interface DomSnapshotPayload {
  timestamp: string;
  url: string;
  title?: string;
  html: string;
  pageId?: string;
  triggerActionId?: string;
  triggerType?: RecorderActionRecord["type"];
  targetSelector?: string;
  targetText?: string;
}

export function createDomSnapshotCollector(domStore: ReturnTypeCreateDomSnapshotStore) {
  return {
    async capturePageSnapshot(
      page: Page,
      pageId: string,
      trigger?: { actionId?: string; type?: RecorderActionRecord["type"]; selector?: string; text?: string },
    ): Promise<void> {
      const snapshot = await page
        .evaluate((): { url: string; title: string; html: string } => {
          return {
            url: location.href,
            title: document.title,
            html: (document.documentElement?.outerHTML || "").trim(),
          };
        })
        .catch(() => null);
      if (!snapshot?.html) {
        return;
      }

      await domStore.append({
        pageId,
        timestamp: new Date().toISOString(),
        url: snapshot.url,
        title: snapshot.title,
        html: snapshot.html,
        triggerActionId: trigger?.actionId,
        triggerType: trigger?.type,
        targetSelector: trigger?.selector,
        targetText: trigger?.text,
      });
    },

    async persistPayload(
      payload: DomSnapshotPayload,
      trigger?: { actionId?: string; type?: RecorderActionRecord["type"]; selector?: string; text?: string },
    ): Promise<void> {
      if (!payload.html?.trim()) {
        return;
      }

      await domStore.append({
        pageId: payload.pageId,
        timestamp: payload.timestamp,
        url: payload.url,
        title: payload.title,
        html: payload.html,
        triggerActionId: trigger?.actionId ?? payload.triggerActionId,
        triggerType: trigger?.type ?? payload.triggerType,
        targetSelector: trigger?.selector ?? payload.targetSelector,
        targetText: trigger?.text ?? payload.targetText,
      });
    },
  };
}
