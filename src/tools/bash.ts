import { spawn } from "node:child_process";
import type { FileStore } from "../file/interface.ts";
import { structuredError } from "./aci.ts";
import { optionalInteger, requireString } from "./args.ts";
import type { Tool } from "./types.ts";

const DEFAULT_TIMEOUT_MS = 60_000;

const DENIED = [
  /reset\s+--hard/,
  /push\s+[^\n]*--force/,
  /rm\s+-rf\s+[\/~]/,
  /\bsudo\b/,
  /curl\s+[^\n]*\|\s*(ba)?sh/,
];

const ALLOWED = [
  /^npx\s+tsc(\s|$)/,
  /^npm\s+(test|start|run)(\s|$)/,
  /^npm\s+run\s+\S+/,
  /^node\s+--test(\s|$)/,
  /^node\s+--experimental-strip-types\s+--test(\s|$)/,
  /^git\s+(status|diff|log|show|add|commit|branch|rev-parse)(\s|$)/,
];

export function createBashTool(files: FileStore): Tool {
  return {
    definition: {
      name: "bash",
      description:
        "Run an allowlisted shell command in the workspace (typecheck, tests, npm scripts, safe git). Destructive git is blocked.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to run" },
          timeout_ms: { type: "integer", description: "Timeout in milliseconds (default 60000)" },
        },
        required: ["command"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const command = requireString(args, "command");
      const timeoutMs = optionalInteger(args, "timeout_ms") ?? DEFAULT_TIMEOUT_MS;
      const reason = denyReason(command);
      if (reason) {
        return structuredError("bash", reason, { command });
      }

      try {
        const result = await runCommand(command, files.root, timeoutMs);
        const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
        return `OK bash\nexit: ${result.exitCode}\n${output || "(no output)"}`;
      } catch (error) {
        return structuredError("bash", error instanceof Error ? error.message : String(error), {
          command,
        });
      }
    },
  };
}

export function denyReason(command: string): string | undefined {
  const trimmed = command.trim();
  if (DENIED.some((pattern) => pattern.test(trimmed))) {
    return "Command is blocked as destructive or unsafe";
  }
  if (!ALLOWED.some((pattern) => pattern.test(trimmed))) {
    return "Command is not on the allowlist (npx tsc, npm test/start/run, node --test, git status/diff/log/show/add/commit/branch)";
  }
  return undefined;
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}
