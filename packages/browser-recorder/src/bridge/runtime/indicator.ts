import type { RecorderBridgeState } from "./shared.js";
import { ensureMounted, fetchRecorderState } from "./shared.js";

function onPointerMove(state: RecorderBridgeState, event: PointerEvent): void {
  if (state.dragPointerId !== event.pointerId || !state.root) return;
  const nextLeft = Math.max(0, state.dragOriginLeft + (event.clientX - state.dragStartX));
  const nextTop = Math.max(0, state.dragOriginTop + (event.clientY - state.dragStartY));
  state.root.style.left = `${nextLeft}px`;
  state.root.style.top = `${nextTop}px`;
}

function stopDragging(state: RecorderBridgeState, event: PointerEvent): void {
  if (state.dragPointerId !== event.pointerId) return;
  state.dragPointerId = null;
  if (state.__onPointerMove) {
    window.removeEventListener("pointermove", state.__onPointerMove, true);
  }
  if (state.__onPointerStop) {
    window.removeEventListener("pointerup", state.__onPointerStop, true);
    window.removeEventListener("pointercancel", state.__onPointerStop, true);
  }
}

function createRoot(state: RecorderBridgeState): HTMLDivElement {
  const root = document.createElement("div");
  root.id = state.rootId;
  root.setAttribute("data-cli-skill-recorder-root", "true");
  root.textContent = "● 录制中";
  root.style.position = "fixed";
  root.style.left = "32px";
  root.style.top = "32px";
  root.style.zIndex = "2147483647";
  root.style.display = "inline-flex";
  root.style.alignItems = "center";
  root.style.gap = "6px";
  root.style.padding = "8px 12px";
  root.style.borderRadius = "999px";
  root.style.background = "rgba(220, 38, 38, 0.96)";
  root.style.color = "#ffffff";
  root.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  root.style.fontSize = "12px";
  root.style.fontWeight = "700";
  root.style.letterSpacing = "0.02em";
  root.style.whiteSpace = "nowrap";
  root.style.boxShadow = "0 18px 42px rgba(220, 38, 38, 0.28)";
  root.style.border = "1px solid rgba(255,255,255,.18)";
  root.style.pointerEvents = "auto";
  root.style.cursor = "move";
  root.style.userSelect = "none";
  root.style.webkitUserSelect = "none";
  root.style.touchAction = "none";
  return root;
}

export function applyIndicatorState(
  state: RecorderBridgeState,
  nextState: { active?: boolean } | null | undefined,
): void {
  if (!state.root) return;
  state.isRecording = !!nextState?.active;
  state.root.textContent = state.isRecording ? "● 录制中" : "○ 已停止";
  state.root.style.background = state.isRecording ? "rgba(220, 38, 38, 0.96)" : "rgba(15, 23, 42, 0.92)";
  state.root.style.boxShadow = state.isRecording
    ? "0 18px 42px rgba(220, 38, 38, 0.28)"
    : "0 18px 42px rgba(15, 23, 42, 0.24)";
}

export async function syncIndicatorState(state: RecorderBridgeState): Promise<void> {
  try {
    const nextState = await fetchRecorderState(state);
    applyIndicatorState(state, nextState);
  } catch {}
}

export function mountIndicator(state: RecorderBridgeState): void {
  state.root = createRoot(state);
  state.__onPointerMove = onPointerMove.bind(null, state);
  state.__onPointerStop = stopDragging.bind(null, state);

  state.root.addEventListener(
    "pointerdown",
    (event: PointerEvent) => {
      if (!state.root) return;
      state.dragPointerId = event.pointerId;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragOriginLeft = parseFloat(state.root.style.left || "0") || 0;
      state.dragOriginTop = parseFloat(state.root.style.top || "0") || 0;
      if (state.__onPointerMove) {
        window.addEventListener("pointermove", state.__onPointerMove, true);
      }
      if (state.__onPointerStop) {
        window.addEventListener("pointerup", state.__onPointerStop, true);
        window.addEventListener("pointercancel", state.__onPointerStop, true);
      }
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  ensureMounted(state);
  void syncIndicatorState(state);
}
