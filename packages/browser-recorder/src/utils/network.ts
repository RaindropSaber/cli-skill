const RESPONSE_PREVIEW_LIMIT = 4_000;

export function tryParseJson(value: string | null): unknown {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function truncatePreview(value: string, limit = RESPONSE_PREVIEW_LIMIT): string {
  return value.length > limit ? `${value.slice(0, limit)}\n...[truncated]` : value;
}
