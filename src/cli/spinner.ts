const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface Spinner {
  start(label: string): void;
  stop(final?: string): void;
}

export function createSpinner(stream: NodeJS.WriteStream = process.stderr): Spinner {
  const enabled = Boolean(stream.isTTY);
  let timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0;
  let label = "";
  let active = false;

  function render(): void {
    stream.write(`\r\x1b[K${FRAMES[frame]} ${label}`);
  }

  function hideCursor(): void {
    stream.write("\x1b[?25l");
  }

  function showCursor(): void {
    stream.write("\x1b[?25h");
  }

  function clearLine(): void {
    stream.write("\r\x1b[K");
  }

  return {
    start(nextLabel: string): void {
      this.stop();
      label = nextLabel;
      active = true;
      if (!enabled) {
        return;
      }

      frame = 0;
      hideCursor();
      render();
      timer = setInterval(() => {
        frame = (frame + 1) % FRAMES.length;
        render();
      }, 80);
    },
    stop(final?: string): void {
      if (!active && !final) {
        return;
      }
      active = false;

      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      if (enabled) {
        clearLine();
        showCursor();
      }

      if (final) {
        stream.write(`${final}\n`);
      }
    },
  };
}
