export interface RecorderLocatorHints {
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  text?: string;
}

export interface RecorderActionRecord {
  actionId: string;
  type: "click" | "input" | "change" | "submit" | "navigate" | "tab_switch";
  timestamp: string;
  url: string;
  title?: string;
  tagName?: string;
  selector?: string;
  text?: string;
  value?: string;
  role?: string;
  nameAttr?: string;
  typeAttr?: string;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  testId?: string;
  href?: string;
  htmlSnippet?: string;
  locatorHints?: RecorderLocatorHints;
}

export interface RecorderNetworkRecord {
  networkId: string;
  phase: "request" | "response";
  timestamp: string;
  url: string;
  method?: string;
  status?: number;
  resourceType?: string;
  postData?: string;
  postDataJson?: unknown;
  responseBodyPreview?: string;
  contentType?: string;
}

export interface RecorderDomSnapshotRecord {
  domSnapshotId: string;
  timestamp: string;
  url: string;
  title?: string;
  triggerActionId?: string;
  triggerType?: RecorderActionRecord["type"] | "mutation";
  html: string;
  targetSelector?: string;
  targetText?: string;
  mutationCount?: number;
  windowStartedAt?: string;
  windowEndedAt?: string;
}

export interface RecorderTimelineRecord {
  eventId: string;
  type:
    | "navigation"
    | "action"
    | "request_started"
    | "request_finished"
    | "dom_changed";
  timestamp: string;
  title: string;
  detail?: string;
  url?: string;
  actionId?: string;
  networkId?: string;
  domSnapshotId?: string;
}

export interface RecorderSummary {
  sessionId: string;
  startedAt?: string;
  endedAt?: string;
  recordingDir: string;
  finalUrl?: string;
  stopReason?: BrowserRecorderResult["stopReason"];
  actionCount: number;
  networkCount: number;
  domSnapshotCount: number;
  steps: string[];
  artifacts: {
    actions: string;
    network: string;
    dom: string;
    timeline: string;
    summary: string;
  };
}

export interface BrowserRecorderResult {
  sessionId: string;
  recordingDir: string;
  summaryPath: string;
  stopReason: "user_stop" | "browser_closed" | "error" | "completed";
}

export interface RecorderSessionState {
  sessionId: string;
  status: "idle" | "recording" | "stopping" | "finished";
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  finalUrl?: string;
  stopReason?: BrowserRecorderResult["stopReason"];
}

export interface RecorderListItem {
  id: string;
  sessionId?: string;
  recordingDir: string;
  startedAt?: string;
  endedAt?: string;
  finalUrl?: string;
  actionCount?: number;
  networkCount?: number;
  domSnapshotCount?: number;
}

export interface RecorderExportBundle {
  summary: RecorderSummary;
  timeline: RecorderTimelineRecord[];
  actions: RecorderActionRecord[];
  network: RecorderNetworkRecord[];
  domSnapshots: RecorderDomSnapshotRecord[];
}
