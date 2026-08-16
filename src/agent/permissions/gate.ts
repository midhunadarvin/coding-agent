import { formatPermissionPrompt } from "../../ui/permission-view.ts";
import type {
  PermissionDecision,
  PermissionGate,
  PermissionMode,
  PermissionRequest,
} from "./types.ts";

export interface PermissionGateOptions {
  mode: PermissionMode;
  ask: (question: string) => Promise<string | null>;
}

export function createPermissionGate(options: PermissionGateOptions): PermissionGate {
  const allowedTools = new Set<string>();
  let allowAll = false;

  return {
    async authorize(request: PermissionRequest): Promise<PermissionDecision> {
      if (options.mode === "allow" || allowAll || allowedTools.has(request.tool)) {
        return "allow";
      }
      if (options.mode === "deny") {
        return "deny";
      }

      for (;;) {
        const answer = await options.ask(formatPermissionPrompt(request));
        if (answer === null) {
          return "deny";
        }

        const choice = answer.trim().toLowerCase();
        if (choice === "y" || choice === "yes") {
          return "allow";
        }
        if (choice === "n" || choice === "no") {
          return "deny";
        }
        if (choice === "a" || choice === "always") {
          allowedTools.add(request.tool);
          return "allow";
        }
        if (choice === "all") {
          allowAll = true;
          return "allow";
        }
      }
    },
  };
}
