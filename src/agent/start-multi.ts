import { CLI_HELP, parseCliArgs } from "./cli.ts";
import { startSingleAgent } from "./start-single.ts";
import { applyDockerSandbox } from "./docker.ts";
import {
  listWorktreeSessions,
  prepareWorktreeSession,
  removeWorktreeSession,
} from "./worktree.ts";

export async function startMultiAgent(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = parseCliArgs(argv);

  if (command.kind === "help") {
    process.stdout.write(CLI_HELP);
    return;
  }

  if (command.kind === "list") {
    const sessions = await listWorktreeSessions();
    if (sessions.length === 0) {
      process.stdout.write("No worktree sessions.\n");
      return;
    }
    for (const session of sessions) {
      process.stdout.write(`${session.name}\t${session.branch}\t${session.path}\n`);
    }
    return;
  }

  if (command.kind === "clean") {
    await removeWorktreeSession(command.session, { force: command.force });
    process.stdout.write(`Removed session ${command.session}\n`);
    return;
  }

  if (!command.session) {
    await startSingleAgent();
    return;
  }

  const prepared = await prepareWorktreeSession(command.session);
  process.chdir(prepared.path);
  process.stderr.write(
    `${prepared.created ? "Created" : "Resumed"} session ${prepared.name} (${prepared.branch})\n${prepared.path}\n`,
  );
  if (command.docker) {
    const prefix = applyDockerSandbox(
      prepared.name,
      command.docker === true ? undefined : command.docker,
    );
    process.stderr.write(`Docker bash prefix: ${prefix}\n`);
  }

  await startSingleAgent({
    sessionName: prepared.name,
    isolation: prepared.isolation,
  });
}
