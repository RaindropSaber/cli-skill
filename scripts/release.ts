import { readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const rootPackageJsonPath = path.join(repoRoot, "package.json");
const packagesDir = path.join(repoRoot, "packages");

function usage() {
  return [
    "Usage:",
    "  bun run release <patch|minor|major|beta>",
    "",
    "Examples:",
    "  bun run release patch",
    "  bun run release minor",
    "  bun run release major",
    "  bun run release beta",
    "",
    "Rules:",
    "  - do not run release on main; use a release branch or another working branch",
    "  - patch/minor/major releases use the next semantic version",
    "  - beta releases keep the current semantic base version and refresh the -beta.<timestamp> suffix",
    "  - the script commits version changes on the current branch",
  ].join("\n");
}

function parseArgs(argv) {
  const [mode] = argv;
  return { mode };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();

  if (result.status !== 0) {
    const message = [stdout, stderr].filter(Boolean).join("\n");
    throw new Error(message || `${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }

  return stdout;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getCurrentBranch() {
  return run("git", ["branch", "--show-current"]);
}

function getTimestampVersionPart() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function getCurrentVersion() {
  const rootPkg = await readJson(rootPackageJsonPath);
  if (typeof rootPkg.version !== "string" || rootPkg.version.length === 0) {
    throw new Error(`Missing version in ${rootPackageJsonPath}`);
  }
  return rootPkg.version;
}

function getBaseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return `${match[1]}.${match[2]}.${match[3]}`;
}

function bumpVersion(version, releaseType) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  let [, major, minor, patch] = match;
  let nextMajor = Number(major);
  let nextMinor = Number(minor);
  let nextPatch = Number(patch);

  switch (releaseType) {
    case "major":
      nextMajor += 1;
      nextMinor = 0;
      nextPatch = 0;
      break;
    case "minor":
      nextMinor += 1;
      nextPatch = 0;
      break;
    case "patch":
      nextPatch += 1;
      break;
    default:
      throw new Error(`Unsupported release type: ${releaseType}`);
  }

  return `${nextMajor}.${nextMinor}.${nextPatch}`;
}

async function applyVersion(version) {
  const packageJsonPaths = await getManagedPackageJsonPaths();

  for (const packageJsonPath of packageJsonPaths) {
    const pkg = await readJson(packageJsonPath);
    pkg.version = version;
    syncInternalDependencies(pkg, version);
    await writeJson(packageJsonPath, pkg);
  }
}

async function getManagedPackageJsonPaths() {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packagePaths = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, "package.json"));

  return [rootPackageJsonPath, ...packagePaths];
}

function syncDependencyGroup(dependencies, version) {
  if (!dependencies || typeof dependencies !== "object") {
    return;
  }

  for (const [name, value] of Object.entries(dependencies)) {
    if (!name.startsWith("@cli-skill/") || typeof value !== "string") {
      continue;
    }

    dependencies[name] = `^${version}`;
  }
}

function syncInternalDependencies(pkg, version) {
  syncDependencyGroup(pkg.dependencies, version);
  syncDependencyGroup(pkg.devDependencies, version);
  syncDependencyGroup(pkg.peerDependencies, version);
  syncDependencyGroup(pkg.optionalDependencies, version);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.mode || !["major", "minor", "patch", "beta"].includes(options.mode)) {
    throw new Error(usage());
  }

  const currentBranch = getCurrentBranch();
  if (currentBranch === "main") {
    throw new Error("Do not prepare releases on main. Create or switch to a release branch first.");
  }

  const currentVersion = await getCurrentVersion();
  const currentBaseVersion = getBaseVersion(currentVersion);
  const nextVersion =
    options.mode === "beta"
      ? `${currentBaseVersion}-beta.${getTimestampVersionPart()}`
      : bumpVersion(currentBaseVersion, options.mode);
  const trackedFiles = [...(await getManagedPackageJsonPaths()), path.join(repoRoot, "bun.lock")];

  try {
    await applyVersion(nextVersion);
    run("bun", ["install", "--lockfile-only"]);
    run("bun", ["run", "test"]);

    run("git", [
      "add",
      ...trackedFiles.map((file) => path.relative(repoRoot, file)),
    ]);
    run("git", ["commit", "-m", `chore(release): prepare ${nextVersion}`]);

    console.log(`Prepared ${options.mode} release on branch: ${currentBranch}`);
    console.log(`Version: ${nextVersion}`);
    console.log(`Next step: push ${currentBranch}, open a PR to main, merge after checks pass, then create and push the matching tag.`);
  } catch (error) {
    run("git", ["checkout", "--", ...trackedFiles.map((file) => path.relative(repoRoot, file))]);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
