import type { BrowserContext, Response as PlaywrightResponse } from "playwright";
import type { ReturnTypeCreateNetworkStore } from "./types.js";
import { createId } from "../utils/id.js";
import { truncatePreview, tryParseJson } from "../utils/network.js";

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const direct = headers[name];
  if (direct) {
    return direct;
  }

  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function isJsonContentType(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("+json");
}

function shouldRecordRequest(request: Parameters<BrowserContext["on"]>[1] extends never ? never : any): boolean {
  const resourceType = request.resourceType();
  if (resourceType !== "fetch" && resourceType !== "xhr") {
    return false;
  }

  const headers = request.headers();
  const contentType = headerValue(headers, "content-type");
  const accept = headerValue(headers, "accept");
  const postData = request.postData();

  return (
    isJsonContentType(contentType) ||
    isJsonContentType(accept) ||
    tryParseJson(postData ?? null) !== undefined
  );
}

function shouldRecordResponse(response: PlaywrightResponse): boolean {
  const resourceType = response.request().resourceType();
  if (resourceType !== "fetch" && resourceType !== "xhr") {
    return false;
  }

  return isJsonContentType(response.headers()["content-type"]);
}

export function registerNetworkCollector(args: {
  context: BrowserContext;
  networkStore: ReturnTypeCreateNetworkStore;
  isRecording: () => boolean;
}): void {
  const requestIds = new WeakMap<object, string>();

  args.context.on("request", async (request) => {
    if (!args.isRecording() || !shouldRecordRequest(request)) {
      return;
    }

    const postData = request.postData();
    const networkId = createId("net");
    requestIds.set(request, networkId);
    await args.networkStore.append({
      networkId,
      phase: "request",
      timestamp: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      postData: postData ?? undefined,
      postDataJson: tryParseJson(postData ?? null),
    });
  });

  args.context.on("response", async (response: PlaywrightResponse) => {
    if (!args.isRecording() || !shouldRecordResponse(response)) {
      return;
    }

    const request = response.request();
    const networkId = requestIds.get(request) ?? createId("net");
    let responseBodyPreview: string | undefined;
    try {
      const bodyText = await response.text();
      responseBodyPreview = bodyText ? truncatePreview(bodyText) : undefined;
    } catch {}

    await args.networkStore.append({
      networkId,
      phase: "response",
      timestamp: new Date().toISOString(),
      url: response.url(),
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
      contentType: response.headers()["content-type"],
      responseBodyPreview,
    });
  });
}
