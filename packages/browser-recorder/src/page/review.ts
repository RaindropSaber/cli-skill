export function getReviewPageHtml(sessionId: string): string {
  return `<!doctype html>
<html lang="zh-CN" data-cli-skill-recorder-review="true">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Browser Recorder - ${sessionId}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #fff; position: sticky; top: 0; }
      h1 { margin: 0; font-size: 18px; }
      .tabs { display: flex; gap: 8px; margin-top: 12px; }
      .tabs button { border: 0; border-radius: 999px; padding: 8px 12px; cursor: pointer; background: #e2e8f0; }
      .tabs button.active { background: #0f172a; color: #fff; }
      main { padding: 24px; }
      section { display: none; }
      section.active { display: block; }
      .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 12px; }
      img { max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <header>
      <h1>录制会话 ${sessionId}</h1>
      <div class="tabs">
        <button data-tab="actions" class="active">用户行为</button>
        <button data-tab="network">网络请求</button>
        <button data-tab="keyframes">关键帧快照</button>
      </div>
    </header>
    <main>
      <section id="actions" class="active"></section>
      <section id="network"></section>
      <section id="keyframes"></section>
    </main>
    <script>
      const sessionId = ${JSON.stringify(sessionId)};
      const actionsSection = document.getElementById("actions");
      const networkSection = document.getElementById("network");
      const keyframesSection = document.getElementById("keyframes");

      document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll("[data-tab]").forEach((node) => node.classList.remove("active"));
          document.querySelectorAll("main section").forEach((node) => node.classList.remove("active"));
          button.classList.add("active");
          document.getElementById(button.dataset.tab).classList.add("active");
        });
      });

      function card(content) {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = content;
        return div;
      }

      async function render() {
        const response = await fetch('/api/sessions/' + sessionId + '/export');
        const data = await response.json();

        actionsSection.innerHTML = "";
        networkSection.innerHTML = "";
        keyframesSection.innerHTML = "";

        data.actions.forEach((item) => {
          actionsSection.appendChild(card(
            '<strong>' + item.type + '</strong><pre>' + JSON.stringify(item, null, 2) + '</pre>'
          ));
        });

        data.network.forEach((item) => {
          networkSection.appendChild(card(
            '<strong>' + item.phase + '</strong><pre>' + JSON.stringify(item, null, 2) + '</pre>'
          ));
        });

        data.keyframes.forEach((item) => {
          const image = item.screenshotUrl ? '<img src="' + item.screenshotUrl + '" alt="keyframe" />' : '';
          keyframesSection.appendChild(card(
            image + '<pre>' + JSON.stringify(item, null, 2) + '</pre>'
          ));
        });
      }

      render().catch((error) => {
        actionsSection.appendChild(card('<pre>' + String(error) + '</pre>'));
      });
    </script>
  </body>
</html>`;
}
