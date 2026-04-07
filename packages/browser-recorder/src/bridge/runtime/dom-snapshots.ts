import type { RecorderBridgeState } from "./shared.js";
import { ensureMounted, selectorFor, textFor } from "./shared.js";

function snapshotTargetFor(state: RecorderBridgeState, node: Node | null): Element | null {
  const element = node instanceof Element ? node : node instanceof Text ? node.parentElement : null;
  if (!(element instanceof Element)) {
    return document.body;
  }
  if (element.closest(`#${state.rootId}`)) {
    return null;
  }
  return element;
}

async function flushDomSnapshot(state: RecorderBridgeState): Promise<void> {
  state.domFlushTimer = null;
  if (!state.isRecording || !state.pendingDomSnapshot) return;
  const snapshot = state.pendingDomSnapshot;
  state.pendingDomSnapshot = null;
  if (!snapshot.html) return;
  if (snapshot.html === state.lastDomFingerprint) return;
  state.lastDomFingerprint = snapshot.html;
  try {
    await window.__cliSkillRecorderDomSnapshot({
      timestamp: snapshot.timestamp,
      url: snapshot.url,
      title: snapshot.title,
      html: snapshot.html,
      targetSelector: snapshot.targetSelector,
      targetText: snapshot.targetText,
      mutationCount: snapshot.mutationCount,
      windowStartedAt: snapshot.windowStartedAt,
      windowEndedAt: snapshot.windowEndedAt,
    });
  } catch {}
}

export function queueDomSnapshot(state: RecorderBridgeState, target: Node | null): void {
  if (!state.isRecording) return;
  if (target instanceof Element && target.closest(`#${state.rootId}`)) return;
  const container = snapshotTargetFor(state, target || document.body);
  if (!(container instanceof Element)) return;
  const html = (container.outerHTML || "").trim();
  if (!html) return;
  const now = new Date().toISOString();
  const previous = state.pendingDomSnapshot;
  state.pendingDomSnapshot = {
    timestamp: now,
    windowStartedAt: previous?.windowStartedAt ?? now,
    windowEndedAt: now,
    url: location.href,
    title: document.title,
    html,
    targetSelector: selectorFor(container),
    targetText: textFor(container),
    mutationCount: (previous?.mutationCount ?? 0) + 1,
  };
  if (state.domFlushTimer) clearTimeout(state.domFlushTimer);
  state.domFlushTimer = setTimeout(() => {
    void flushDomSnapshot(state);
  }, 300);
}

export function setupDomObserver(state: RecorderBridgeState): void {
  if (state.domObserver || !document.body) return;
  state.domObserver = new MutationObserver((mutations) => {
    if (!state.isRecording) return;
    for (const mutation of mutations) {
      const target = mutation.target;
      const targetElement = target instanceof Element ? target : target instanceof Text ? target.parentElement : null;
      if (targetElement?.closest?.(`#${state.rootId}`)) continue;
      if (mutation.type === "childList") {
        const added = Array.from(mutation.addedNodes).find((node) => {
          const element = node instanceof Element ? node : node instanceof Text ? node.parentElement : null;
          return element && !element.closest?.(`#${state.rootId}`);
        });
        queueDomSnapshot(state, added || targetElement || document.body);
        return;
      }
      queueDomSnapshot(state, targetElement || document.body);
      return;
    }
  });
  state.domObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  ensureMounted(state);
}
