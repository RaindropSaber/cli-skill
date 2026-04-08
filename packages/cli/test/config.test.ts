import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ensureCliSkillConfig,
  getCliSkillConfigPath,
  getConfigValue,
  getResolvedCliSkillConfig,
  loadCliSkillConfig,
  parseConfigCliValue,
  saveCliSkillConfig,
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
    const configPath = await ensureCliSkillConfig();
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(configPath).toBe(getCliSkillConfigPath());
    expect(parsed.skillsRoot).toBe(path.join("~", ".cli-skill", "skills"));
    expect(parsed.agentsSkillsRoot).toBe(path.join("~", ".agents", "skills"));
    expect(parsed.recordBrowserRun).toBe(false);
  });

  test("supports nested set/get/unset for flat config keys", async () => {
    const initial = await loadCliSkillConfig();
    const withValue = setConfigValue(initial, "demo.baseUrl", "https://example.com");
    const withFlag = setConfigValue(withValue, "demo.flags.enabled", true);
    await saveCliSkillConfig(withFlag);

    const saved = await loadCliSkillConfig();
    expect(getConfigValue(saved, "demo.baseUrl")).toBe("https://example.com");
    expect(getConfigValue(saved, "demo.flags.enabled")).toBe(true);

    const unset = unsetConfigValue(saved, "demo.flags.enabled");
    await saveCliSkillConfig(unset);
    const next = await loadCliSkillConfig();
    expect(getConfigValue(next, "demo.flags")).toEqual({});
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

  test("merges .cli-skill-config.json files from parent to child directories", async () => {
    await saveCliSkillConfig({
      browserUserDataDir: "~/global-user-data",
      demo: {
        baseUrl: "https://global.example.com",
      },
    } as Record<string, unknown>);

    const parentDir = path.join(tempHome, "workspace");
    const childDir = path.join(parentDir, "twins");
    await mkdir(childDir, { recursive: true });

    await writeFile(
      path.join(parentDir, ".cli-skill-config.json"),
      `${JSON.stringify({
        browserUserDataDir: "~/workspace-user-data",
        demo: {
          env: "workspace",
        },
      }, null, 2)}\n`,
      "utf8",
    );

    await writeFile(
      path.join(childDir, ".cli-skill-config.json"),
      `${JSON.stringify({
        demo: {
          env: "twins",
        },
      }, null, 2)}\n`,
      "utf8",
    );

    const resolved = await getResolvedCliSkillConfig(childDir);
    expect(resolved.browserUserDataDir).toBe(path.join(tempHome, "workspace-user-data"));
    expect((resolved as Record<string, unknown>).demo).toEqual({
      baseUrl: "https://global.example.com",
      env: "twins",
    });
  });
});
