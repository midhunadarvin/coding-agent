export function parseToolArguments(rawArguments: string): Record<string, unknown> {
  return JSON.parse(rawArguments) as Record<string, unknown>;
}

export function requireString(
  args: Record<string, unknown>,
  key: string,
  options: { allowEmpty?: boolean } = {},
): string {
  const value = args[key];
  if (typeof value !== "string") {
    throw new Error(`Missing or invalid string argument: ${key}`);
  }
  if (!options.allowEmpty && value.length === 0) {
    throw new Error(`Missing or invalid string argument: ${key}`);
  }
  return value;
}
