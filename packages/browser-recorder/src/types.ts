export interface RecorderLocatorHints {
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  text?: string;
}

export interface RecorderActionRecord {
  id: string;
  type: "click" | "input" | "change" | "submit" | "navigate";
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
  id: string;
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

export interface RecorderKeyframeRecord {
  id: string;
  timestamp: string;
  url: string;
  title?: string;
  screenshotPath: string;
}

export interface RecorderDomSnapshotRecord {
  id: string;
  timestamp: string;
  url: string;
  title?: string;
  triggerActionId?: string;
  triggerType?: RecorderActionRecord["type"] | "mutation";
  htmlPath: string;
  targetSelector?: string;
  targetText?: string;
}

export interface RecorderTimelineRecord {
  id: string;
  type: "navigate" | "action" | "request";
  timestamp: string;
  title: string;
  detail?: string;
  url?: string;
  actionId?: string;
  networkId?: string;
}

export interface RecorderSummary {
  sessionId: string;
  startedAt?: string;
  endedAt?: string;
  recordingDir: string;
  reviewUrl: string;
  finalUrl?: string;
  actionCount: number;
  networkCount: number;
  keyframeCount: number;
  domSnapshotCount: number;
  steps: string[];
  artifacts: {
    meta: string;
    actions: string;
    network: string;
    keyframes: string;
    domSnapshots: string;
    domDir: string;
    timeline: string;
    summary: string;
    assetsDir: string;
  };
}

export interface BrowserRecorderResult {
  sessionId: string;
  recordingDir: string;
  reviewUrl: string;
  summaryPath: string;
  stopReason: "user_stop" | "browser_closed" | "error";
}
