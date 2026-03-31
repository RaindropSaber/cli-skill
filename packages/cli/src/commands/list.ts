import type { CAC } from "cac";
import os from "node:os";
import { listBrowserSkills } from "../registry";

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
    const skills = await listBrowserSkills();
    if (skills.length === 0) {
      console.log("无");
      return;
    }

    const rows = skills.map((skill) => ({
      skillName: skill.skillName,
      source: skill.source === "local" ? "local" : "remote",
      packageName: skill.packageName,
      active: skill.active ? "yes" : "no",
      agentPaths: `[${skill.agentPaths.map((agentPath) => formatPath(agentPath)).join(", ")}]`,
    }));

    const headers = {
      skillName: "Skill",
      source: "Source",
      packageName: "Package",
      active: "Active",
      agentPaths: "AgentPaths",
    };

    const widths = {
      skillName: Math.max(headers.skillName.length, ...rows.map((row) => row.skillName.length)),
      source: Math.max(headers.source.length, ...rows.map((row) => row.source.length)),
      packageName: Math.max(headers.packageName.length, ...rows.map((row) => row.packageName.length)),
      active: Math.max(headers.active.length, ...rows.map((row) => row.active.length)),
      agentPaths: Math.max(headers.agentPaths.length, ...rows.map((row) => row.agentPaths.length)),
    };

    console.log(
      [
        pad(headers.skillName, widths.skillName),
        pad(headers.source, widths.source),
        pad(headers.packageName, widths.packageName),
        pad(headers.active, widths.active),
        headers.agentPaths,
      ].join("  "),
    );

    for (const row of rows) {
      console.log(
        [
          pad(row.skillName, widths.skillName),
          pad(row.source, widths.source),
          pad(row.packageName, widths.packageName),
          pad(row.active, widths.active),
          row.agentPaths,
        ].join("  "),
      );
    }
  });
}
