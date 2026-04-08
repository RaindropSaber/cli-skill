import type { Page } from "playwright";
import type { RecorderActionRecord } from "../model/types.js";
import type { ReturnTypeCreateDomSnapshotStore } from "./types.js";

export interface DomSnapshotPayload {
  timestamp: string;
  url: string;
  title?: string;
  html: string;
  pageId?: string;
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
          function findPrimaryContainer(): Element | null {
            const selectors = [
              '[role="dialog"]',
              '[role="listbox"]',
              '[role="menu"]',
              '[role="region"]',
              '[role="main"]',
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
      trigger?: { actionId?: string; type?: RecorderActionRecord["type"] | "mutation"; selector?: string; text?: string },
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
        triggerActionId: trigger?.actionId,
        triggerType: trigger?.type,
        targetSelector: trigger?.selector ?? payload.targetSelector,
        targetText: trigger?.text ?? payload.targetText,
      });
    },
  };
}
