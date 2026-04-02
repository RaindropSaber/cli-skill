import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { chromium, type APIRequestContext, type Browser, type BrowserContext, type Page } from "playwright";
import type { SkillPlugin } from "../types";

export interface BrowserPluginContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isMissingBrowserExecutableError(error: unknown): error is Error {
  return error instanceof Error && /Executable doesn't exist/i.test(error.message);
}

function createMissingBrowserExecutableError(error: Error): Error {
  return new Error(
    [
      "Playwright browser binaries are not installed.",
      'Run `bunx playwright install chromium` and try again.',
      "",
      error.message,
    ].join("\n"),
  );
}

export const browserPlugin: SkillPlugin<BrowserPluginContext> = {
  name: "browser",
  async setup(ctx, options) {
    const storageState = (await fileExists(ctx.storageStatePath)) ? ctx.storageStatePath : undefined;
    let browser: Browser;

    try {
      browser = await chromium.launch({ headless: options.headed !== true });
    } catch (error) {
      if (isMissingBrowserExecutableError(error)) {
        throw createMissingBrowserExecutableError(error);
      }

      throw error;
    }

    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    return {
      browser,
      context,
      page,
      request: context.request,
    };
  },
  async dispose(ctx) {
    await ctx.context.storageState({ path: ctx.storageStatePath });
    await ctx.context.close();
    await ctx.browser.close();
  },
};
