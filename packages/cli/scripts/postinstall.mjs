import { mkdir, rm, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const skillDir = path.join(packageRoot, "skill");
const targetDir = path.join(os.homedir(), ".agents", "skills");
const targetLink = path.join(targetDir, "cli-skill");

function hasBun() {
  const result = spawnSync("bun", ["--version"], {
    encoding: "utf8",
    stdio: "ignore",
  });

  return result.status === 0;
}

function ensureBunInstalled() {
  if (hasBun()) {
    return;
  }

  console.log("bun was not found in PATH. Installing bun globally with npm...");
  const installResult = spawnSync("npm", ["install", "-g", "bun"], {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (installResult.status !== 0 || !hasBun()) {
    throw new Error("Failed to install bun globally during cli-skill postinstall.");
  }
}

async function main() {
  ensureBunInstalled();
  await mkdir(targetDir, { recursive: true });
  await rm(targetLink, { recursive: true, force: true });
  await symlink(skillDir, targetLink, "dir");
  console.log(`Linked cli-skill skill to ${targetLink}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
