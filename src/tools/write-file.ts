import type { FileStore } from "../file/interface.ts";
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
      await files.write(filePath, content);
      return `Wrote ${content.length} bytes to ${filePath}`;
    },
  };
}
