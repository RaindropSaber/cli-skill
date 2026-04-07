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

async function emitAction(
  state: RecorderBridgeState,
  type: "click" | "change" | "submit",
  target: EventTarget | null,
  extra: Record<string, unknown>,
): Promise<void> {
  if (!state.isRecording) return;
  if (target instanceof Element && target.closest(`#${state.rootId}`)) return;
  const role = target instanceof Element ? inferredRole(target) : undefined;
  const label = target instanceof HTMLElement ? labelFor(target) : undefined;
  const placeholder = target instanceof Element ? attr(target, "placeholder") : undefined;
  const text = target instanceof Element ? textFor(target) : undefined;
  const testId = target instanceof Element
    ? attr(target, "data-testid") || attr(target, "data-test-id") || attr(target, "data-test")
    : undefined;

  await window.__cliSkillRecorderAction({
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
}

async function emitTabSwitch(state: RecorderBridgeState): Promise<void> {
  if (!state.isRecording) return;

  await window.__cliSkillRecorderAction({
    type: "tab_switch",
    timestamp: new Date().toISOString(),
    url: location.href,
    title: document.title,
    text: document.title || location.href,
  });
}

export function registerRecorderEvents(state: RecorderBridgeState): void {
  document.addEventListener(
    "click",
    (event: MouseEvent) => {
      void emitAction(state, "click", event.target, {});
    },
    true,
  );

  document.addEventListener(
    "change",
    (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      const value = target && "value" in target ? target.value : undefined;
      void emitAction(state, "change", target, { value });
    },
    true,
  );

  document.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      void emitAction(state, "submit", event.target, {});
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
