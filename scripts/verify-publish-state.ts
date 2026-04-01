import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadVersions() {
  const files = [
    path.join(repoRoot, "package.json"),
    path.join(repoRoot, "packages/core/package.json"),
    path.join(repoRoot, "packages/templates/package.json"),
    path.join(repoRoot, "packages/cli/package.json"),
  ];

  return Promise.all(
    files.map(async (file) => ({
      file,
      pkg: await readJson(file),
    })),
  );
}

async function verifySharedVersion(expectedVersion) {
  const entries = await loadVersions();
  const actualVersion = entries[0]?.pkg?.version;

  if (typeof actualVersion !== "string" || actualVersion.length === 0) {
    throw new Error("Missing version in root package.json");
  }

  for (const { file, pkg } of entries) {
    if (pkg.version !== actualVersion) {
      throw new Error(`${file} version ${pkg.version} does not match ${actualVersion}`);
    }
  }

  if (expectedVersion && actualVersion !== expectedVersion) {
    throw new Error(`Workspace version ${actualVersion} does not match expected ${expectedVersion}`);
  }

  return actualVersion;
}

async function verifyPrerelease() {
  const version = await verifySharedVersion();
  const shouldPublish = version.includes("-beta-");
  if (!shouldPublish) {
    throw new Error("Current branch version is not a beta prerelease. Refusing prerelease publish workflow.");
  }
  console.log(`version=${version}`);
  console.log("should_publish=true");
}

async function verifyRelease(expectedVersion) {
  if (!expectedVersion) {
    throw new Error("Missing expected release version");
  }

  if (expectedVersion.includes("-")) {
    throw new Error(`Prerelease tags are not published from the release workflow: ${expectedVersion}`);
  }

  await verifySharedVersion(expectedVersion);
}

async function main() {
  const mode = process.argv[2];
  const expectedVersion = process.argv[3];

  if (mode === "prerelease") {
    await verifyPrerelease();
    return;
  }

  if (mode === "release") {
    await verifyRelease(expectedVersion);
    return;
  }

  throw new Error(
    [
      "Usage:",
      "  bun ./scripts/verify-publish-state.ts prerelease",
      "  bun ./scripts/verify-publish-state.ts release <version>",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
