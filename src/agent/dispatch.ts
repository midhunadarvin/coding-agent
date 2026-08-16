import { CLI_HELP, parseCliArgs, type CliCommand } from "./cli.ts";
import { applyDockerSandbox } from "./docker.ts";
import { startSession } from "./start-session.ts";
import {
  listWorktreeSessions,
  prepareWorktreeSession,
  removeWorktreeSession,
  type AgentSession,
} from "./worktree.ts";

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = parseCliArgs(argv);

  switch (command.kind) {
    case "help":
      process.stdout.write(CLI_HELP);
      return;
    case "list":
      await printWorktreeSessions();
      return;
    case "clean":
      await removeWorktreeSession(command.session, { force: command.force });
      process.stdout.write(`Removed session ${command.session}\n`);
      return;
    case "run":
      await runSessionCommand(command);
      return;
  }
}

async function runSessionCommand(command: Extract<CliCommand, { kind: "run" }>): Promise<void> {
  if (!command.session) {
    await startSession();
    return;
  }

  const worktree = await enterWorktree(command.session, command.docker);
  await startSession({
    sessionName: worktree.name,
    isolation: worktree.isolation,
  });
}

async function enterWorktree(
  name: string,
  docker?: string | true,
): Promise<AgentSession> {
  const worktree = await prepareWorktreeSession(name);
  process.chdir(worktree.path);
  process.stderr.write(
    `${worktree.created ? "Created" : "Resumed"} worktree ${worktree.name} (${worktree.branch})\n${worktree.path}\n`,
  );

  if (docker) {
    const prefix = applyDockerSandbox(
      worktree.name,
      docker === true ? undefined : docker,
    );
    process.stderr.write(`Docker bash prefix: ${prefix}\n`);
  }

  return worktree;
}

async function printWorktreeSessions(): Promise<void> {
  const sessions = await listWorktreeSessions();
  if (sessions.length === 0) {
    process.stdout.write("No worktree sessions.\n");
    return;
  }
  for (const session of sessions) {
    process.stdout.write(`${session.name}\t${session.branch}\t${session.path}\n`);
  }
}
