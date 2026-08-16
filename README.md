# coding-agent

A terminal coding agent. It reads a prompt from stdin, calls an OpenAI-compatible LLM, and lets the model inspect and change files in the working directory through tools.

## Architecture

The process is a single loop: **user → model → tools → model → reply**.

```text
src/index.ts  →  multi-agent CLI
                    │
                    ├─ --session name  →  git worktree + isolation
                    │                       │
                    └─ default / after chdir ─→  single-agent
                                                 banner · tools · REPL
                                                 user → model → tools → reply
```

Layers do not reach across each other:

| Layer        | Responsibility                                                                 |
| ------------ | ------------------------------------------------------------------------------ |
| `agent/`     | Process: REPL, worktrees, permissions, prompt, skills, logs                    |
| `llm/`       | OpenAI-compatible chat + tool calls                                            |
| `workspace/` | File I/O, extra repos, path isolation, semantic retrieve                       |
| `tools/`     | LLM tools (files, search, bash, web, LSP)                                      |
| `ui/`        | Banner, spinner, permission layout                                             |

### Request path

1. `index.ts` parses CLI flags. `--session` creates or resumes a git worktree, then the single-agent loop starts.
2. `runSession` keeps a chat history (system + turns) and sends it to `LlmProvider.chatStream` with the tool schemas.
3. If the model returns tool calls, the session shows a status line, asks the permission gate, runs the tool, and appends the result as a `tool` message.
4. That cycle repeats (up to 20 rounds) until the model replies with text. Text goes to **stdout**. Status, spinner, and permission prompts go to **stderr**.

### Tools

| Tool         | What it does                                                 |
| ------------ | ------------------------------------------------------------ |
| `read_file`   | Read a UTF-8 file with line numbers                          |
| `write_file`  | Create or overwrite a file                                   |
| `edit`        | Replace exactly one occurrence of `old_text` with `new_text` |
| `grep`        | Search file contents                                         |
| `glob` / `ls` | Find and list files                                          |
| `bash`        | Allowlisted shell (typecheck, tests, safe git)               |
| `todo_write`  | Session checklist                                            |
| `submit_plan` | Required before mutating files or running the shell          |
| `read_skill`  | Load a `SKILL.md` playbook                                   |
| `explore`          | Read-only subagent for codebase questions                    |
| `web_search`       | Search the public web                                        |
| `web_fetch`        | Fetch an http(s) URL as text                                 |
| `semantic_search`  | Embedding search over the workspace                          |
| `lsp_diagnostics`  | TypeScript diagnostics                                       |
| `lsp_hover`        | Type information at a position                               |
| `lsp_definition`   | Go to definition                                             |
| `list_repos`       | List primary and extra workspaces                            |

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
  index.ts      CLI entry
  agent/        sessions, worktrees, permissions, prompt, skills
  llm/          model client
  workspace/    files, isolation, semantic search
  tools/        tool implementations
  ui/           banner and terminal chrome
skills/         SKILL.md playbooks
```

## Setup

```bash
cp .env.example .env
# set LLM_API_KEY and optional LLM_BASE_URL / LLM_MODEL
npm start
```

### Parallel sessions

Each `--session` is a git worktree under `.coding-agent/worktrees/<name>` on branch `agent/<name>`. File tools and `bash` cannot write back into the main checkout. New trees copy paths listed in `.worktreeinclude` (defaults to `.env`).

```bash
# terminal 1
npm start -- --session auth

# terminal 2
npm start -- --session billing

npm start -- --list
npm start -- --clean auth
npm start -- --session auth --docker agent-auth
```

`--docker [container]` sets `SANDBOX_PREFIX` so allowlisted bash runs in that container (`docker exec -w /workspace <name>`). Bind-mount the worktree at `/workspace`.

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
| `SESSION_LOG`      | `1` writes a JSONL transcript | unset                           |
| `AGENT_REPOS`      | Extra repos `name=path,...`   | unset                           |
| `SANDBOX_PREFIX`   | Remote bash prefix            | unset                           |

Point `LLM_BASE_URL` at any compatible host, including OpenCode Go (`https://opencode.ai/zen/go/v1`).

## Planned work

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for a checklist of harness, tool, and prompt upgrades.
