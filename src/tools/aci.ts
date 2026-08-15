export function formatReadOutput(
  filePath: string,
  content: string,
  offset = 1,
  limit = 400,
): string {
  const lines = content.split("\n");
  const start = Math.max(1, offset);
  const slice = lines.slice(start - 1, start - 1 + limit);
  const numbered = slice.map((line, index) => {
    const lineNumber = String(start + index).padStart(6, " ");
    return `${lineNumber}|${line}`;
  });

  const hidden = lines.length - (start - 1 + slice.length);
  if (hidden > 0) {
    numbered.push(`... ${hidden} more lines (use offset/limit to continue)`);
  }

  return `FILE ${filePath}\n${numbered.join("\n")}`;
}

export function structuredError(tool: string, reason: string, details?: Record<string, string>): string {
  const extra = details
    ? Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : "";
  return extra ? `ERROR ${tool}\n${reason}\n${extra}` : `ERROR ${tool}\n${reason}`;
}
