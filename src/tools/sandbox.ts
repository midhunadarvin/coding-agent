export function wrapSandboxedCommand(command: string, prefix?: string): string {
  const sandbox = prefix ?? process.env.SANDBOX_PREFIX?.trim();
  if (!sandbox) {
    return command;
  }
  return `${sandbox} sh -c ${shellEscape(command)}`;
}

export function shellEscape(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
