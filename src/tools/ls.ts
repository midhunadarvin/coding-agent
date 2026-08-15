import type { FileStore } from "../file/interface.ts";
import { structuredError } from "./aci.ts";
import { optionalString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createLsTool(files: FileStore): Tool {
  return {
    definition: {
      name: "ls",
      description: "List files and directories in a workspace path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory to list (default .)" },
        },
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const dirPath = optionalString(args, "path") ?? ".";
      try {
        const entries = await files.list(dirPath);
        if (entries.length === 0) {
          return `OK ls\npath: ${dirPath}\nentries: 0`;
        }
        const lines = entries.map((entry) =>
          entry.type === "dir" ? `${entry.name}/` : entry.name,
        );
        return `OK ls\npath: ${dirPath}\nentries: ${entries.length}\n${lines.join("\n")}`;
      } catch (error) {
        return structuredError("ls", error instanceof Error ? error.message : String(error), {
          path: dirPath,
        });
      }
    },
  };
}
