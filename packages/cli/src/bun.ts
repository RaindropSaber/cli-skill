import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runBun(
  args: string[],
  cwd?: string,
  envOverrides?: Record<string, string | undefined>,
): Promise<void> {
  await execFileAsync("bun", args, {
    cwd,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

export async function runBunx(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("bunx", args, {
    cwd,
    env: process.env,
  });
  return stdout.trim();
}

export async function runBunAndCapture(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("bun", args, {
    cwd,
    env: process.env,
  });
  return stdout.trim();
}

export async function getBunGlobalBinDir(): Promise<string> {
  return runBunAndCapture(["pm", "bin", "-g"]);
}

export async function installPackageToDirectory(packageSpec: string, installDir: string): Promise<void> {
  await rm(installDir, { recursive: true, force: true });
  await mkdir(installDir, { recursive: true });
  await writeFile(
    path.join(installDir, "package.json"),
    `${JSON.stringify({ name: "cli-skill-managed-install", private: true }, null, 2)}\n`,
    "utf8",
  );
  await runBun(["add", packageSpec], installDir);
}
