import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();

const packageJsonPaths = {
  root: path.join(repoRoot, "package.json"),
  core: path.join(repoRoot, "packages/core/package.json"),
  templates: path.join(repoRoot, "packages/templates/package.json"),
  cli: path.join(repoRoot, "packages/cli/package.json"),
};

const trackedFiles = [
  packageJsonPaths.root,
  packageJsonPaths.core,
  packageJsonPaths.templates,
  packageJsonPaths.cli,
  path.join(repoRoot, "bun.lock"),
];

function usage() {
  return [
    "Usage:",
    "  bun run release --type <major|minor|patch> [--channel <stable|beta>]",
    "",
    "Examples:",
    "  bun run release --type patch",
    "  bun run release --type minor --channel beta",
    "",
    "Rules:",
    "  - git status must be clean before preparing a release commit",
    "  - do not run release on main; use a release branch or another working branch",
    "  - stable releases use the next semantic version",
    "  - beta releases use 0.0.1-beta.<timestamp>",
    "  - the script commits version changes on the current branch",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    type: undefined,
    channel: "stable",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--type") {
      options.type = next;
      index += 1;
      continue;
    }

    if (arg === "--channel") {
      options.channel = next ?? "stable";
      index += 1;
      continue;
    }
  }

  return options;
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

function ensureCleanGitStatus() {
  const status = run("git", ["status", "--porcelain"]);
  if (status.length > 0) {
    throw new Error("Git status is not clean. Commit or stash your changes before preparing a release branch.");
  }
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
  const rootPkg = await readJson(packageJsonPaths.root);
  if (typeof rootPkg.version !== "string" || rootPkg.version.length === 0) {
    throw new Error(`Missing version in ${packageJsonPaths.root}`);
  }
  return rootPkg.version;
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
  const rootPkg = await readJson(packageJsonPaths.root);
  const corePkg = await readJson(packageJsonPaths.core);
  const templatesPkg = await readJson(packageJsonPaths.templates);
  const cliPkg = await readJson(packageJsonPaths.cli);

  rootPkg.version = version;
  corePkg.version = version;
  templatesPkg.version = version;
  cliPkg.version = version;
  cliPkg.dependencies ||= {};
  cliPkg.dependencies["@cli-skill/core"] = `^${version}`;

  await writeJson(packageJsonPaths.root, rootPkg);
  await writeJson(packageJsonPaths.core, corePkg);
  await writeJson(packageJsonPaths.templates, templatesPkg);
  await writeJson(packageJsonPaths.cli, cliPkg);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.type || !["major", "minor", "patch"].includes(options.type)) {
    throw new Error(usage());
  }

  if (!["stable", "beta"].includes(options.channel)) {
    throw new Error(`Unsupported channel: ${options.channel}`);
  }

  ensureCleanGitStatus();

  const currentBranch = getCurrentBranch();
  if (currentBranch === "main") {
    throw new Error("Do not prepare releases on main. Create or switch to a release branch first.");
  }

  const currentVersion = await getCurrentVersion();
  const nextVersion =
    options.channel === "stable"
      ? bumpVersion(currentVersion, options.type)
      : `0.0.1-beta.${getTimestampVersionPart()}`;

  try {
    await applyVersion(nextVersion);
    run("bun", ["install", "--lockfile-only"]);
    run("bun", ["run", "test"]);

    run("git", [
      "add",
      ...trackedFiles.map((file) => path.relative(repoRoot, file)),
    ]);
    run("git", ["commit", "-m", `chore(release): prepare ${nextVersion}`]);

    console.log(`Prepared ${options.channel} release on branch: ${currentBranch}`);
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
