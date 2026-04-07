import { appendFile, mkdir, writeFile } from "node:fs/promises";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, value: string): Promise<void> {
  await writeFile(filePath, value, "utf8");
}

export async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function writeJsonLines(filePath: string, values: unknown[]): Promise<void> {
  const content = values.map((value) => JSON.stringify(value)).join("\n");
  await writeFile(filePath, content ? `${content}\n` : "", "utf8");
}
