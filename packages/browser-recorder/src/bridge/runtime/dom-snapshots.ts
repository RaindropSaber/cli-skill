import type { RecorderBridgeState } from "./shared.js";
import { selectorFor, textFor } from "./shared.js";

async function captureDocumentSnapshot(
  state: RecorderBridgeState,
  args: {
    triggerActionId?: string;
    triggerType?: string;
    target?: EventTarget | null;
  },
): Promise<void> {
  if (!state.isRecording) return;
  if (args.target instanceof Element && args.target.closest(`#${state.rootId}`)) return;
  const targetElement = args.target instanceof Element
    ? args.target
    : args.target instanceof Text
      ? args.target.parentElement
      : null;
  const html = (document.documentElement?.outerHTML || "").trim();
  if (!html) return;
  try {
    await window.__cliSkillRecorderDomSnapshot({
      timestamp: new Date().toISOString(),
      url: location.href,
      title: document.title,
      html,
      triggerActionId: args.triggerActionId,
      triggerType: args.triggerType,
      targetSelector: selectorFor(targetElement),
      targetText: textFor(targetElement),
    });
  } catch {}
}

export function scheduleDocumentSnapshot(
  state: RecorderBridgeState,
  args: {
    triggerActionId?: string;
    triggerType?: string;
    target?: EventTarget | null;
  },
): void {
  if (!state.isRecording) return;
  window.setTimeout(() => {
    void captureDocumentSnapshot(state, args);
  }, 300);
}
