export const TOOL_OUTPUT_LIMIT = 20_000;

export function truncateOutput(
  text: string,
  limit: number = TOOL_OUTPUT_LIMIT,
): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n...[truncated ${text.length - limit} characters]`;
}
