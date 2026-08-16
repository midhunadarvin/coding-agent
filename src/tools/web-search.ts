import { structuredError } from "./aci.ts";
import { optionalInteger, requireString } from "./args.ts";
import type { Tool } from "./types.ts";
import { htmlToText } from "../web/html.ts";

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export function createWebSearchTool(): Tool {
  return {
    definition: {
      name: "web_search",
      description: "Search the public web and return titles, URLs, and snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          max_results: { type: "integer", description: "Maximum results (default 5)" },
        },
        required: ["query"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = requireString(args, "query");
      const maxResults = optionalInteger(args, "max_results") ?? 5;
      try {
        const hits = await searchWeb(query, maxResults);
        if (hits.length === 0) {
          return `OK web_search\nresults: 0\nquery: ${query}`;
        }
        const lines = hits.map(
          (hit, index) => `${index + 1}. ${hit.title}\n   ${hit.url}\n   ${hit.snippet}`,
        );
        return `OK web_search\nresults: ${hits.length}\n${lines.join("\n")}`;
      } catch (error) {
        return structuredError("web_search", error instanceof Error ? error.message : String(error), {
          query,
        });
      }
    },
  };
}

export async function searchWeb(query: string, maxResults: number): Promise<SearchHit[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "coding-agent/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  return parseDuckDuckGoLite(await response.text(), maxResults);
}

export function parseDuckDuckGoLite(html: string, maxResults: number): SearchHit[] {
  const hits: SearchHit[] = [];
  const link = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = link.exec(html)) !== null && hits.length < maxResults) {
    const href = decodeHtml(match[1] ?? "");
    const title = htmlToText(match[2] ?? "").trim();
    if (!href.startsWith("http") || title.length === 0) {
      continue;
    }
    const after = html.slice(match.index, match.index + 800);
    const snippetMatch = /class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i.exec(after);
    hits.push({
      title,
      url: href,
      snippet: htmlToText(snippetMatch?.[1] ?? "").slice(0, 240),
    });
  }
  return hits;
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"');
}
