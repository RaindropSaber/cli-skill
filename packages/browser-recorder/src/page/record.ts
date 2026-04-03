export function getRecordPageHtml(sessionId: string, reviewUrl: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Browser Recorder</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 28%),
          radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.14), transparent 24%),
          #f8fafc;
        color: #0f172a;
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 72px 24px 120px;
      }
      .eyebrow {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.08);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      h1 {
        margin: 18px 0 12px;
        font-size: 40px;
        line-height: 1.08;
      }
      p {
        margin: 0;
        max-width: 640px;
        font-size: 16px;
        line-height: 1.7;
        color: #334155;
      }
      .grid {
        display: grid;
        gap: 16px;
        margin-top: 32px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .card {
        padding: 18px;
        border-radius: 18px;
        border: 1px solid #e2e8f0;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      }
      .card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .card span {
        display: block;
        font-size: 13px;
        line-height: 1.6;
        color: #475569;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 28px;
      }
      .actions a {
        border: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 128px;
        padding: 12px 16px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 700;
      }
      .actions a.primary {
        gap: 10px;
        background: linear-gradient(180deg, #ef4444, #dc2626);
        color: #fff;
        box-shadow: 0 14px 30px rgba(220, 38, 38, 0.28);
      }
      .actions a.secondary {
        background: #e2e8f0;
        color: #0f172a;
      }
      .record-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
      }
      code {
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 12px;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Browser Recorder Session</div>
      <h1>浏览器录制已就绪</h1>
      <p>右下角悬浮框可以开始或停止录制、打开录制页、记录关键帧。开始录制后，你可以直接在当前页继续操作，或者自行访问需要录制的网站。</p>
      <div class="grid">
        <div class="card">
          <strong>会话 ID</strong>
          <span><code>${sessionId}</code></span>
        </div>
        <div class="card">
          <strong>当前页面</strong>
          <span>这是录制启动页。你可以直接在这里开始，也可以在录制后导航到任意页面继续操作。</span>
        </div>
        <div class="card">
          <strong>录制页</strong>
          <span>录制页会展示用户行为、网络请求和关键帧快照，便于后续交给 AI 分析。</span>
        </div>
      </div>
      <div class="actions">
        <a class="primary" href="#" id="start-recording-button"><span class="record-dot"></span><span>开始录制</span></a>
        <a class="secondary" href="${reviewUrl}">打开录制页</a>
      </div>
    </main>
    <script>
      const startButton = document.getElementById("start-recording-button");
      if (startButton) {
        startButton.addEventListener("click", async (event) => {
          event.preventDefault();
          if (startButton.dataset.loading === "1") return;
          startButton.dataset.loading = "1";
          try {
            if (window.__cliSkillRecorderGetState && window.__cliSkillRecorderToggle) {
              const current = await window.__cliSkillRecorderGetState();
              if (!current?.active) {
                await window.__cliSkillRecorderToggle();
              }
            }
            startButton.innerHTML = '<span class="record-dot"></span><span>录制中</span>';
          } catch {}
          finally {
            startButton.dataset.loading = "0";
          }
        });
      }
    </script>
  </body>
</html>`;
}
