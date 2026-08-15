---
name: review
description: Review a change or file for bugs, regressions, and missing tests. Use when asked to review. Skip style nits.
---

1. Read the relevant diff or files. Use git diff via bash when reviewing uncommitted work.
2. Look for correctness bugs, regressions, missing tests, and unsafe edge cases.
3. Ignore style nits unless they hide a bug.
4. Report findings with file paths and a suggested fix. Do not apply fixes unless asked.
