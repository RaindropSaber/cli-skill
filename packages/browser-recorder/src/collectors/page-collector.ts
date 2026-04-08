import type { BrowserContext, Frame, Page } from "playwright";
import type { RecorderActionRecord } from "../model/types.js";
import { createId } from "../utils/id.js";
import type { ReturnTypeCreateActionStore } from "./types.js";

export function createPageCollector(args: {
  context: BrowserContext;
  actionStore: ReturnTypeCreateActionStore;
  isRecording: () => boolean;
  onAllPagesClosed: () => void;
  onPageActivated: (page: Page) => void;
  injectOverlay: (page: Page) => Promise<void>;
  getPageId: (page: Page) => string;
}) {
  const trackedPages = new Set<Page>();
  let currentPage: Page | null = null;

  function attachPage(page: Page): void {
    if (trackedPages.has(page)) {
      return;
    }

    trackedPages.add(page);
    currentPage = page;
    args.getPageId(page);
    args.onPageActivated(page);

    page.on("framenavigated", async (frame: Frame) => {
      if (frame !== page.mainFrame() || !args.isRecording()) {
        return;
      }

      const record: RecorderActionRecord = {
        actionId: createId("act"),
        pageId: args.getPageId(page),
        type: "navigate",
        timestamp: new Date().toISOString(),
        url: frame.url(),
        title: await page.title().catch(() => undefined),
      };
      await args.actionStore.append(record);
    });

    page.on("close", () => {
      trackedPages.delete(page);
      if (currentPage === page) {
        currentPage = null;
      }

      if (trackedPages.size === 0) {
        args.onAllPagesClosed();
      }
    });
  }

  return {
    getCurrentPage(): Page | null {
      return currentPage;
    },
    async init(): Promise<Page> {
      const firstPage = args.context.pages()[0] ?? await args.context.newPage();
      for (const existingPage of args.context.pages()) {
        await args.injectOverlay(existingPage);
        attachPage(existingPage);
      }
      if (!trackedPages.has(firstPage)) {
        await args.injectOverlay(firstPage);
        attachPage(firstPage);
      }
      args.context.on("page", (page) => {
        attachPage(page);
        void args.injectOverlay(page);
      });
      return firstPage;
    },
  };
}
