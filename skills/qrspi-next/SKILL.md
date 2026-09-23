---
name: qrspi-next
description: Codex CLI: detect which QRSPI phase a task is in and emit the exact prompt for the next one. Invoke explicitly as $qrspi-next; in Claude Code use /qrspi:next instead.
argument-hint: [thoughts/<dir> — omitted if there is only one task]
disable-model-invocation: true
user-invocable: false
---

# Advance a QRSPI task

> **Codex CLI form of `/qrspi:next`.** Same steps, same gates. Paths below are
> relative to the directory holding this `SKILL.md` (Codex tells you where the skill
> lives); in shell snippets `$SKILL_DIR` stands for that directory — substitute the
> absolute path. The phase references are the sibling skill's, `../qrspi/references/`.
> Codex skills carry no tool allowlist: Codex's own approval mode and sandbox govern
> what runs.

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

Extract **only** the `> **PROMPT` block of the next phase's reference — not the
whole file, the template skeleton below it is not needed here — and print it filled
in with this task's real paths, ready to paste into a fresh session:

```bash
awk 'f && !/^>/ {exit} /^> \*\*PROMPT/ {f=1} f' \
  "$SKILL_DIR/../qrspi/references/<NN>-<phase>.md"
```

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

These gates are mechanical: they catch an artifact that is *unfinished*. For one that
is finished and wrong — plausible, self-contained, resting on a false fact or a hidden
decision — the judgement-level rubric is `$qrspi-review <file>`, backed by
`../qrspi/references/reviewing.md`. Suggest it at the
Design and Plan boundaries; do not run it here.

Refuse to advance, and say which artifact needs work, if:

- the previous artifact still has unresolved placeholders or unticked Status boxes;
- **Design → Structure** and `02-design.md` has a non-empty "More research needed"
  list, or open review comments;
- **Structure → Plan** and any step lacks a verification command — that is an
  intention, not a step;
- **Plan → Implement** and `04-plan.md` fails the zero-context test: missing exact
  paths, missing function signatures, or test cases without expected outputs;
- `99-progress.md` has an open deviation pointing at an upstream artifact — that
  artifact gets fixed first, not worked around. Emit the prompt for the phase its
  **Re-enter** field names, scoped to the deviation, per
  `../qrspi/references/recovery.md`.

## 4. Always close with

> Run this in a **fresh session**. Do not continue here — carrying this session's
> context into the next phase is the failure mode the whole workflow exists to avoid.

Do not execute the next phase yourself.
