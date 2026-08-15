import type { FileStore } from "../file/interface.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createReadFileTool(files: FileStore): Tool {
  return {
    definition: {
      name: "read_file",
      description:
        "Read the full contents of a UTF-8 text file. Paths are relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to read",
          },
        },
        required: ["path"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      return files.read(requireString(args, "path"));
    },
  };
}
