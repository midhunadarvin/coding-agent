import { toolIcon } from "./tool-status.ts";
import type { PermissionRequest } from "../agent/permissions/types.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const MAX_PREVIEW_LINES = 12;

export function formatPermissionPrompt(request: PermissionRequest): string {
  const color = Boolean(process.stderr.isTTY) && !process.env.NO_COLOR;
  const header = paint(color, BOLD, `Allow ${toolIcon(request.tool)} ${request.tool}`);
  const body = formatArguments(request.arguments, color);
  const choices = paint(color, DIM, "[y]es / [n]o / [a]lways this tool / [all] tools:");
  return `${header}\n\n${body}\n\n${choices} `;
}

function formatArguments(args: Record<string, unknown>, color: boolean): string {
  const keys = Object.keys(args);
  if (keys.length === 0) {
    return paint(color, DIM, "  (no parameters)");
  }

  const labelWidth = Math.min(14, Math.max(...keys.map((key) => key.length)));
  const columns = process.stderr.columns ?? 80;
  const valueWidth = Math.max(24, columns - labelWidth - 8);
  const lines: string[] = [];

  for (const key of keys) {
    const formatted = formatValue(args[key], valueWidth);
    if (formatted.length === 1 && formatted[0].length <= valueWidth) {
      lines.push(`  ${paint(color, DIM, key.padEnd(labelWidth))}  ${formatted[0]}`);
      continue;
    }

    lines.push(`  ${paint(color, DIM, key)}`);
    for (const line of formatted) {
      lines.push(`    ${paint(color, DIM, "│")} ${line}`);
    }
  }

  return lines.join("\n");
}

function formatValue(value: unknown, width: number): string[] {
  if (typeof value === "string") {
    return wrapPreview(value, width);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (value === null || value === undefined) {
    return ["—"];
  }

  try {
    return wrapPreview(JSON.stringify(value, null, 2), width);
  } catch {
    return [String(value)];
  }
}

function wrapPreview(text: string, width: number): string[] {
  const sourceLines = text.replace(/\r\n/g, "\n").split("\n");
  const wrapped: string[] = [];

  for (const line of sourceLines) {
    if (line.length <= width) {
      wrapped.push(line.length === 0 ? " " : line);
      continue;
    }

    for (let index = 0; index < line.length; index += width) {
      wrapped.push(line.slice(index, index + width));
    }
  }

  if (wrapped.length <= MAX_PREVIEW_LINES) {
    return wrapped;
  }

  const hidden = wrapped.length - MAX_PREVIEW_LINES;
  return [...wrapped.slice(0, MAX_PREVIEW_LINES), `… ${hidden} more lines`];
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled) {
    return text;
  }
  return `${code}${text}${RESET}`;
}
