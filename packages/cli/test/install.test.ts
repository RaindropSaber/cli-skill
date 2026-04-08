import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";

describe("install command", () => {
  let calls: {
    install: Array<{ packageName: string; installDir: string; registry?: string }>;
    register: string[];
    setupBins: string[];
  };
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    calls = {
      install: [],
      register: [],
      setupBins: [],
    };
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("installs by package name and forwards registry", async () => {
    const { createInstallSkillHandler } = await import("../src/commands/install");
    const handler = createInstallSkillHandler({
      getDefaultSkillsRoot: async () => "/tmp/cli-skill-managed",
      installPackageToDirectory: async (packageName, installDir, registry) => {
        calls.install.push({ packageName, installDir, registry });
      },
      registerInstalledSkillProject: async (projectPath) => {
        calls.register.push(projectPath);
        return undefined as never;
      },
      setupLocalSkillBins: async (projectPath) => {
        calls.setupBins.push(projectPath);
        return [];
      },
    });

    await handler("@your-scope/cli-skill-demo", {
      registry: "https://registry.example.com/",
    });

    expect(calls.install).toHaveLength(1);
    expect(calls.install[0]).toEqual({
      packageName: "@your-scope/cli-skill-demo",
      installDir: path.join("/tmp/cli-skill-managed", "demo"),
      registry: "https://registry.example.com/",
    });
    expect(calls.register).toEqual([
      path.join("/tmp/cli-skill-managed", "demo", "node_modules", "@your-scope/cli-skill-demo"),
    ]);
    expect(calls.setupBins).toEqual([
      path.join("/tmp/cli-skill-managed", "demo", "node_modules", "@your-scope/cli-skill-demo"),
    ]);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      path.join("/tmp/cli-skill-managed", "demo", "node_modules", "@your-scope/cli-skill-demo"),
    );
  });
});
