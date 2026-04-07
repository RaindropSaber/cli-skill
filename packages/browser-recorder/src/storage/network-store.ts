import type { RecorderNetworkRecord } from "../model/types.js";
import { appendJsonLine, writeText } from "./io.js";

export function createNetworkStore(networkPath: string) {
  const records: RecorderNetworkRecord[] = [];

  return {
    records,
    async init(): Promise<void> {
      await writeText(networkPath, "");
    },
    async append(record: RecorderNetworkRecord): Promise<void> {
      records.push(record);
      await appendJsonLine(networkPath, record);
    },
  };
}
