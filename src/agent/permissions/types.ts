export type PermissionDecision = "allow" | "deny";

export type PermissionMode = "prompt" | "allow" | "deny";

export interface PermissionRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface PermissionGate {
  authorize(request: PermissionRequest): Promise<PermissionDecision>;
}
