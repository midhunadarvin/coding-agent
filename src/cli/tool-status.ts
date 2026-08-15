const TOOL_ICONS: Record<string, string> = {
  read_file: "📖",
  write_file: "📝",
  edit: "✏️",
  grep: "🔎",
  glob: "📁",
  ls: "📂",
  bash: "💻",
  todo_write: "☑️",
  submit_plan: "🗺️",
  read_skill: "📘",
  explore: "🧭",
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
    if (typeof args.pattern === "string" && args.pattern.length > 0) {
      return args.pattern;
    }
    if (typeof args.command === "string" && args.command.length > 0) {
      return args.command;
    }
    if (typeof args.name === "string" && args.name.length > 0) {
      return args.name;
    }
    if (typeof args.question === "string" && args.question.length > 0) {
      return args.question;
    }
  } catch {
    // Fall through to a short raw preview.
  }

  const compact = rawArguments.replace(/\s+/g, " ").trim();
  return compact.length > 60 ? `${compact.slice(0, 60)}…` : compact;
}
