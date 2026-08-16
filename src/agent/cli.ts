export type CliCommand =
  | { kind: "run"; session?: string; docker?: string | true }
  | { kind: "list" }
  | { kind: "clean"; session: string; force: boolean }
  | { kind: "help" };

export function parseCliArgs(argv: string[]): CliCommand {
  let session: string | undefined;
  let docker: string | true | undefined;
  let list = false;
  let clean: string | undefined;
  let force = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--list") {
      list = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--session" || arg === "--worktree" || arg === "-s") {
      session = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--session=")) {
      session = arg.slice("--session=".length);
      continue;
    }
    if (arg === "--clean") {
      clean = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--docker") {
      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        docker = next;
        index += 1;
      } else {
        docker = true;
      }
      continue;
    }
    if (arg.startsWith("--docker=")) {
      docker = arg.slice("--docker=".length);
    }
  }

  if (help) {
    return { kind: "help" };
  }
  if (list) {
    return { kind: "list" };
  }
  if (clean) {
    return { kind: "clean", session: clean, force };
  }
  return { kind: "run", session, docker };
}

export const CLI_HELP = `coding-agent

Usage:
  npm start                         single session in the current directory
  npm start -- --session <name>     isolated git worktree (.coding-agent/worktrees/<name>)
  npm start -- --list               list worktree sessions
  npm start -- --clean <name>       remove a clean worktree session
  npm start -- --session <name> --docker [container]
                                    worktree plus SANDBOX_PREFIX for remote bash
`;
