import type { RecorderBridgeState } from "./shared.js";
import {
  attr,
  ensureMounted,
  htmlSnippetFor,
  inferredRole,
  labelFor,
  nameFor,
  selectorFor,
  textFor,
} from "./shared.js";
import { syncIndicatorState } from "./indicator.js";
import { scheduleDocumentSnapshot } from "./dom-snapshots.js";

const DOM_SNAPSHOT_KEYS = new Set([
  "Enter",
  "Escape",
  "Tab",
  " ",
  "Spacebar",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

async function emitAction(
  state: RecorderBridgeState,
  type: "click" | "change" | "submit" | "keydown" | "paste" | "drop" | "pageshow",
  target: EventTarget | null,
  extra: Record<string, unknown>,
): Promise<{ actionId?: string } | undefined> {
  if (!state.isRecording) return undefined;
  if (target instanceof Element && target.closest(`#${state.rootId}`)) return undefined;
  const role = target instanceof Element ? inferredRole(target) : undefined;
  const label = target instanceof HTMLElement ? labelFor(target) : undefined;
  const placeholder = target instanceof Element ? attr(target, "placeholder") : undefined;
  const text = target instanceof Element ? textFor(target) : undefined;
  const testId = target instanceof Element
    ? attr(target, "data-testid") || attr(target, "data-test-id") || attr(target, "data-test")
    : undefined;

  const result = await window.__cliSkillRecorderAction({
    type,
    timestamp: new Date().toISOString(),
    url: location.href,
    title: document.title,
    tagName: target instanceof Element ? target.tagName.toLowerCase() : undefined,
    selector: target instanceof Element ? selectorFor(target) : undefined,
    text,
    role,
    nameAttr: target instanceof Element ? attr(target, "name") : undefined,
    typeAttr: target instanceof Element ? attr(target, "type") : undefined,
    placeholder,
    label,
    ariaLabel: target instanceof Element ? attr(target, "aria-label") : undefined,
    testId,
    href: target instanceof Element ? attr(target, "href") : undefined,
    htmlSnippet: target instanceof Element ? htmlSnippetFor(target) : undefined,
    locatorHints: target instanceof Element
      ? {
          role,
          name: nameFor(target as HTMLElement),
          label,
          placeholder,
          testId,
          text,
        }
      : undefined,
    ...extra,
  });
  return result || undefined;
}

function actionTargetFor(target: EventTarget | null): EventTarget | null {
  if (target instanceof Element && target.closest("[contenteditable='true'], input, textarea, select, button, a[href], [role='button'], [role='menuitem'], [role='option'], [tabindex]")) {
    return target;
  }
  return target instanceof Element ? target : document.activeElement;
}

async function emitActionWithDocumentSnapshot(
  state: RecorderBridgeState,
  type: "click" | "change" | "submit" | "keydown" | "paste" | "drop" | "pageshow",
  target: EventTarget | null,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const actionTarget = actionTargetFor(target);
  const result = await emitAction(state, type, actionTarget, extra);
  scheduleDocumentSnapshot(state, {
    triggerActionId: result?.actionId,
    triggerType: type,
    target: actionTarget,
  });
}

async function emitTabSwitch(state: RecorderBridgeState): Promise<void> {
  if (!state.isRecording) return;

  const result = await window.__cliSkillRecorderAction({
    type: "tab_switch",
    timestamp: new Date().toISOString(),
    url: location.href,
    title: document.title,
    text: document.title || location.href,
  });
  scheduleDocumentSnapshot(state, {
    triggerActionId: result?.actionId,
    triggerType: "tab_switch",
    target: document.documentElement,
  });
}

export function registerRecorderEvents(state: RecorderBridgeState): void {
  document.addEventListener(
    "click",
    (event: MouseEvent) => {
      void emitActionWithDocumentSnapshot(state, "click", event.target);
    },
    true,
  );

  document.addEventListener(
    "change",
    (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      const value = target && "value" in target ? target.value : undefined;
      void emitActionWithDocumentSnapshot(state, "change", target, { value });
    },
    true,
  );

  document.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      void emitActionWithDocumentSnapshot(state, "submit", event.target);
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (!DOM_SNAPSHOT_KEYS.has(event.key)) return;
      void emitActionWithDocumentSnapshot(state, "keydown", event.target, {
        key: event.key === " " || event.key === "Spacebar" ? "Space" : event.key,
      });
    },
    true,
  );

  document.addEventListener(
    "paste",
    (event: ClipboardEvent) => {
      void emitActionWithDocumentSnapshot(state, "paste", event.target);
    },
    true,
  );

  document.addEventListener(
    "drop",
    (event: DragEvent) => {
      void emitActionWithDocumentSnapshot(state, "drop", event.target);
    },
    true,
  );

  function mount(): void {
    if (state.mounted) return;
    ensureMounted(state);
    void syncIndicatorState(state);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  window.addEventListener("pageshow", () => {
    ensureMounted(state);
    void syncIndicatorState(state);
    void emitActionWithDocumentSnapshot(state, "pageshow", document.documentElement);
  });

  document.addEventListener("visibilitychange", () => {
    const previousState = state.lastVisibilityState;
    state.lastVisibilityState = document.visibilityState;

    if (previousState === "hidden" && document.visibilityState === "visible") {
      ensureMounted(state);
      void syncIndicatorState(state);
      void emitTabSwitch(state);
    }
  });

  window.addEventListener("focus", () => {
    ensureMounted(state);
    void syncIndicatorState(state);
  });

  setInterval(() => {
    ensureMounted(state);
  }, 500);
}
