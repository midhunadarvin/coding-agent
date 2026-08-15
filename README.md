# coding-agent

A terminal coding agent. It reads a prompt from stdin, calls an OpenAI-compatible LLM, and lets the model inspect and change files in the working directory through tools.

## Architecture

The process is a single loop: **user → model → tools → model → reply**.

```text
┌─────────────────────────────────────────────────────────────┐
│                         src/index.ts                        │
│  banner · config · FileStore · tools · permissions · I/O    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         session.ts                          │
│  history  →  llm.chat(messages, tools)                      │
│       ▲              │                                      │
│       │         tool calls?                                 │
│       │         yes → permission gate → execute → result    │
│       │         no  → print assistant text to stdout        │
└───────┴──────────────┴──────────────────────────────────────┘
```

Layers do not reach across each other:

| Layer          | Responsibility                                                  |
| -------------- | --------------------------------------------------------------- |
| `llm/`         | Provider types, env config, OpenAI-compatible chat + tool calls |
| `file/`        | Workspace-scoped `read` / `write`. Paths cannot escape `cwd`    |
| `tools/`       | LLM-facing tools built on `FileStore`                           |
| `permissions/` | Allow / deny / prompt before a tool runs                        |
| `cli/`         | Banner, spinner, tool icons, permission layout                  |
| `session.ts`   | Stdin/stdout REPL and the tool-call loop                        |

### Request path

1. `index.ts` prints the startup banner, loads LLM config, builds a workspace `FileStore`, wraps it as tools, and opens stdin/stdout.
2. `runSession` keeps a chat history (system + turns) and sends it to `LlmProvider.chat` with the tool schemas.
3. If the model returns tool calls, the session shows a status line, asks the permission gate, runs the tool, and appends the result as a `tool` message.
4. That cycle repeats (up to 20 rounds) until the model replies with text. Text goes to **stdout**. Status, spinner, and permission prompts go to **stderr**.

### Tools

| Tool         | What it does                                                 |
| ------------ | ------------------------------------------------------------ |
| `read_file`  | Read a UTF-8 file                                            |
| `write_file` | Create or overwrite a file                                   |
| `edit`       | Replace exactly one occurrence of `old_text` with `new_text` |

Tools depend on `FileStore`, not `fs` directly. The LLM layer only sees names, descriptions, and JSON arguments.

### Permissions

`TOOL_PERMISSIONS` selects the gate:

- `prompt` — ask on a TTY (`y` / `n` / `a` this tool / `all`)
- `allow` — auto-approve
- `deny` — auto-deny

Piped stdin defaults to `deny` so a tool cannot write files unnoticed.

## Layout

```text
src/
  index.ts           wire-up and process entry
  session.ts         REPL + tool loop
  llm/               types, env config, OpenAI-compatible client
  file/              FileStore interface + workspace implementation
  tools/             read_file, write_file, edit
  permissions/       gate and mode
  cli/               banner, spinner, tool status, permission view
```

## Setup

```bash
cp .env.example .env
# set LLM_API_KEY and optional LLM_BASE_URL / LLM_MODEL
npm start
```

Or run the source directly (Node 22+ type stripping):

```bash
node --env-file=.env src/index.ts
```

`npm run build` emits ESM to `dist/`.

### Environment

| Variable           | Purpose                       | Default                         |
| ------------------ | ----------------------------- | ------------------------------- |
| `LLM_BASE_URL`     | OpenAI-compatible base URL    | `https://opencode.ai/zen/go/v1` |
| `LLM_API_KEY`      | API key                       | required                        |
| `LLM_MODEL`        | Model id                      |
| `TOOL_PERMISSIONS` | `prompt` \| `allow` \| `deny` | `prompt` on a TTY, else `deny`  |
| `NO_COLOR`         | Disable ANSI color            | unset                           |

Point `LLM_BASE_URL` at any compatible host, including OpenCode Go (`https://opencode.ai/zen/go/v1`).

## Planned work

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for a checklist of harness, tool, and prompt upgrades.
