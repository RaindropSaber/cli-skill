let templatePromise: Promise<string> | null = null;

async function buildTemplate(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [new URL("./runtime/index.ts", import.meta.url).pathname],
    target: "browser",
    format: "iife",
    write: false,
    minify: false,
    sourcemap: "none",
  } as any);

  if (!result.success || result.outputs.length === 0) {
    const details = result.logs.map((log) => log.message).join("\n");
    throw new Error(`Failed to bundle recorder bridge script.\n${details}`);
  }

  return await result.outputs[0].text();
}

async function readTemplate(): Promise<string> {
  templatePromise ??= buildTemplate();
  return await templatePromise;
}

export async function buildRecorderBridgeScript(sessionId: string): Promise<string> {
  const template = await readTemplate();
  return template.replaceAll("__SESSION_ID__", JSON.stringify(sessionId));
}
