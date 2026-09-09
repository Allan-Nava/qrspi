# Landing — from artifacts to a reviewable pull request

The pipeline ends at "code + PR", and the PR is where a reviewer actually looks. So
landing is the last compaction step: five artifacts and N commits, compressed into the
one page a reviewer reads first. The test is the same as for every other artifact —

> A reviewer who reads **only the PR description** knows which decisions were made
> and where to find the reasoning.

## What the description carries, and from where

| Section of the PR | Source | How much |
|---|---|---|
| Problem — two to four lines | `02-design.md` § Problem | verbatim, it was written for this |
| Decisions — one line each: choice, why, what was rejected | `02-design.md` § Decisions | the *what* and the *why*; the alternatives stay behind, linked |
| What is not done, on purpose | `02-design.md` § What we are NOT doing | verbatim |
| How to verify | `04-plan.md` § Verify, collected | the commands, copy-pasteable |
| Deviations from the plan, if any | `99-progress.md` § Deviations | one line each, resolved or not |
| Where the reasoning lives | `thoughts/<dir>/` | one link, and which file answers which question |

Everything else — the research map, the alternatives in full, the step-by-step plan,
the context-budget table — **stays in `thoughts/`**. The PR says where it is; it does
not repeat it. A description that pastes the design is unreviewable for the same
reason a 2,000-line PR is.

## Pointing at the artifacts without assigning homework

One line per question a reviewer is likely to have:

```
Reasoning: thoughts/ENG-1234-refund-flow/
  why this approach          02-design.md § Decisions D1-D3
  what the code looked like  01-research.md § Map of the territory
  how it was cut into steps  03-structure.md § Dependency graph
  what went differently      99-progress.md § Deviations
```

Nobody is asked to read five files. A reviewer with one doubt knows which one file
answers it, and the rest are there for the record.

## Commit shape

**One commit per Structure step, in dependency order,** the message opening with the
step: `ENG-1234 S3: <title>`. This is not tidiness — it is what makes the artifacts and
the history agree:

- `git log` reads as `03-structure.md`'s execution order, so the decomposition can be
  reviewed against what was actually done.
- A reverted step (see `recovery.md`) is one `git revert`, and its message names the
  deviation that caused it.
- A reviewer who wants the "why" of a hunk has the step name in the commit, the step in
  the plan, and the decision in the design — three hops, all named.

Fix-up commits inside a step get squashed into it before the PR is opened. Commits
from two steps never get squashed together: that erases a boundary the plan drew on
purpose.

## Does `thoughts/` ship in the same PR

**Yes.** The artifacts and the code are one change, and the record of the decision is
worth nothing if it lands in a different PR from the decision. Three consequences:

- `thoughts/<dir>/` is committed as its own commit, **first** in the branch, so the
  reasoning is in place before any code that depends on it.
- Corrections made during Implement (`recovery.md`) land as later commits to the same
  artifacts, in the same PR, so the record and the code stay in step.
- The PR description's "Where the reasoning lives" link points at the branch's
  `thoughts/`, which the reviewer can open without leaving the diff.

The one thing not to do is strip `thoughts/` before merging to "keep the repo clean".
The artifacts are the cheapest audit trail the project will ever get, and they cost
nothing in a build.

## Before opening

- [ ] Every Structure step is one commit, ordered, `<TASK-ID> Sn:` in the message
- [ ] `thoughts/<dir>/` committed first; every Status block ticked; no open deviation
- [ ] Description carries Problem, Decisions, Not-doing, Verify, Deviations, and the
      pointer table — and nothing pasted wholesale from an artifact
- [ ] The verification commands in the description were run on the final commit, and
      the real output is attached
