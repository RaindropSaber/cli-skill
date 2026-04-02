import type { CAC } from "cac";
import os from "node:os";
import { listRegisteredSkills } from "../registry";

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

function formatPath(value: string): string {
  const home = os.homedir();
  if (value === home) {
    return "~";
  }

  if (value.startsWith(`${home}/`)) {
    return `~/${value.slice(home.length + 1)}`;
  }

  return value;
}

export function registerListCommand(cli: CAC): void {
  cli.command("list", "List local and installed cli skills").action(async () => {
    const skills = await listRegisteredSkills();
    if (skills.length === 0) {
      console.log("无");
      return;
    }

    const rows = skills.map((skill) => ({
      name: skill.skillName,
      packageName: skill.packageName,
      source: skill.source,
      mounted: `[${skill.agentPaths.map((agentPath) => formatPath(agentPath)).join(", ")}]`,
    }));

    const headers = {
      name: "Name",
      packageName: "Package",
      source: "Source",
      mounted: "MountPaths",
    };

    const widths = {
      name: Math.max(headers.name.length, ...rows.map((row) => row.name.length)),
      packageName: Math.max(headers.packageName.length, ...rows.map((row) => row.packageName.length)),
      source: Math.max(headers.source.length, ...rows.map((row) => row.source.length)),
      mounted: Math.max(headers.mounted.length, ...rows.map((row) => row.mounted.length)),
    };

    console.log(
      [
        pad(headers.name, widths.name),
        pad(headers.packageName, widths.packageName),
        pad(headers.source, widths.source),
        headers.mounted,
      ].join("  "),
    );

    for (const row of rows) {
      console.log(
        [
          pad(row.name, widths.name),
          pad(row.packageName, widths.packageName),
          pad(row.source, widths.source),
          row.mounted,
        ].join("  "),
      );
    }
  });
}
