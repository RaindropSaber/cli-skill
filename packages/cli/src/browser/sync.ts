import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

export const BROWSER_USER_DATA_SYNC_WHITELIST = [
  "Cookies",
  "Cookies-journal",
  "History",
  "History-journal",
  "Visited Links",
  "Top Sites",
  "Top Sites-journal",
  "Shortcuts",
  "Shortcuts-journal",
  "Web Data",
  "Web Data-journal",
  "Favicons",
  "Favicons-journal",
  "Preferences",
  "Local Storage",
  "Session Storage",
] as const;

interface SyncBrowserUserDataOptions {
  sourceDir: string;
  targetDir: string;
}

export interface SyncBrowserUserDataResult {
  sourceDir: string;
  targetDir: string;
  copied: string[];
  skipped: string[];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function syncBrowserUserData(
  options: SyncBrowserUserDataOptions,
): Promise<SyncBrowserUserDataResult> {
  const sourceDir = path.resolve(options.sourceDir);
  const targetDir = path.resolve(options.targetDir);
  const targetProfileDir = path.join(targetDir, "Default");

  if (!(await pathExists(sourceDir))) {
    throw new Error(`Source browser user data directory does not exist: ${sourceDir}`);
  }

  await mkdir(targetProfileDir, { recursive: true });

  const copied: string[] = [];
  const skipped: string[] = [];

  for (const entry of BROWSER_USER_DATA_SYNC_WHITELIST) {
    const sourcePath = path.join(sourceDir, entry);
    const targetPath = path.join(targetProfileDir, entry);

    if (!(await pathExists(sourcePath))) {
      skipped.push(entry);
      continue;
    }

    await rm(targetPath, { force: true, recursive: true }).catch(() => undefined);
    await cp(sourcePath, targetPath, { recursive: true, force: true });
    copied.push(entry);
  }

  return {
    sourceDir,
    targetDir,
    copied,
    skipped,
  };
}
