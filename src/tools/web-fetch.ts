import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";
import { assertHttpUrl, htmlToText } from "./html.ts";

const FETCH_LIMIT = 15_000;

export function createWebFetchTool(): Tool {
  return {
    definition: {
      name: "web_fetch",
      description: "Fetch an http(s) URL and return extracted text. Use for docs and references.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "http or https URL" },
        },
        required: ["url"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const raw = requireString(args, "url");
      try {
        const url = assertHttpUrl(raw);
        const response = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(15_000),
          headers: { "user-agent": "coding-agent/1.0" },
        });
        const body = await response.text();
        const type = response.headers.get("content-type") ?? "";
        const text = type.includes("html") || body.trimStart().startsWith("<")
          ? htmlToText(body)
          : body;
        const clipped =
          text.length > FETCH_LIMIT
            ? `${text.slice(0, FETCH_LIMIT)}\n...[truncated ${text.length - FETCH_LIMIT} characters]`
            : text;
        return `OK web_fetch\nstatus: ${response.status}\nurl: ${response.url}\n${clipped}`;
      } catch (error) {
        return structuredError("web_fetch", error instanceof Error ? error.message : String(error), {
          url: raw,
        });
      }
    },
  };
}
