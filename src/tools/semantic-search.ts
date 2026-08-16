import type { FileStore } from "../workspace/interface.ts";
import { semanticSearch } from "../workspace/retrieve.ts";
import { structuredError } from "./aci.ts";
import { optionalInteger, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createSemanticSearchTool(files: FileStore): Tool {
  return {
    definition: {
      name: "semantic_search",
      description:
        "Embedding search over the workspace. Use when you know what the code does but not the file name or exact symbol.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language description of the code to find" },
          max_results: { type: "integer", description: "Maximum chunks to return (default 8)" },
        },
        required: ["query"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = requireString(args, "query");
      const maxResults = optionalInteger(args, "max_results") ?? 8;
      try {
        const hits = await semanticSearch(files, query, maxResults);
        if (hits.length === 0) {
          return `OK semantic_search\nmatches: 0\nquery: ${query}`;
        }
        const lines = hits.map(
          (hit) =>
            `${hit.path}:${hit.startLine}  (${hit.score.toFixed(3)})\n  ${hit.preview}`,
        );
        return `OK semantic_search\nmatches: ${hits.length}\n${lines.join("\n")}`;
      } catch (error) {
        return structuredError(
          "semantic_search",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
