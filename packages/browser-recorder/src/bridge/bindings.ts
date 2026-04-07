import type { BrowserContext, Page } from "playwright";
import type { RecorderActionRecord, RecorderSessionState } from "../model/types.js";
import { createId } from "../utils/id.js";
import type { DomSnapshotPayload } from "../collectors/dom-snapshot-collector.js";
import type { ReturnTypeCreateActionStore } from "../collectors/types.js";

interface BindingSourceLike {
  page?: Page;
}

export function registerBridgeBindings(args: {
  context: BrowserContext;
  getState: () => RecorderSessionState;
  isRecording: () => boolean;
  actionStore: ReturnTypeCreateActionStore;
  onClickAction: (page: Page, record: RecorderActionRecord) => Promise<void>;
  onDomSnapshot: (
    payload: DomSnapshotPayload,
    trigger?: { actionId?: string; type?: RecorderActionRecord["type"] | "mutation"; selector?: string; text?: string },
  ) => Promise<void>;
}): Promise<unknown[]> {
  return Promise.all([
    args.context.exposeBinding("__cliSkillRecorderGetState", async () => args.getState()),
    args.context.exposeBinding("__cliSkillRecorderAction", async (source: BindingSourceLike, record: Omit<RecorderActionRecord, "actionId">) => {
      if (!args.isRecording()) {
        return;
      }

      const nextRecord: RecorderActionRecord = {
        actionId: createId("act"),
        ...record,
      };
      await args.actionStore.append(nextRecord);

      if (source.page && nextRecord.type === "click") {
        queueMicrotask(() => {
          void args.onClickAction(source.page!, nextRecord).catch(() => undefined);
        });
      }
    }),
    args.context.exposeBinding("__cliSkillRecorderDomSnapshot", async (_source: BindingSourceLike, payload: DomSnapshotPayload) => {
      if (!args.isRecording()) {
        return;
      }
      await args.onDomSnapshot(payload, {
        type: "mutation",
        selector: payload.targetSelector,
        text: payload.targetText,
      });
    }),
  ]);
}
