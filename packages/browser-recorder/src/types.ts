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
  steps: string[];
  artifacts: {
    meta: string;
    actions: string;
    network: string;
    keyframes: string;
    summary: string;
    assetsDir: string;
  };
}

export interface BrowserRecorderResult {
  sessionId: string;
  recordingDir: string;
  reviewUrl: string;
  summaryPath: string;
}
