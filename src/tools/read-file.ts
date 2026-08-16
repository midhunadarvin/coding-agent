import type { FileStore } from "../workspace/interface.ts";
import { formatReadOutput, structuredError } from "./aci.ts";
import { optionalInteger, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createReadFileTool(files: FileStore): Tool {
  return {
    definition: {
      name: "read_file",
      description:
        "Read a UTF-8 text file with line numbers. Use offset and limit for long files. Paths are relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
          offset: { type: "integer", description: "1-based start line" },
          limit: { type: "integer", description: "Maximum number of lines to return" },
        },
        required: ["path"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = requireString(args, "path");
      const offset = optionalInteger(args, "offset") ?? 1;
      const limit = optionalInteger(args, "limit") ?? 400;
      try {
        const content = await files.read(filePath);
        return formatReadOutput(filePath, content, offset, limit);
      } catch (error) {
        return structuredError("read_file", error instanceof Error ? error.message : String(error), {
          path: filePath,
        });
      }
    },
  };
}
