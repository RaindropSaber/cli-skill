import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ensureBrowserSkillCliConfig,
  getBrowserSkillConfigPath,
  getConfigValue,
  loadBrowserSkillCliConfig,
  parseConfigCliValue,
  saveBrowserSkillCliConfig,
  setConfigValue,
  unsetConfigValue,
} from "../src/config";

let originalHome: string | undefined;
let tempHome: string;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = await mkdtemp(path.join(os.tmpdir(), "cli-skill-home-"));
  process.env.HOME = tempHome;
});

afterEach(async () => {
  if (typeof originalHome === "undefined") {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
  await rm(tempHome, { recursive: true, force: true });
});

describe("config helpers", () => {
  test("creates default config file in HOME", async () => {
    const configPath = await ensureBrowserSkillCliConfig();
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(configPath).toBe(getBrowserSkillConfigPath());
    expect(parsed.skillsRoot).toBe(path.join(tempHome, ".cli-skill", "skills"));
    expect(parsed.installedSkillsRoot).toBe(path.join(tempHome, ".cli-skill", "installed"));
    expect(parsed.agentsSkillsRoot).toBe(path.join(tempHome, ".agents", "skills"));
    expect(parsed.skillConfig).toEqual({});
  });

  test("supports nested set/get/unset for skill config", async () => {
    const initial = await loadBrowserSkillCliConfig();
    const withValue = setConfigValue(initial, "skillConfig.demo.baseUrl", "https://example.com");
    const withFlag = setConfigValue(withValue, "skillConfig.demo.flags.enabled", true);
    await saveBrowserSkillCliConfig(withFlag);

    const saved = await loadBrowserSkillCliConfig();
    expect(getConfigValue(saved, "skillConfig.demo.baseUrl")).toBe("https://example.com");
    expect(getConfigValue(saved, "skillConfig.demo.flags.enabled")).toBe(true);

    const unset = unsetConfigValue(saved, "skillConfig.demo.flags.enabled");
    await saveBrowserSkillCliConfig(unset);
    const next = await loadBrowserSkillCliConfig();
    expect(getConfigValue(next, "skillConfig.demo.flags")).toEqual({});
  });

  test("parses primitive cli values", () => {
    expect(parseConfigCliValue("true")).toBe(true);
    expect(parseConfigCliValue("false")).toBe(false);
    expect(parseConfigCliValue("null")).toBe(null);
    expect(parseConfigCliValue("42")).toBe(42);
    expect(parseConfigCliValue("{\"a\":1}")).toEqual({ a: 1 });
    expect(parseConfigCliValue("[1,2]")).toEqual([1, 2]);
    expect(parseConfigCliValue("plain-text")).toBe("plain-text");
  });
});
