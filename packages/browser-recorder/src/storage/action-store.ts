import type { RecorderActionRecord } from "../model/types.js";
import { appendJsonLine, writeText } from "./io.js";

export function createActionStore(actionsPath: string) {
  const records: RecorderActionRecord[] = [];

  return {
    records,
    async init(): Promise<void> {
      await writeText(actionsPath, "");
    },
    async append(record: RecorderActionRecord): Promise<void> {
      records.push(record);
      await appendJsonLine(actionsPath, record);
    },
  };
}
