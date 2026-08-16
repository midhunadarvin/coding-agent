import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function loadPackageVersion(): string {
  try {
    const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
