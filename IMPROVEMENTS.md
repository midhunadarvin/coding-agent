# Improvements

Possible upgrades drawn from SWE-agent, OpenHands, Claude Code, and SWE-bench harness research. The gap today is not the model — it is search, verification, and a tighter agent loop.

Check an item when it lands in the repo.

## Now

The highest-leverage slice for this codebase.

- [x] **System prompt** — Short imperative rules: search before edit, prefer `edit` over `write_file`, match existing style, do not invent paths, do not add unsolicited docs or refactors, stay in the workspace.
- [x] **Load `AGENTS.md`** — If present in `cwd`, inject build/test commands, layout, and project rules into the system prompt.
- [x] **`grep` tool** — Content search with a capped, structured result. Stops the model from guessing file paths.
- [x] **`glob` / `ls` tools** — Find files by name (`**/*.ts`) without walking the tree by hand.

## Next

Turns “wrote code” into “it works.”

- [x] **Permissioned `bash`** — Run typecheck, tests, and git. Allowlist common commands (`npx tsc`, `npm test`, `git status`) and keep the existing permission gate.
- [x] **`verify` skill** — After edits: run the project checks from `AGENTS.md`, read failures, fix, re-run. Do not treat a write as done.
- [x] **`todo_write` tool** — A visible checklist so multi-step work does not drift.
- [x] **Truncate tool output** — Cap results (for example 20k characters) so one `read_file` cannot blow the context window.
- [x] **Tool ACI** — Structured errors, no unbounded dumps, line numbers on reads. Tools should be shaped for a model, not a human shell.

## Skills and memory

Progressive disclosure: a one-line description is always visible; the full playbook loads only when the task matches.

- [x] **Skill loader** — Discover `SKILL.md` files (project `skills/` and maybe `~/.coding-agent/skills/`).
- [x] **`explore` skill** — grep/glob first, then targeted reads, then answer. Read-only.
- [x] **`debug` skill** — Reproduce → isolate → smallest fix → re-run.
- [x] **`review` skill** — Bugs, regressions, missing tests — not style nits.
- [x] **`git-commit` skill** — Status, diff, message that says why. Ask before `reset --hard` or `push --force`.
- [x] **`plan` skill** — Write todos, implement one item, check it off.

## Loop and context

- [x] **Plan vs act** — Search and read freely; mutate only after a short plan (permissions already cover the mutate side).
- [x] **History compaction** — When the session grows, keep the system prompt, todos, and recent turns; drop stale tool payloads.
- [x] **Retry bad tool calls** — Empty, malformed, or unknown-tool responses should be fed back, not crash the turn.
- [x] **Read-only explore subagent** — Isolated context for “how does X work?” so the main thread stays small.

## Product polish

- [x] **Streaming** — Token stream for the final answer instead of waiting for the full completion.
- [x] **Multi-line input** — A delimiter or paste mode so a prompt can be more than one line.
- [x] **Session log** — Optional transcript on disk for debugging the harness.
- [x] **Version from `package.json`** — Banner should not hardcode `1.0.0`.
- [x] **Tests** — Unit tests for `edit` uniqueness, path sandboxing, permission modes, and output truncation.

## Out of scope for now

Keep these off the critical path unless a real task needs them.

- [x] Web search / fetch
- [x] Embedding-based code retrieval
- [x] IDE / LSP integration
- [x] Multi-repo or remote sandbox
