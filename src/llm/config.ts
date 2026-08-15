import type { LlmConfig } from "./types.ts";

const DEFAULT_BASE_URL = "https://opencode.ai/zen/go/v1";
const DEFAULT_MODEL = "kimi-k2.7-code";

export function loadLlmConfig(overrides: Partial<LlmConfig> = {}): LlmConfig {
  const baseUrl = stripTrailingSlash(
    overrides.baseUrl ?? process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const apiKey = overrides.apiKey ?? process.env.LLM_API_KEY ?? "";
  const model = overrides.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("Missing LLM API key. Set LLM_API_KEY.");
  }

  return { baseUrl, apiKey, model };
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
