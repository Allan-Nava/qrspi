---
name: qrspi
description: Run a coding task through the QRSPI workflow — Questions, Research, Spec (Design + Structure), Plan, Implement — one self-contained artifact per phase on disk, each phase a fresh session reading only that artifact. Use when a single session would blow past 40% context, when asked to research-then-plan-then-implement, when asked to set up thoughts/ artifacts, or when a session is drifting and needs intentional compaction at a phase boundary.
---

# QRSPI

**Q**uestions → **R**esearch → **S**pec (Design + Structure) → **P**lan →
**I**mplement. Five letters, six phases: the "S" is two sessions, two artifacts.

## The one idea

Each phase burns whatever context it needs, then compresses what it learned into
**one markdown file on disk**. The next phase opens a fresh session and reads only
that file. Context stays under 40%, where models work best, and the artifacts
become a reviewable, diffable record of the decision.

```
Questions   ~15k burned    →  00-questions.md   (~1k)
Research    150-250k       →  01-research.md    (~5k)
Design      starts at 6k   →  02-design.md      (~4k)
Structure   starts at 9k   →  03-structure.md   (~3k)
Plan        starts at 12k  →  04-plan.md        (~6k)
Implement   starts at 7k   →  code + PR
```

## Six non-negotiable rules

1. **Fresh session at every phase boundary.** Never continue.
2. **The artifact is the only channel.** If it is not written there, it does not
   exist for the next phase.
3. **Artifacts are self-contained.** Repo-root paths, explicit symbols, line
   numbers — never "the file from before".
4. **The ticket does not enter Research.** Handing the agent the ticket makes it
   hunt for evidence supporting a solution it already assumed. It returns in Design.
5. **The 40% rule.** Past the threshold, stop and compact — do not push through.
6. **Do not outsource the thinking.** Every phase is a checkpoint where *you* correct.

## Phases

Budgets are guardrails on a 1M window: incoming context, then the alarm at which
you **stop and compact**.

| # | Phase | Input | Output | Effort | Budget / alarm |
|---|---|---|---|---|---|
| 0 | Questions | ticket | `00-questions.md` | `medium` | 20k / 40k |
| 1 | Research | `00` — **not the ticket** | `01-research.md` | `medium`, `low` subagents | delegate / 400k in the main loop |
| 2 | Design | `00` + `01` + ticket | `02-design.md` | `xhigh` | 50k / 100k |
| 3 | Structure | `02` | `03-structure.md` | `high` | 30k / 60k |
| 4 | Plan | `02` + `03` | `04-plan.md` | `xhigh` / `max` | 80k / 150k |
| 5 | Implement | `04` (one step) + `99` | code + PR | `high` / `xhigh` | 100k per step / 400k |

Spend effort where errors propagate: a wrong Plan multiplies across the whole
implementation, a wrong Research gets caught by the Design review.

## Running a phase

Artifacts live in `<repo>/thoughts/<task-id>-<slug>/` — `00-questions.md` through
`04-plan.md` plus `99-progress.md`. `<task-id>` is the Linear/Jira ID, so the
artifact stays traceable; the directory lives in the task worktree and gets
committed.

Load **only** `references/0N-<phase>.md` for the phase you are in: each holds that
phase's prompt and the artifact skeleton to fill. `05-implement.md` is a prompt
only — its output is code — and Implement keeps state in `99-progress.md`.

Bootstrap with `/qrspi:new <TASK-ID> <ticket>`, then `/qrspi:next` at each boundary
for the next phase prompt.

## The test that matters

> An agent with **zero context** must be able to execute `04-plan.md` without
> asking a single question.

If it cannot, the plan is incomplete — and you are about to pay a rework round that
costs as much as the entire Research phase.

## Related

For the *why* — measurement, compaction ratios, subagent firewalls, effort
allocation, prompt caching — see the `token-efficiency` skill.
