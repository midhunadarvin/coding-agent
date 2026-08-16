import os from "node:os";
import path from "node:path";

export interface BannerInfo {
  name: string;
  version: string;
  model: string;
  workspace: string;
  permissions: string;
  tools: string[];
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ORANGE = "\x1b[38;5;208m";

const LOGO = ["  ▐▛███▜▌", " ▝▜█████▛▘", "   ▘▘ ▝▝"];

export function printBanner(
  info: BannerInfo,
  stream: NodeJS.WriteStream = process.stderr,
): void {
  if (!stream.isTTY) {
    return;
  }

  const color = !process.env.NO_COLOR;
  stream.write(`${renderBanner(info, color, stream.columns)}\n`);
}

export function renderBanner(
  info: BannerInfo,
  color = false,
  columns = 72,
): string {
  const width = Math.max(48, Math.min(72, columns || 72));
  const inner = width - 2;
  const workspace = formatWorkspace(info.workspace);
  const tools = info.tools.join(" · ");

  const rows = [
    padLine("", inner),
    rowWithLogo(0, paint(color, BOLD, info.name), inner, color),
    rowWithLogo(1, paint(color, DIM, `v${info.version}`), inner, color),
    rowWithLogo(2, "", inner, color),
    padLine("", inner),
    metaRow("model", info.model, inner, color),
    metaRow("permissions", info.permissions, inner, color),
    metaRow("workspace", workspace, inner, color),
    metaRow("tools", tools, inner, color),
    padLine("", inner),
    padLine(paint(color, DIM, "  Type a prompt to begin · Ctrl+D to exit"), inner),
    padLine("", inner),
  ];

  const edge = "─".repeat(inner);
  return [
    `╭${edge}╮`,
    ...rows.map((line) => `│${line}│`),
    `╰${edge}╯`,
  ].join("\n");
}

function rowWithLogo(
  index: number,
  text: string,
  inner: number,
  color: boolean,
): string {
  const logo = paint(color, ORANGE, LOGO[index] ?? "");
  const gap = "   ";
  return padLine(`${logo}${text ? `${gap}${text}` : ""}`, inner);
}

function metaRow(
  label: string,
  value: string,
  inner: number,
  color: boolean,
): string {
  const key = paint(color, DIM, label.padEnd(14));
  return padLine(`  ${key}${truncate(value, inner - 18)}`, inner);
}

function padLine(text: string, inner: number): string {
  const padding = Math.max(0, inner - visibleWidth(text));
  return `${text}${" ".repeat(padding)}`;
}

function visibleWidth(text: string): number {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
  let width = 0;
  for (const char of stripped) {
    width += characterWidth(char.codePointAt(0) ?? 0);
  }
  return width;
}

function characterWidth(code: number): number {
  if (code <= 0xff || (code >= 0x2500 && code <= 0x259f) || code === 0x2026) {
    return 1;
  }
  return 2;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  if (max <= 1) {
    return text.slice(0, max);
  }
  return `${text.slice(0, max - 1)}…`;
}

function formatWorkspace(workspace: string): string {
  const home = os.homedir();
  const resolved = path.resolve(workspace);
  if (resolved === home) {
    return "~";
  }
  if (resolved.startsWith(`${home}${path.sep}`)) {
    return `~${resolved.slice(home.length)}`;
  }
  return resolved;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text.length === 0) {
    return text;
  }
  return `${code}${text}${RESET}`;
}
