---
description: Detect which QRSPI phase a task is in and emit the exact prompt for the next one
argument-hint: [thoughts/<dir> — omitted if there is only one task]
allowed-tools: Bash(ls *), Bash(grep *), Bash(head *), Bash(wc *), Read
---

# Advance a QRSPI task

Target: `$ARGUMENTS` — a `thoughts/<dir>` path. If empty, list `thoughts/*/` and pick
the only one; if there are several, ask which.

## 1. Detect the current phase

```bash
ls -la thoughts/<dir>/
```

A file counts as **complete** when its `## Status` checkboxes are ticked and its
placeholders (`<...>`, `_(to be filled`) are gone. A file that is still the untouched
template counts as **not started**. Check with:

```bash
grep -c '\[ \]' thoughts/<dir>/0*.md
grep -l '_(to be filled' thoughts/<dir>/*.md
```

State what you found in one table: file, started/complete, blocking gap.

## 2. Emit the next phase prompt

Read **only** the reference for the next phase from
`${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/`, and print its `> PROMPT` block
filled in with this task's real paths — ready to paste into a fresh session.

| Complete so far | Next phase | Input to hand it | Effort |
|---|---|---|---|
| nothing | Questions | the ticket | `medium` |
| `00` | Research | `00` — **never the ticket** | `medium`, `low` subagents |
| `00`,`01` | Design | `00` + `01` + the ticket | `xhigh` |
| …`02` | Structure | `02` only | `high` |
| …`03` | Plan | `02` + `03` | `xhigh` / `max` |
| …`04` | Implement | `04` § next step + `99` | `high` / `xhigh` |

For Implement, read `99-progress.md` to find the next unblocked step in the
`03-structure.md` dependency order, and name that specific step in the prompt.

## 3. Gate before emitting

Refuse to advance, and say which artifact needs work, if:

- the previous artifact still has unresolved placeholders or unticked Status boxes;
- **Design → Structure** and `02-design.md` has a non-empty "More research needed"
  list, or open review comments;
- **Structure → Plan** and any step lacks a verification command — that is an
  intention, not a step;
- **Plan → Implement** and `04-plan.md` fails the zero-context test: missing exact
  paths, missing function signatures, or test cases without expected outputs;
- `99-progress.md` has an open deviation pointing at an upstream artifact — that
  artifact gets fixed first, not worked around.

## 4. Always close with

> Run this in a **fresh session**. Do not continue here — carrying this session's
> context into the next phase is the failure mode the whole workflow exists to avoid.

Do not execute the next phase yourself.
