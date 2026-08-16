# AGENTS.md

## Commands

- typecheck: `npx tsc --noEmit`
- test: `npm test`
- start: `npm start`
- build CLI: `npm run build` then `npm link` (exposes `coding-agent`)
- package tarball: `npm pack`

## Layout

- `src/cli.ts` — packaged binary entry (`bin`: `coding-agent`)
- `src/agent` — sessions, worktrees, permissions, prompt, skills
- `src/llm` — model client
- `src/workspace` — files, isolation, semantic search
- `src/tools` — tool implementations
- `src/ui` — banner and terminal chrome
- `skills/` — SKILL.md playbooks

## Rules

- ESM with `.ts` import specifiers
- Tool traces and prompts go to stderr; model text goes to stdout
- Paths stay inside attached workspaces. Extra repos use `name:relative/path`.
- `AGENT_REPOS` attaches more trees; `SANDBOX_PREFIX` runs bash in docker/ssh.
