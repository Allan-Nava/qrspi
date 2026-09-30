# 03 · Structure — <TASK-ID> <title>

**Written against:** `<commit — git rev-parse --short HEAD when this phase ran>`

> **PROMPT (fresh session, clean context)**
>
> You are in the **Structure** phase of the QRSPI workflow.
>
> Input: `02-design.md`. Nothing else.
>
> Task: decompose the design into steps that are implementable and **independently
> verifiable**.
>
> Constraints for every step:
> - it has an objective done-criterion **verifiable with a command**;
> - it leaves the repo in a working state (tests green) when complete;
> - it fits in one session under 40% context — if it does not, split it;
> - it declares its dependencies on other steps.
>
> **The test:** if you cannot say *how a step is verified*, it is not a step — it is
> an intention. Rewrite it.
>
> Mark which steps can run in parallel on separate worktrees, and **who** runs each:
> `agent`, `human`, or `live` (needs a real harness or real time — a live run, a week
> of use). A human or live step is verified by a written observation; say where it is
> recorded and give the grep that proves it was.
>
> Do NOT write the detailed plan: that is the Plan phase. Decomposition only.
>
> Recommended effort: `high`.
>
> **Write as you go.** Create the artifact with its section headings first, then fill
> each section as soon as it is settled — never compose it all at the end. A session
> that stalls or is cut off then leaves a partial artifact the next session continues,
> not nothing.

---

## Reference

Design: [`02-design.md`](./02-design.md)

---

## Steps

### S1 · <title>

- **Goal:** <one line>
- **Touches:** `src/...`, `tests/...`
- **Depends on:** — (none)
- **Who:** agent — or `human` / `live` (a real harness, or real time); such a step is
  verified by a written observation: say where it is recorded and the grep that checks it
- **Verify:** `pytest tests/test_x.py -q` passes
- **Repo state after:** working, feature not yet exposed

### S2 · <title>

- **Goal:**
- **Touches:**
- **Depends on:** S1
- **Who:**
- **Verify:**
- **Repo state after:**

### S3 · <title>

- **Goal:**
- **Touches:**
- **Depends on:** S1
- **Who:**
- **Verify:**
- **Repo state after:**

---

## Dependency graph

```
<the steps above and their edges, e.g.  S1 ──┬── S2
                                              └── S3>
```

**Parallelisable:** <steps that can run on separate worktrees, and why — no shared files>.

---

## Recommended execution order

1. <S1>
2. <S2 ‖ S3 — parallel steps on one line>

---

## Per-step risks

| Step | Risk | Fallback |
|---|---|---|
| | | |

---

## Status

- [ ] Decomposition complete
- [ ] Every step has a verification command
- [ ] Every step leaves the repo working
- [ ] Dependencies and parallelism mapped

> Next phase: **Plan**. It receives: this file + `02-design.md`.
