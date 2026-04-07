import { chromium, type APIRequestContext, type Browser, type BrowserContext, type Page } from "playwright";
import type { SkillPlugin } from "../types";

export interface BrowserPluginContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
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
    let context: BrowserContext;

    try {
      context = await chromium.launchPersistentContext(ctx.paths.browserUserDataDir, {
        headless: options.headed !== true,
        executablePath: options.browserExecutablePath || options.globalConfig.browserExecutablePath || undefined,
        viewport: { width: 1440, height: 960 },
        args: ["--window-size=1440,960"],
      });
    } catch (error) {
      if (isMissingBrowserExecutableError(error)) {
        throw createMissingBrowserExecutableError(error);
      }

      throw error;
    }

    const browser = context.browser();
    if (!browser) {
      await context.close().catch(() => undefined);
      throw new Error("Failed to get browser instance from persistent context.");
    }
    const page = context.pages()[0] ?? await context.newPage();

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
  },
};
