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

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid string argument: ${key}`);
  }
  return value;
}

export function optionalInteger(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Invalid integer argument: ${key}`);
  }
  return value;
}
