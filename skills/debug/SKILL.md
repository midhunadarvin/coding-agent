---
name: debug
description: Debug a failing test, stacktrace, or unexpected behavior. Use when something is broken.
---

1. Reproduce the failure with bash (test or the command that failed).
2. Read the error and grep for the symbols it names.
3. Isolate the smallest cause before changing code.
4. Apply the smallest edit that fixes it.
5. Re-run the same command. Repeat until it passes or you are blocked.
