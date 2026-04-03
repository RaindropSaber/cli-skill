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
  let domObserver;
  let domFlushTimer = null;
  let domCooldownTimer = null;
  let pendingDomTarget = null;
  let lastDomFingerprint = "";

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

  function attr(element, name) {
    return element instanceof Element ? element.getAttribute(name) || undefined : undefined;
  }

  function inferredRole(element) {
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

  function labelFor(element) {
    if (!(element instanceof HTMLElement)) return undefined;
    if ("labels" in element && element.labels && element.labels.length > 0) {
      const text = Array.from(element.labels)
        .map((item) => (item.innerText || item.textContent || "").trim())
        .filter(Boolean)
        .join(" ");
      if (text) return text.replace(/\\s+/g, " ");
    }
    const ariaLabel = attr(element, "aria-label");
    if (ariaLabel) return ariaLabel;
    const closestLabel = element.closest("label");
    if (closestLabel) {
      const text = (closestLabel.innerText || closestLabel.textContent || "").trim().replace(/\\s+/g, " ");
      if (text) return text;
    }
    return undefined;
  }

  function nameFor(element) {
    if (!(element instanceof HTMLElement)) return undefined;
    return (
      attr(element, "aria-label") ||
      labelFor(element) ||
      attr(element, "placeholder") ||
      textFor(element)
    );
  }

  function htmlSnippetFor(element) {
    if (!(element instanceof Element)) return undefined;
    const html = element.outerHTML.replace(/\\s+/g, " ").trim();
    return html.length > 240 ? html.slice(0, 237) + "..." : html;
  }

  function primaryContainerFor(node) {
    const element = node instanceof Element
      ? node
      : node instanceof Text
        ? node.parentElement
        : null;
    const selectors = [
      '[role="dialog"]',
      ".n-modal",
      ".n-drawer",
      ".n-popover",
      '[role="listbox"]',
      '[role="menu"]',
      "form",
      "main",
      "body",
    ];
    for (const selector of selectors) {
      const found = element?.closest?.(selector) || document.querySelector(selector);
      if (found instanceof Element) return found;
    }
    return document.body;
  }

  function fingerprintFor(html) {
    return html.replace(/\\s+/g, " ").trim().slice(0, 4000);
  }

  async function flushDomSnapshot() {
    domFlushTimer = null;
    if (!isRecording || !pendingDomTarget) return;
    const container = primaryContainerFor(pendingDomTarget);
    pendingDomTarget = null;
    if (!(container instanceof Element)) return;
    if (container.closest("#" + ROOT_ID)) return;
    const html = (container.outerHTML || "").trim();
    if (!html) return;
    const fingerprint = fingerprintFor(html);
    if (fingerprint === lastDomFingerprint) return;
    lastDomFingerprint = fingerprint;
    try {
      await window.__cliSkillRecorderDomSnapshot({
        timestamp: new Date().toISOString(),
        url: location.href,
        title: document.title,
        html,
        targetSelector: selectorFor(container),
        targetText: textFor(container),
      });
    } catch {}
  }

  function queueDomSnapshot(target) {
    if (!isRecording) return;
    if (target instanceof Element && target.closest("#" + ROOT_ID)) return;
    pendingDomTarget = target || document.body;
    if (domCooldownTimer) return;
    if (domFlushTimer) clearTimeout(domFlushTimer);
    domFlushTimer = setTimeout(() => {
      void flushDomSnapshot();
      domCooldownTimer = setTimeout(() => {
        domCooldownTimer = null;
        if (pendingDomTarget) {
          queueDomSnapshot(pendingDomTarget);
        }
      }, 800);
    }, 200);
  }

  function setupDomObserver() {
    if (domObserver || !document.body) return;
    domObserver = new MutationObserver((mutations) => {
      if (!isRecording) return;
      for (const mutation of mutations) {
        const target = mutation.target;
        const targetElement = target instanceof Element
          ? target
          : target instanceof Text
            ? target.parentElement
            : null;
        if (targetElement?.closest?.("#" + ROOT_ID)) continue;
        if (mutation.type === "childList") {
          const added = Array.from(mutation.addedNodes).find((node) => {
            const element = node instanceof Element ? node : node instanceof Text ? node.parentElement : null;
            return element && !element.closest?.("#" + ROOT_ID);
          });
          queueDomSnapshot(added || targetElement || document.body);
          return;
        }
        queueDomSnapshot(targetElement || document.body);
        return;
      }
    });
    domObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }

  async function emitAction(type, target, extra) {
    if (!isRecording) return;
    if (target instanceof Element && target.closest("#" + ROOT_ID)) return;
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
      locatorHints: target instanceof Element ? {
        role,
        name: nameFor(target),
        label,
        placeholder,
        testId,
        text,
      } : undefined,
      ...extra
    });
  }

  function applyState(nextState) {
    isRecording = !!nextState?.active;
    state.textContent = isRecording ? "录制中" : "待开始";
    toggleButton.textContent = isRecording ? "停止录制" : "开始录制";
    toggleButton.style.background = isRecording ? "linear-gradient(180deg, #dc2626, #b91c1c)" : "linear-gradient(180deg, #ef4444, #dc2626)";
    toggleButton.style.color = "#fff";
    toggleButton.style.boxShadow = isRecording
      ? "0 10px 24px rgba(185, 28, 28, 0.34)"
      : "0 10px 24px rgba(220, 38, 38, 0.28)";
    if (isRecording) {
      setupDomObserver();
    }
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

  const toggleButton = makeButton("开始录制");
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
        const result = await window.__cliSkillRecorderStop({});
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
    document.addEventListener("DOMContentLoaded", () => {
      mountOverlay();
      setupDomObserver();
    }, { once: true });
  } else {
    mountOverlay();
    setupDomObserver();
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
