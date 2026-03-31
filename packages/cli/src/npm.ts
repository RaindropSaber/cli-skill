import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runNpm(args: string[], cwd?: string): Promise<void> {
  await execFileAsync("npm", args, {
    cwd,
    env: process.env,
  });
}

export async function runNpmAndCapture(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("npm", args, {
    cwd,
    env: process.env,
  });
  return stdout.trim();
}

export async function resolveInstalledPackageDir(packageName: string): Promise<string> {
  const globalRoot = await runNpmAndCapture(["root", "-g"]);
  return path.join(globalRoot, packageName);
}
