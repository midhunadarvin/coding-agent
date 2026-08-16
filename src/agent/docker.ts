export function applyDockerSandbox(sessionName: string, container?: string): string {
  if (process.env.SANDBOX_PREFIX?.trim()) {
    return process.env.SANDBOX_PREFIX.trim();
  }
  const name = container && container.length > 0 ? container : `coding-agent-${sessionName}`;
  const prefix = `docker exec -w /workspace ${name}`;
  process.env.SANDBOX_PREFIX = prefix;
  return prefix;
}
