# 00 · Questions — 156 Corrections that outlive the task are lost at the next fresh session

**Written against:** `71c1a61`

The default assumption is what makes this phase non-blocking: work can proceed
without waiting for answers, and the assumptions are on the record.

---

## Ticket

**ID:** 156
**Link:** https://github.com/Allan-Nava/qrspi/issues/156
**Title:** Corrections that outlive the task are lost at the next fresh session

Rules 2 and 6 keep a correction about the task: it goes into the phase's artifact, and Implement's go through `recovery.md` into `99-progress.md`. A correction that holds beyond the task — a convention, a preference, a trap in the environment — has nowhere to go. It is written in one task's `thoughts/`, which the next task never reads, so the next fresh session needs the same correction again.

Seen on the #141 run: `thoughts/141-pipeline-row-parsing/99-progress.md`, deviation 3 — `--allowedTools` passed unquoted splits `Bash(git commit:*)` in two and the CLI ignores it. The fix lives only in that file; nothing carries it to #148 or any later task.

**Proposal**

1. A `## Corrections` section in every artifact skeleton (`skills/qrspi/references/0N-*.md`) and in `99-progress.md`: one line per correction the owner gave in that phase, with a scope — `task` (stays in the artifact) or `project` (outlives it).
2. Promotion at landing: a `landing.md` checklist item — every `project` correction is moved into `CLAUDE.md` and `AGENTS.md` in the same PR, each line pointing back at the `thoughts/<dir>/` it came from. The owner approves it in the diff; Claude Code reads one file and Codex the other.
3. `/qrspi:next` refuses to advance on a correction without a scope.
4. Optional: `npx qrspi lessons [repo]` lists the `project` corrections across `thoughts/*/` not yet in `CLAUDE.md`/`AGENTS.md`; `qrspi-pane` can show the same.
5. A budget in `token-efficiency`: what is promoted is paid by every phase, since `CLAUDE.md` is part of the harness floor — promote only what applies to every task, one line each.

**Done when**
- [ ] Every artifact skeleton and `99-progress.md` has the Corrections section with the two scopes.
- [ ] `landing.md` has the promotion item, and a `project` correction from a run reaches `CLAUDE.md` and `AGENTS.md` in that run's PR.
- [ ] `/qrspi:next` stops on an unscoped correction, with a test.
- [ ] README, CLAUDE.md, AGENTS.md and the site describe the section and the promotion.

---

## Questions

### Q1 · Who decides a correction's scope, `task` or `project` — the agent, or the owner?

- **Risk if unresolved:** if the agent classifies on its own, its guesses get promoted into `CLAUDE.md`/`AGENTS.md` and paid by every later session; the "memory you approve" property is lost.
- **Default assumption:** the agent proposes the scope on each line; the owner confirms it when ticking the phase's *Approved* box, and can change it there.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q2 · What counts as a correction: only what the owner said, or also facts the agent discovered on its own?

- **Risk if unresolved:** too narrow and environment traps the agent hit by itself are lost again; too wide and the section becomes a log nobody reviews.
- **Default assumption:** a correction is something the owner said or explicitly confirmed. A fact the agent found alone can be listed, marked as unconfirmed, and is never promoted until the owner confirms it.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q3 · Once a correction is promoted, how do `CLAUDE.md` and `AGENTS.md` stay in step?

- **Risk if unresolved:** the same line written by hand in two files drifts; Claude Code and Codex then follow different rules.
- **Default assumption:** the same line goes into both files, as the ticket says; whether one file should import the other is a Design decision, informed by what Research finds.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q4 · Where does a correction go when it is about the owner's machine or tools, not the repository?

- **Risk if unresolved:** a machine-specific trap (a CLI flag, a local path) promoted into a shared repo file misleads every other contributor.
- **Default assumption:** only corrections that hold for anyone working in the repo are `project`. Personal or machine-level ones stay `task` and are listed in the PR description for the owner to move by hand; nothing writes to `~/.claude/` or other global files.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q5 · Must task directories already in progress (no Corrections section) pass the new `/qrspi:next` check?

- **Risk if unresolved:** a stricter gate stops runs that started under the old templates, e.g. a task half-way through Implement.
- **Default assumption:** the check applies only when the section is present; an artifact without it advances as before.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q6 · Is a correction line free text, or a fixed format a tool can read?

- **Risk if unresolved:** free text cannot be checked for a missing scope, and any later tool (the optional `lessons` command, the pane) has nothing reliable to parse.
- **Default assumption:** one line per correction in a fixed form that carries the scope, the text, and where it came from (phase, date); the exact syntax is a Design decision.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q7 · Does "with a test" in Done-when mean an automated test run by `npm test` and CI?

- **Risk if unresolved:** a check described only in prose regresses silently, as #151 shows for the pipeline rows.
- **Default assumption:** yes — an automated test that fails when an unscoped correction is let through.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q8 · In a user's repository with no `CLAUDE.md` or no `AGENTS.md`, does promotion create the missing file?

- **Risk if unresolved:** the checklist item cannot be satisfied, or creating a file the user never wanted surprises them.
- **Default assumption:** the missing file is created holding only the promoted lines; the PR shows it, so the owner sees it before merging.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q9 · Are corrections from past runs in this repo (the `--allowedTools` quoting in `thoughts/141-pipeline-row-parsing/99-progress.md`) promoted as part of this task?

- **Risk if unresolved:** the motivating example stays lost, and the feature ships without one real promoted line to show how it reads.
- **Default assumption:** the #141 `--allowedTools` correction is promoted in this task's PR as the worked example; no wider sweep of older `thoughts/`.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

### Q10 · Is the budget for promoted lines a number (lines, tokens) that something checks, or guidance only?

- **Risk if unresolved:** without a limit the promoted section grows with every run and raises the harness floor of every phase; with a limit nobody agreed, useful lines are refused.
- **Default assumption:** guidance only in `token-efficiency` (promote what applies to every task, one line each); no enforced number in this task.
- **Answer:** default accepted (Allan Nava, 2026-11-19)

---

## Out of scope

Things the ticket might suggest but that we are **not** doing in this task:

- `npx qrspi lessons [repo]` and showing corrections in `qrspi-pane` — marked optional in the ticket and absent from Done-when; a follow-up issue if wanted.
- Any memory outside the repository: Claude Code's per-user memory, `~/.claude/`, global `AGENTS.md`.
- Deduplicating or expiring promoted lines over time.
- A sweep of every past `thoughts/` directory for corrections (only the #141 example, see Q9).

---

## Status

- [x] Questions generated
- [x] Reviewed by a human (2026-11-19, Allan Nava)
- [x] Answers collected (or assumptions explicitly accepted)

> Next phase: **Research**. The ticket is **not** passed to Research — only the
> questions and their answers.
