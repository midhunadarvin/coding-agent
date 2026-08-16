import path from "node:path";
import type { FileStore } from "../file/interface.ts";
import { walkWorkspaceFiles } from "../file/walk.ts";
import { structuredError } from "./aci.ts";
import { optionalInteger, optionalString, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

const DEFAULT_MAX_RESULTS = 200;

export function createGlobTool(files: FileStore): Tool {
  return {
    definition: {
      name: "glob",
      description:
        "Find files by glob pattern relative to the working directory. Examples: **/*.ts, src/**/*.md",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern, e.g. **/*.ts" },
          path: { type: "string", description: "Optional subdirectory to search from" },
          max_results: { type: "integer", description: "Maximum paths to return (default 200)" },
        },
        required: ["pattern"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const pattern = requireString(args, "pattern");
      const scope = optionalString(args, "path") ?? ".";
      const maxResults = optionalInteger(args, "max_results") ?? DEFAULT_MAX_RESULTS;

      try {
        const matcher = compileGlob(pattern);
        const start = files.resolve(scope);
        const hits: string[] = [];
        const workspaces =
          start === files.root ? files.roots() : [{ name: "", root: start }];

        outer: for (const workspace of workspaces) {
          for await (const relative of walkWorkspaceFiles(workspace.root, workspace.root)) {
            const workspacePath = files.toLogicalPath(path.join(workspace.root, relative));
            if (!matcher(workspacePath) && !matcher(path.posix.basename(relative))) {
              continue;
            }
            hits.push(workspacePath);
            if (hits.length >= maxResults) {
              break outer;
            }
          }
        }

        hits.sort();
        const suffix = hits.length >= maxResults ? `\n... truncated at ${maxResults} paths` : "";
        return `OK glob\nmatches: ${hits.length}\n${hits.join("\n")}${suffix}`;
      } catch (error) {
        return structuredError("glob", error instanceof Error ? error.message : String(error), {
          pattern,
        });
      }
    },
  };
}

function compileGlob(pattern: string): (value: string) => boolean {
  const escaped = pattern
    .replaceAll("\\", "/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "{{GLOBSTAR}}")
    .replaceAll("*", "[^/]*")
    .replaceAll("?", "[^/]")
    .replaceAll("{{GLOBSTAR}}", ".*");
  const regex = new RegExp(`^${escaped}$`);
  return (value: string) => regex.test(value.replaceAll("\\", "/"));
}
