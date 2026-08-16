import { stat } from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "../workspace/interface.ts";
import { walkWorkspaceFiles } from "../workspace/walk.ts";
import { structuredError } from "./aci.ts";
import { optionalInteger, optionalString, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

const DEFAULT_MAX_MATCHES = 50;

export function createGrepTool(files: FileStore): Tool {
  return {
    definition: {
      name: "grep",
      description:
        "Search file contents with a regular expression. Returns path, line number, and matching text. Skips node_modules, dist, and .git.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "JavaScript regular expression" },
          path: { type: "string", description: "Optional subdirectory or file to search" },
          max_matches: { type: "integer", description: "Maximum matches to return (default 50)" },
        },
        required: ["pattern"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const pattern = requireString(args, "pattern");
      const scope = optionalString(args, "path") ?? ".";
      const maxMatches = optionalInteger(args, "max_matches") ?? DEFAULT_MAX_MATCHES;

      let regex: RegExp;
      try {
        regex = new RegExp(pattern);
      } catch (error) {
        return structuredError("grep", error instanceof Error ? error.message : String(error), {
          pattern,
        });
      }

      try {
        const start = files.resolve(scope);
        const info = await stat(start);
        const targets = info.isFile()
          ? [files.toLogicalPath(start)]
          : collectScopedFiles(files, start);

        const matches: string[] = [];
        for await (const filePath of targets) {
          let content: string;
          try {
            content = await files.read(filePath);
          } catch {
            continue;
          }
          if (content.includes("\0")) {
            continue;
          }

          const lines = content.split("\n");
          for (let index = 0; index < lines.length; index += 1) {
            if (!regex.test(lines[index] ?? "")) {
              continue;
            }
            matches.push(`${filePath}:${index + 1}:${lines[index]}`);
            if (matches.length >= maxMatches) {
              return `OK grep\nmatches: ${matches.length}\n${matches.join("\n")}\n... truncated at ${maxMatches} matches`;
            }
          }
        }

        if (matches.length === 0) {
          return `OK grep\nmatches: 0\npattern: ${pattern}`;
        }
        return `OK grep\nmatches: ${matches.length}\n${matches.join("\n")}`;
      } catch (error) {
        return structuredError("grep", error instanceof Error ? error.message : String(error), {
          pattern,
        });
      }
    },
  };
}

async function* collectScopedFiles(
  files: import("../workspace/interface.ts").FileStore,
  start: string,
): AsyncGenerator<string> {
  if (start === files.root) {
    for (const workspace of files.roots()) {
      for await (const relative of walkWorkspaceFiles(workspace.root, workspace.root)) {
        yield files.toLogicalPath(path.join(workspace.root, relative));
      }
    }
    return;
  }
  for await (const relative of walkWorkspaceFiles(start, start)) {
    yield files.toLogicalPath(path.join(start, relative));
  }
}
