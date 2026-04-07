import type {
  RecorderActionRecord,
  RecorderDomSnapshotRecord,
  RecorderNetworkRecord,
  RecorderSummary,
} from "../model/types.js";
import type { RecorderSessionPaths } from "../storage/paths.js";

export function createSummary(args: {
  sessionId: string;
  recordingDir: string;
  startedAt?: string;
  endedAt?: string;
  finalUrl?: string;
  stopReason?: RecorderSummary["stopReason"];
  actions: RecorderActionRecord[];
  network: RecorderNetworkRecord[];
  domSnapshots: RecorderDomSnapshotRecord[];
  paths: RecorderSessionPaths;
}): RecorderSummary {
  return {
    sessionId: args.sessionId,
    startedAt: args.startedAt,
    endedAt: args.endedAt,
    recordingDir: args.recordingDir,
    finalUrl: args.finalUrl,
    stopReason: args.stopReason,
    actionCount: args.actions.length,
    networkCount: args.network.length,
    domSnapshotCount: args.domSnapshots.length,
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
        case "tab_switch":
          return `切换到 ${action.title ?? action.url}`;
        default:
          return `${action.type} ${action.selector ?? action.url}`;
      }
    }),
    artifacts: {
      actions: args.paths.actionsPath,
      network: args.paths.networkPath,
      dom: args.paths.domPath,
      timeline: args.paths.timelinePath,
      summary: args.paths.summaryPath,
    },
  };
}
