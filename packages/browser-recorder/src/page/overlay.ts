export function getOverlayScript(sessionId: string, reviewUrl: string): string {
  return `
(() => {
  const SESSION_ID = ${JSON.stringify(sessionId)};
  const REVIEW_URL = ${JSON.stringify(reviewUrl)};
  const ROOT_ID = "__cli_skill_browser_recorder_root__";
  const COLLAPSED_KEY = "__cli_skill_browser_recorder_collapsed__";

  if (
    window.top !== window ||
    document.getElementById(ROOT_ID) ||
    document.documentElement?.hasAttribute("data-cli-skill-recorder-review")
  ) {
    return;
  }

  let isRecording = false;
  let mounted = false;
  let collapsed = false;

  function selectorFor(element) {
    if (!(element instanceof Element)) return undefined;
    if (element.id) return "#" + element.id;
    const parts = [];
    let current = element;
    let depth = 0;
    while (current && current instanceof Element && depth < 4) {
      let part = current.tagName.toLowerCase();
      if (current.getAttribute("name")) {
        part += '[name="' + current.getAttribute("name") + '"]';
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
        if (siblings.length > 1) {
          part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
        }
      }
      parts.unshift(part);
      current = parent;
      depth += 1;
    }
    return parts.join(" > ");
  }

  function textFor(element) {
    if (!(element instanceof HTMLElement)) return undefined;
    const text = (element.innerText || element.textContent || "").trim().replace(/\\s+/g, " ");
    return text.length > 120 ? text.slice(0, 117) + "..." : text || undefined;
  }

  async function emitAction(type, target, extra) {
    if (!isRecording) return;
    if (target instanceof Element && target.closest("#" + ROOT_ID)) return;
    await window.__cliSkillRecorderAction({
      type,
      timestamp: new Date().toISOString(),
      url: location.href,
      title: document.title,
      tagName: target instanceof Element ? target.tagName.toLowerCase() : undefined,
      selector: target instanceof Element ? selectorFor(target) : undefined,
      text: target instanceof Element ? textFor(target) : undefined,
      ...extra
    });
  }

  function applyState(nextState) {
    isRecording = !!nextState?.active;
    state.textContent = isRecording ? "录制中" : "待开始";
    toggleButton.textContent = isRecording ? "停止" : "开始";
  }

  async function syncState() {
    try {
      const nextState = await window.__cliSkillRecorderGetState();
      applyState(nextState);
    } catch {}
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("data-cli-skill-recorder-root", "true");
  root.style.position = "fixed";
  root.style.left = "16px";
  root.style.bottom = "16px";
  root.style.zIndex = "2147483647";
  root.style.display = "flex";
  root.style.gap = "8px";
  root.style.padding = "10px 12px";
  root.style.borderRadius = "16px";
  root.style.background = "rgba(15, 23, 42, 0.94)";
  root.style.color = "#fff";
  root.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  root.style.boxShadow = "0 18px 42px rgba(15,23,42,.28)";
  root.style.alignItems = "center";
  root.style.backdropFilter = "blur(12px)";
  root.style.maxWidth = "calc(100vw - 32px)";

  const state = document.createElement("span");
  state.textContent = "待开始";
  state.style.fontSize = "12px";
  state.style.opacity = "0.9";
  state.style.minWidth = "48px";

  function makeButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.border = "0";
    button.style.borderRadius = "999px";
    button.style.padding = "8px 12px";
    button.style.cursor = "pointer";
    button.style.fontSize = "12px";
    button.style.fontWeight = "600";
    button.style.background = "#fff";
    button.style.color = "#0f172a";
    return button;
  }

  const toggleButton = makeButton("开始");
  const reviewButton = makeButton("打开录制页");
  const keyframeButton = makeButton("关键帧");
  const collapseButton = makeButton("收起");
  collapseButton.style.background = "rgba(255,255,255,0.12)";
  collapseButton.style.color = "#fff";

  const controls = [state, toggleButton, reviewButton, keyframeButton];

  function applyCollapsed(nextCollapsed) {
    collapsed = !!nextCollapsed;
    controls.forEach((node) => {
      node.style.display = collapsed ? "none" : "";
    });
    collapseButton.textContent = collapsed ? "展开" : "收起";
    root.style.padding = collapsed ? "8px 10px" : "10px 12px";
  }

  toggleButton.addEventListener("click", async () => {
    if (isRecording) {
      toggleButton.disabled = true;
      try {
        const openReview = window.confirm("录制已停止，是否打开录制页继续查看或编辑？");
        const result = await window.__cliSkillRecorderStop({ openReview });
        applyState(result);
      } finally {
        toggleButton.disabled = false;
      }
      return;
    }

    const result = await window.__cliSkillRecorderToggle();
    applyState(result);
  });

  reviewButton.addEventListener("click", () => {
    window.location.href = REVIEW_URL;
  });

  keyframeButton.addEventListener("click", async () => {
    await window.__cliSkillRecorderCaptureKeyframe({
      timestamp: new Date().toISOString(),
      url: location.href,
      title: document.title
    });
  });

  collapseButton.addEventListener("click", () => {
    applyCollapsed(!collapsed);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {}
  });

  root.appendChild(state);
  root.appendChild(toggleButton);
  root.appendChild(reviewButton);
  root.appendChild(keyframeButton);
  root.appendChild(collapseButton);

  function mountOverlay() {
    if (mounted || document.getElementById(ROOT_ID)) {
      mounted = true;
      return;
    }
    if (document.documentElement?.hasAttribute("data-cli-skill-recorder-review")) {
      return;
    }
    const container = document.body || document.documentElement;
    if (!container) {
      return;
    }
    container.appendChild(root);
    mounted = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountOverlay, { once: true });
  } else {
    mountOverlay();
  }

  window.addEventListener("pageshow", () => {
    mountOverlay();
    syncState();
  });
  window.addEventListener("focus", () => {
    mountOverlay();
    syncState();
  });
  window.setInterval(() => {
    if (!document.getElementById(ROOT_ID)) {
      mounted = false;
      mountOverlay();
    }
  }, 1000);
  try {
    applyCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
  } catch {}
  syncState();

  document.addEventListener("click", (event) => {
    emitAction("click", event.target, {});
  }, true);

  document.addEventListener("input", (event) => {
    const target = event.target;
    emitAction("input", target, {
      value: target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target.value : undefined
    });
  }, true);

  document.addEventListener("change", (event) => {
    const target = event.target;
    emitAction("change", target, {
      value: target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ? target.value : undefined
    });
  }, true);

  document.addEventListener("submit", (event) => {
    emitAction("submit", event.target, {});
  }, true);

  window.addEventListener("load", () => {
    emitAction("navigate", document.documentElement, {});
  });
})();
`;
}
