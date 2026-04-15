export interface RecorderBridgeState {
  sessionId: string;
  showIndicator: boolean;
  rootId: string;
  isRecording: boolean;
  mounted: boolean;
  dragPointerId: number | null;
  dragStartX: number;
  dragStartY: number;
  dragOriginLeft: number;
  dragOriginTop: number;
  root: HTMLDivElement | null;
  lastVisibilityState: DocumentVisibilityState;
  __onPointerMove?: (event: PointerEvent) => void;
  __onPointerStop?: (event: PointerEvent) => void;
}

type LabelledElement = HTMLElement & {
  labels?: NodeListOf<HTMLLabelElement> | null;
};

declare const __SESSION_ID__: string;
declare const __SHOW_INDICATOR__: boolean;

declare global {
  interface Window {
    __cliSkillRecorderInjected?: boolean;
    __cliSkillRecorderGetState: (payload: { sessionId: string }) => Promise<{ active?: boolean }>;
    __cliSkillRecorderAction: (payload: unknown) => Promise<{ actionId?: string } | void>;
    __cliSkillRecorderDomSnapshot: (payload: unknown) => Promise<void>;
  }
}

export function createRecorderState(): RecorderBridgeState {
  return {
    sessionId: __SESSION_ID__,
    showIndicator: __SHOW_INDICATOR__,
    rootId: "__cli_skill_browser_recorder_root__",
    isRecording: true,
    mounted: false,
    dragPointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginLeft: 0,
    dragOriginTop: 0,
    root: null,
    lastVisibilityState: document.visibilityState,
  };
}

export function shouldSkipRecorderInjection(): boolean {
  return (
    !!window.__cliSkillRecorderInjected ||
    window.top !== window ||
    document.documentElement?.hasAttribute("data-cli-skill-recorder-review")
  );
}

export function markRecorderInjected(): void {
  window.__cliSkillRecorderInjected = true;
}

export async function fetchRecorderState(state: RecorderBridgeState): Promise<{ active?: boolean }> {
  return await window.__cliSkillRecorderGetState({ sessionId: state.sessionId });
}

export function selectorFor(element: Element | null | undefined): string | undefined {
  if (!(element instanceof Element)) return undefined;
  if (element.id) return "#" + element.id;
  const parts: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  while (current && depth < 4) {
    const currentElement: Element = current;
    let part = current.tagName.toLowerCase();
    if (currentElement.getAttribute("name")) {
      part += `[name="${currentElement.getAttribute("name")}"]`;
    }
    const parent: Element | null = currentElement.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === currentElement.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(currentElement) + 1})`;
      }
    }
    parts.unshift(part);
    current = parent;
    depth += 1;
  }
  return parts.join(" > ");
}

export function textFor(element: Element | null | undefined): string | undefined {
  if (!(element instanceof HTMLElement)) return undefined;
  const text = (element.innerText || element.textContent || "").trim().replace(/\s+/g, " ");
  return text.length > 120 ? `${text.slice(0, 117)}...` : text || undefined;
}

export function attr(element: Element | null | undefined, name: string): string | undefined {
  return element instanceof Element ? element.getAttribute(name) || undefined : undefined;
}

export function inferredRole(element: Element | null | undefined): string | undefined {
  if (!(element instanceof Element)) return undefined;
  const explicitRole = attr(element, "role");
  if (explicitRole) return explicitRole;

  const tag = element.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && element.getAttribute("href")) return "link";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag === "input") {
    const type = (element.getAttribute("type") || "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "number") return "spinbutton";
    if (type === "search") return "searchbox";
    if (type === "submit" || type === "button") return "button";
    return "textbox";
  }
  return undefined;
}

export function labelFor(element: HTMLElement | null | undefined): string | undefined {
  if (!(element instanceof HTMLElement)) return undefined;
  const labelledElement = element as LabelledElement;
  if (labelledElement.labels && labelledElement.labels.length > 0) {
    const text = Array.from(labelledElement.labels)
      .map((item: HTMLLabelElement) => (item.innerText || item.textContent || "").trim())
      .filter(Boolean)
      .join(" ");
    if (text) return text.replace(/\s+/g, " ");
  }
  const ariaLabel = attr(element, "aria-label");
  if (ariaLabel) return ariaLabel;
  const closestLabel = element.closest("label");
  if (closestLabel) {
    const text = (closestLabel.innerText || closestLabel.textContent || "").trim().replace(/\s+/g, " ");
    if (text) return text;
  }
  return undefined;
}

export function nameFor(element: HTMLElement | null | undefined): string | undefined {
  if (!(element instanceof HTMLElement)) return undefined;
  return attr(element, "aria-label") || labelFor(element) || attr(element, "placeholder") || textFor(element);
}

export function htmlSnippetFor(element: Element | null | undefined): string | undefined {
  if (!(element instanceof Element)) return undefined;
  const html = element.outerHTML.replace(/\s+/g, " ").trim();
  return html.length > 240 ? `${html.slice(0, 237)}...` : html;
}

export function getMountTarget(): Element | null {
  return document.body || document.documentElement || document.head || null;
}

export function ensureMounted(state: RecorderBridgeState): void {
  const mountTarget = getMountTarget();
  if (!mountTarget || !state.root) return;
  if (!document.getElementById(state.rootId)) {
    mountTarget.append(state.root);
  }
  state.mounted = true;
}
