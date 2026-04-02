import type { CAC } from "cac";
import https from "node:https";
import path from "node:path";
import { installPackageToDirectory } from "../bun";
import { getDefaultSkillsRoot } from "../constants";
import { registerInstalledSkillProject, setupLocalSkillBins } from "../registry";

interface SearchResultPackage {
  name: string;
  keywords?: string[];
}

interface SearchResultObject {
  package: SearchResultPackage;
}

interface NpmSearchResponse {
  objects?: SearchResultObject[];
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const statusCode = response.statusCode ?? 500;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Request failed with status ${statusCode}`));
          response.resume();
          return;
        }

        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function searchSkillPackages(skillName: string): Promise<SearchResultPackage[]> {
  const params = new URLSearchParams({
    text: `keywords:cli-skill ${skillName}`,
    size: "20",
    from: "0",
    quality: "0.65",
    popularity: "0.5",
    maintenance: "0.5",
  });

  const response = await fetchJson<NpmSearchResponse>(
    `https://registry.npmjs.org/-/v1/search?${params.toString()}`,
  );

  return (response.objects ?? [])
    .map((entry) => entry.package)
    .filter((pkg) => {
      const keywords = new Set(pkg.keywords ?? []);
      return keywords.has("cli-skill") && keywords.has(skillName);
    });
}

async function resolveInstallTarget(
  skillName: string,
  explicitPackageName?: string,
): Promise<{ packageSpec: string; packageName: string }> {
  if (explicitPackageName) {
    return { packageSpec: explicitPackageName, packageName: explicitPackageName };
  }

  const matchedPackages = await searchSkillPackages(skillName);
  if (matchedPackages.length === 1) {
    const [pkg] = matchedPackages;
    return { packageSpec: pkg.name, packageName: pkg.name };
  }

  if (matchedPackages.length > 1) {
    const names = matchedPackages.map((pkg) => pkg.name).join(", ");
    throw new Error(`Multiple skill packages matched "${skillName}": ${names}`);
  }

  throw new Error(
    `No cli skill package matched "${skillName}". Publish a package with keywords "cli-skill" and "${skillName}", or install by explicit package name via --packageName.`,
  );
}

export function registerInstallCommand(cli: CAC): void {
  cli
    .command("install <skillName>", "Install a cli skill into cli-skill managed storage")
    .alias("i")
    .option("--packageName <packageName>", "Install directly by explicit package name")
    .option("--package-name <packageName>", "Install directly by explicit package name")
    .action(
      async (
        skillName: string,
        options: { packageName?: string; "package-name"?: string },
      ) => {
        const explicitPackageName = options.packageName ?? options["package-name"];
        const { packageSpec, packageName } = await resolveInstallTarget(skillName, explicitPackageName);

        const skillsRoot = await getDefaultSkillsRoot();
        const installDir = path.join(skillsRoot, skillName);
        await installPackageToDirectory(packageSpec, installDir);
        const packageDir = path.join(installDir, "node_modules", packageName);
        await registerInstalledSkillProject(packageDir);
        await setupLocalSkillBins(packageDir);
        console.log(packageDir);
      },
    );
}
