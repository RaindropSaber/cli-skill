import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSkillRoot(moduleUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..");
}
