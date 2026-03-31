import type { CAC } from "cac";
import { resolveInstalledPackageDir, runNpm } from "../npm";
import { registerSkill } from "../registry";

function inferPackageName(packageSpec: string): string | null {
  if (
    packageSpec.startsWith(".") ||
    packageSpec.startsWith("/") ||
    packageSpec.startsWith("file:") ||
    packageSpec.startsWith("http://") ||
    packageSpec.startsWith("https://") ||
    packageSpec.endsWith(".tgz")
  ) {
    return null;
  }

  return packageSpec;
}

export function registerInstallCommand(cli: CAC): void {
  cli
    .command("install <packageSpec>", "Install a browser skill globally")
    .option("--package-name <packageName>", "Explicit package name when packageSpec is a path or tarball")
    .action(async (packageSpec: string, options: { packageName?: string }) => {
      const packageName = options.packageName ?? inferPackageName(packageSpec);
      if (!packageName) {
        throw new Error("Missing --package-name for non-registry package specs.");
      }

      await runNpm(["install", "-g", packageSpec]);
      const packageDir = await resolveInstalledPackageDir(packageName);
      const targetPath = await registerSkill(packageDir);
      console.log(targetPath);
    });
}
