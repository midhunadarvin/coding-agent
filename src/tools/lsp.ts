import type { FileStore } from "../file/interface.ts";
import { getDefinition, getDiagnostics, getHover } from "../lsp/typescript-service.ts";
import { structuredError } from "./aci.ts";
import { optionalInteger, optionalString, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createLspTools(files: FileStore): Tool[] {
  return [createDiagnosticsTool(files), createHoverTool(files), createDefinitionTool(files)];
}

function createDiagnosticsTool(files: FileStore): Tool {
  return {
    definition: {
      name: "lsp_diagnostics",
      description: "TypeScript language-service diagnostics for a file or the whole project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Optional file to check" },
        },
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = optionalString(args, "path");
      try {
        const root = files.root;
        const resolved = filePath ? files.toLogicalPath(files.resolve(filePath)) : undefined;
        const diagnostics = getDiagnostics(root, resolved);
        if (diagnostics.length === 0) {
          return `OK lsp_diagnostics\nissues: 0`;
        }
        const lines = diagnostics.map(
          (item) => `${item.path}:${item.line}:${item.character} TS${item.code} ${item.message}`,
        );
        return `OK lsp_diagnostics\nissues: ${diagnostics.length}\n${lines.join("\n")}`;
      } catch (error) {
        return structuredError(
          "lsp_diagnostics",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}

function createHoverTool(files: FileStore): Tool {
  return {
    definition: {
      name: "lsp_hover",
      description: "Type information at a 1-based file position (TypeScript language service).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          line: { type: "integer", description: "1-based line" },
          character: { type: "integer", description: "1-based column" },
        },
        required: ["path", "line", "character"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = requireString(args, "path");
      const line = optionalInteger(args, "line");
      const character = optionalInteger(args, "character");
      if (line === undefined || character === undefined) {
        return structuredError("lsp_hover", "line and character are required");
      }
      try {
        const hover = getHover(files.root, files.toLogicalPath(files.resolve(filePath)), line, character);
        if (!hover) {
          return `OK lsp_hover\n(no info)`;
        }
        const docs = hover.documentation ? `\n${hover.documentation}` : "";
        return `OK lsp_hover\n${hover.display}${docs}`;
      } catch (error) {
        return structuredError("lsp_hover", error instanceof Error ? error.message : String(error), {
          path: filePath,
        });
      }
    },
  };
}

function createDefinitionTool(files: FileStore): Tool {
  return {
    definition: {
      name: "lsp_definition",
      description: "Go to definition at a 1-based file position (TypeScript language service).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          line: { type: "integer" },
          character: { type: "integer" },
        },
        required: ["path", "line", "character"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = requireString(args, "path");
      const line = optionalInteger(args, "line");
      const character = optionalInteger(args, "character");
      if (line === undefined || character === undefined) {
        return structuredError("lsp_definition", "line and character are required");
      }
      try {
        const defs = getDefinition(
          files.root,
          files.toLogicalPath(files.resolve(filePath)),
          line,
          character,
        );
        if (defs.length === 0) {
          return `OK lsp_definition\nlocations: 0`;
        }
        const lines = defs.map((item) => `${item.path}:${item.line}:${item.character}`);
        return `OK lsp_definition\nlocations: ${defs.length}\n${lines.join("\n")}`;
      } catch (error) {
        return structuredError(
          "lsp_definition",
          error instanceof Error ? error.message : String(error),
          { path: filePath },
        );
      }
    },
  };
}
