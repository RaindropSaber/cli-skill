import type {
  RecorderActionRecord,
  RecorderDomSnapshotRecord,
  RecorderNetworkRecord,
  RecorderTimelineRecord,
} from "../model/types.js";

export function createTimeline(args: {
  actions: RecorderActionRecord[];
  network: RecorderNetworkRecord[];
  domSnapshots: RecorderDomSnapshotRecord[];
}): RecorderTimelineRecord[] {
  const items: RecorderTimelineRecord[] = [];

  for (const action of args.actions) {
    if (action.type === "navigate") {
      items.push({
        eventId: `evt_action_${action.actionId}`,
        pageId: action.pageId,
        type: "navigation",
        timestamp: action.timestamp,
        title: "页面跳转",
        detail: action.url,
        url: action.url,
        actionId: action.actionId,
      });
      continue;
    }

    items.push({
      eventId: `evt_action_${action.actionId}`,
      pageId: action.pageId,
      type: "action",
      timestamp: action.timestamp,
      title:
        action.type === "click"
          ? "点击"
          : action.type === "tab_switch"
            ? "切换标签页"
          : action.type === "submit"
            ? "提交"
            : action.type === "change"
              ? "变更"
              : "输入",
      detail:
        (action.type === "tab_switch"
          ? action.title || action.url
          : undefined) ||
        action.locatorHints?.name ||
        action.label ||
        action.placeholder ||
        action.text ||
        action.selector ||
        action.tagName,
      url: action.url,
      actionId: action.actionId,
    });
  }

  for (const record of args.network) {
    items.push({
      eventId: `evt_network_${record.phase}_${record.networkId}`,
      pageId: record.pageId,
      type: record.phase === "request" ? "request_started" : "request_finished",
      timestamp: record.timestamp,
      title:
        record.phase === "request"
          ? `请求开始 ${record.method ?? "GET"} ${new URL(record.url).pathname}`
          : `请求结束 ${record.method ?? "GET"} ${new URL(record.url).pathname}`,
      detail: record.phase === "response" && record.status ? `status ${record.status}` : undefined,
      url: record.url,
      networkId: record.networkId,
    });
  }

  for (const snapshot of args.domSnapshots) {
    items.push({
      eventId: `evt_dom_${snapshot.domSnapshotId}`,
      pageId: snapshot.pageId,
      type: "dom_changed",
      timestamp: snapshot.timestamp,
      title: "页面变化",
      detail: snapshot.targetText || snapshot.targetSelector || snapshot.triggerType || "DOM 发生变化",
      url: snapshot.url,
      actionId: snapshot.triggerActionId,
      domSnapshotId: snapshot.domSnapshotId,
    });
  }

  items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return items;
}
