import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const packagesDir = path.join(repoRoot, "packages");

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageDir = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(packageDir, "package.json");
    const pkg = await readJson(packageJsonPath);

    if (pkg.private === true) continue;
    if (typeof pkg.name !== "string" || pkg.name.length === 0) continue;

    packages.push({
      name: pkg.name,
      path: `./packages/${entry.name}`,
    });
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));
  console.log(`packages=${JSON.stringify(packages)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
