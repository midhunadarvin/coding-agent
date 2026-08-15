---
name: git-commit
description: Create a git commit for the current changes. Use when the user wants a commit.
---

1. Run `git status` and `git diff`.
2. Draft a message that says why the change exists, not what files moved.
3. Call submit_plan, then `git add` the intended paths and `git commit`.
4. Never run `git reset --hard` or `git push --force` unless the user explicitly asked.
5. Do not commit secrets, `.env`, or generated `dist/` output.
