import { createInterface, type Interface } from "node:readline/promises";

export interface InputOutput {
  read(): Promise<string | null>;
  ask(question: string): Promise<string | null>;
  write(output: string): void;
  writeDelta(output: string): void;
  close(): void;
}

export function createStdio(): InputOutput {
  const interactive = Boolean(process.stdin.isTTY);
  const rl: Interface = createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: interactive,
  });
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });

  async function ask(question: string): Promise<string | null> {
    if (closed) {
      return null;
    }

    try {
      return await rl.question(question);
    } catch {
      return null;
    }
  }

  return {
    async read(): Promise<string | null> {
      if (!interactive) {
        return ask("");
      }

      const first = await ask("> ");
      if (first === null) {
        return null;
      }
      if (first.trim() === '"""') {
        const lines: string[] = [];
        for (;;) {
          const line = await ask("| ");
          if (line === null || line.trim() === '"""') {
            break;
          }
          lines.push(line);
        }
        return lines.join("\n");
      }
      if (first.endsWith("\\")) {
        const lines = [first.slice(0, -1)];
        for (;;) {
          const line = await ask("| ");
          if (line === null) {
            break;
          }
          if (!line.endsWith("\\")) {
            lines.push(line);
            break;
          }
          lines.push(line.slice(0, -1));
        }
        return lines.join("\n");
      }
      return first;
    },
    ask,
    write(output: string): void {
      process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    },
    writeDelta(output: string): void {
      process.stdout.write(output);
    },
    close(): void {
      rl.close();
    },
  };
}
