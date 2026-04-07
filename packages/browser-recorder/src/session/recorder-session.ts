import type { BrowserRecorderResult, RecorderSessionState } from "../model/types.js";

type StopReason = BrowserRecorderResult["stopReason"];

export class RecorderSession {
  readonly sessionId: string;
  readonly recordingDir: string;
  readonly summaryPath: string;
  private phase: "recording" | "stopping" | "finished" = "recording";
  private startedAt: string | undefined = new Date().toISOString();
  private endedAt: string | undefined;
  private finalUrl: string | undefined;
  private stopReason: StopReason | undefined;

  constructor(args: { sessionId: string; recordingDir: string; summaryPath: string }) {
    this.sessionId = args.sessionId;
    this.recordingDir = args.recordingDir;
    this.summaryPath = args.summaryPath;
  }

  get active(): boolean {
    return this.phase === "recording";
  }

  get isStopping(): boolean {
    return this.phase === "stopping";
  }

  get isFinished(): boolean {
    return this.phase === "finished";
  }

  getState(): RecorderSessionState {
    return {
      sessionId: this.sessionId,
      status: this.phase === "finished" ? "finished" : this.phase === "stopping" ? "stopping" : "recording",
      active: this.phase === "recording",
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      finalUrl: this.finalUrl,
      stopReason: this.stopReason,
    };
  }

  beginStop(reason: StopReason, finalUrl?: string): boolean {
    if (this.phase !== "recording") {
      return false;
    }

    this.phase = "stopping";
    this.stopReason = reason;
    this.endedAt = new Date().toISOString();
    this.finalUrl = finalUrl ?? this.finalUrl;
    return true;
  }

  updateFinalUrl(url?: string): void {
    this.finalUrl = url ?? this.finalUrl;
  }

  finish(): void {
    this.phase = "finished";
  }

  toResult(): BrowserRecorderResult {
    return {
      sessionId: this.sessionId,
      recordingDir: this.recordingDir,
      summaryPath: this.summaryPath,
      stopReason: this.stopReason ?? "browser_closed",
    };
  }

}
