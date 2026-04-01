import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedVersion: string | undefined;

export async function getCliVersion(): Promise<string> {
  if (cachedVersion) {
    return cachedVersion;
  }

  const packageJsonPath = path.resolve(import.meta.dirname, "..", "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: string };

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`Missing version in ${packageJsonPath}`);
  }

  cachedVersion = packageJson.version;
  return cachedVersion;
}
