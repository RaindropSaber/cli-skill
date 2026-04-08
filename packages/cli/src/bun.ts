import { execFile, spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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

export async function runBunStreaming(
  args: string[],
  cwd?: string,
  envOverrides?: Record<string, string | undefined>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("bun", args, {
      cwd,
      env: {
        ...process.env,
        ...envOverrides,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`bun ${args.join(" ")} failed with code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}`));
    });
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
  const home = process.env.HOME || os.homedir();
  const bunInstall = process.env.BUN_INSTALL || path.join(home, ".bun");
  return path.join(bunInstall, "bin");
}

export async function installPackageToDirectory(
  packageSpec: string,
  installDir: string,
  registry?: string,
): Promise<void> {
  await rm(installDir, { recursive: true, force: true });
  await mkdir(installDir, { recursive: true });
  await writeFile(
    path.join(installDir, "package.json"),
    `${JSON.stringify({ name: "cli-skill-managed-install", private: true }, null, 2)}\n`,
    "utf8",
  );
  const args = ["add", packageSpec];
  if (registry) {
    args.push("--registry", registry);
  }
  await runBun(args, installDir);
}
