import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const home = path.join(os.homedir(), ".browser-skill");
const configPath = path.join(home, "config.json");
const defaultConfig = {
  skillsRoot: path.join(home, "skills"),
  agentsSkillsRoot: path.join(os.homedir(), ".agents", "skills"),
};

try {
  await readFile(configPath, "utf8");
} catch {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
}
