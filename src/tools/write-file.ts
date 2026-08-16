import type { FileStore } from "../workspace/interface.ts";
import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createWriteFileTool(files: FileStore): Tool {
  return {
    definition: {
      name: "write_file",
      description:
        "Write UTF-8 text to a file, creating parent directories if needed. Overwrites the file if it exists. Paths are relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to write",
          },
          content: {
            type: "string",
            description: "Full contents to write to the file",
          },
        },
        required: ["path", "content"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = requireString(args, "path");
      const content = requireString(args, "content");
      try {
        await files.write(filePath, content);
        return `OK write_file\npath: ${filePath}\nbytes: ${content.length}`;
      } catch (error) {
        return structuredError("write_file", error instanceof Error ? error.message : String(error), {
          path: filePath,
        });
      }
    },
  };
}
