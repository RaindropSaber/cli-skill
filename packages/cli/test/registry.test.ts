import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  listRegisteredSkills,
  registerLocalSkillProject,
} from "../src/registry";

let originalHome: string | undefined;
let tempHome: string;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tempHome = await mkdtemp(path.join(os.tmpdir(), "cli-skill-registry-"));
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

async function createSkillProject(projectDir: string): Promise<void> {
  await mkdir(path.join(projectDir, "bin"), { recursive: true });
  await mkdir(path.join(projectDir, "src"), { recursive: true });

  await writeFile(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "cli-skill-demo",
        version: "0.1.0",
        type: "module",
        bin: {
          demo: "./bin/demo",
        },
        cliSkill: true,
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(path.join(projectDir, "bin", "demo"), "#!/usr/bin/env bun\n", "utf8");
  await writeFile(path.join(projectDir, "src", "index.ts"), "export default {};\n", "utf8");
}

describe("registry", () => {
  test("registers a local skill and cleans invalid entries on list", async () => {
    const projectDir = path.join(tempHome, "workspace", "demo");
    await createSkillProject(projectDir);

    await registerLocalSkillProject(projectDir);

    const registered = await listRegisteredSkills();
    expect(registered).toHaveLength(1);
    expect(registered[0]?.skillName).toBe("demo");
    expect(registered[0]?.source).toBe("local");

    await rm(projectDir, { recursive: true, force: true });

    const cleaned = await listRegisteredSkills();
    expect(cleaned).toEqual([]);

    const registryPath = path.join(tempHome, ".cli-skill", "registry.json");
    const registryRaw = await readFile(registryPath, "utf8");
    expect(JSON.parse(registryRaw)).toEqual({ skills: {} });
  });
});
