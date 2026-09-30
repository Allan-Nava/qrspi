---
description: Detect which QRSPI phase a task is in and emit the exact prompt for the next one
argument-hint: [thoughts/<dir> — omitted if there is only one task]
allowed-tools: Bash(ls *), Bash(grep *), Bash(head *), Bash(wc *), Bash(awk *), Bash(git log *), Read
---

# Advance a QRSPI task

Target: `$ARGUMENTS` — a `thoughts/<dir>` path. If empty, list `thoughts/*/` and pick
the only one; if there are several, ask which.

## 1. Detect the current phase

```bash
ls -la thoughts/<dir>/
```

A file counts as **complete** when the checkboxes under its `## Status` heading are ticked —
not the others: a Plan's per-step acceptance criteria stay open until Implement — and its
placeholders (`<...>`, `_(to be filled`) are gone. A file that is still the untouched
template counts as **not started**. Check with:

```bash
awk 'FNR==1{s=0; n[FILENAME]+=0} /^## Status/{s=1} s && /\[ \]/{n[FILENAME]++} END{for (f in n) print n[f], f}' thoughts/<dir>/0*.md
grep -l '_(to be filled' thoughts/<dir>/*.md
```

State what you found in one table: file, started/complete, blocking gap.

## 2. Emit the next phase prompt

Extract **only** the `> **PROMPT` block of the next phase's reference — not the
whole file, the template skeleton below it is not needed here — and print it filled
in with this task's real paths, ready to paste into a fresh session:

```bash
awk 'f && !/^>/ {exit} /^> \*\*PROMPT/ {f=1} f' \
  "${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/<NN>-<phase>.md"
```

| Complete so far | Next phase | Input to hand it | Effort |
|---|---|---|---|
| nothing | Questions | the ticket | `medium` |
| `00` | Research | `00` — **never the ticket** | `medium`, `low` subagents |
| `00`,`01` | Design | `00` + `01` + the ticket | `xhigh` |
| …`02` | Structure | `02` only | `high` |
| …`03` | Plan | `02` + `03` | `xhigh` / `max` |
| …`04` | Implement | `04` § next step + `99` | `high` / `xhigh` |

For Plan, count the steps in `03-structure.md`. More than eight: emit one Plan prompt
per group instead — steps in dependency order, about five to a group — each naming its
steps, the part file it writes (`04-plan.part-<first>-<last>.md`) and the earlier parts
whose `## Interfaces the later steps rely on` sections it reads. The last group's
prompt also assembles the parts into `04-plan.md` (the rule is in `04-plan.md`).

For Implement, read `99-progress.md` to find the next unblocked step in the
`03-structure.md` dependency order, and name that specific step in the prompt.

## 3. Gate before emitting

These gates are mechanical: they catch an artifact that is *unfinished*. For one that
is finished and wrong — plausible, self-contained, resting on a false fact or a hidden
decision — the judgement-level rubric is `/qrspi:review <file>`, backed by
`${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/reviewing.md`. Suggest it at the
Design and Plan boundaries; do not run it here.

Before the gates, check the previous artifact's **Written against:** commit. Run
`git log --oneline <commit>..HEAD -- <the paths it cites>`, taking the paths from its
tables; when that prints anything, list the commits and suggest `/qrspi:review` on the
artifact — the code moved under it after it was written. This is a warning, not a
refusal: the human decides whether the artifact still holds.

Refuse to advance, and say which artifact needs work, if:

- the previous artifact still has unresolved placeholders or unticked Status boxes;
- **Design → Structure** and `02-design.md` has a non-empty "More research needed"
  list, or open review comments;
- **Structure → Plan** and any step lacks a verification command — that is an
  intention, not a step;
- **Plan → Implement** and `04-plan.md` fails the zero-context test: missing exact
  paths, missing function signatures, or test cases without expected outputs — or it
  does not exist yet while `04-plan.part-*.md` files do: assemble them first;
- `99-progress.md` has an open deviation pointing at an upstream artifact — that
  artifact gets fixed first, not worked around. Emit the prompt for the phase its
  **Re-enter** field names, scoped to the deviation, per
  `${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/recovery.md`.

## 4. Always close with

> Run this in a **fresh session**. Do not continue here — carrying this session's
> context into the next phase is the failure mode the whole workflow exists to avoid.

Do not execute the next phase yourself.
