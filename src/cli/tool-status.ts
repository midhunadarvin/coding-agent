const TOOL_ICONS: Record<string, string> = {
  read_file: "📖",
  write_file: "📝",
  edit: "✏️",
};

export function toolIcon(name: string): string {
  return TOOL_ICONS[name] ?? "🔧";
}

export function formatToolLabel(name: string, rawArguments?: string): string {
  const summary = rawArguments ? summarizeArguments(rawArguments) : "";
  return summary ? `${toolIcon(name)} ${name}  ${summary}` : `${toolIcon(name)} ${name}`;
}

function summarizeArguments(rawArguments: string): string {
  try {
    const args = JSON.parse(rawArguments) as Record<string, unknown>;
    if (typeof args.path === "string" && args.path.length > 0) {
      return args.path;
    }
  } catch {
    // Fall through to a short raw preview.
  }

  const compact = rawArguments.replace(/\s+/g, " ").trim();
  return compact.length > 60 ? `${compact.slice(0, 60)}…` : compact;
}
