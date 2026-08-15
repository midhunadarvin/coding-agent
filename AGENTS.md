# AGENTS.md

## Commands

- typecheck: `npx tsc --noEmit`
- test: `npm test`
- start: `npm start`

## Layout

- `src/llm` — provider types, env config, OpenAI-compatible client
- `src/file` — workspace-scoped file I/O
- `src/tools` — LLM tools
- `src/permissions` — tool permission gate
- `src/cli` — banner, spinner, permission layout
- `src/session.ts` — stdin/stdout loop
- `skills/` — SKILL.md playbooks

## Rules

- ESM with `.ts` import specifiers
- Tool traces and prompts go to stderr; model text goes to stdout
- Paths stay inside the working directory
