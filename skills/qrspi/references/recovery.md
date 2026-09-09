# Recovery — when Implement invalidates an upstream artifact

Step 4 of 7, and the code says the Design is wrong. This is the most common real
failure in the workflow, and the rule is short: *the artifact gets fixed first, not
worked around.* This is how to act on it without starting over.

## First: which kind of deviation is it

Not every surprise is an invalidation. Ask what the plan assumed that turned out false,
and which artifact made the assumption.

| What you found | Where the mistake lives | Re-enter |
|---|---|---|
| A path, signature or line number is off; the intent still holds | `04-plan.md` — a transcription error | nothing: fix the plan line, note it, continue |
| The step cannot be verified as written, or two steps collide | `03-structure.md` — the decomposition | Structure, from the failing step |
| The chosen approach does not fit the code as it actually is | `02-design.md` — a decision rested on a wrong fact | Design, at the decision |
| The wrong fact is *in* `01-research.md` | Research — a blind spot or a false statement | Research, for that one question |
| The wrong fact is in `00-questions.md` — an assumption nobody checked | Questions | that one question, to a human |

The test: **would the same author, with the same inputs, have made the same mistake?**
If yes, the mistake is upstream of the author — go there. If no, it is a slip in the
plan and stays local.

## Stop, record, close

In the Implement session that found it, before anything else:

1. Finish or revert to a green repo. A step is atomic; do not leave it half-done.
2. Write the deviation in `99-progress.md` — plan said / reality is / artifact to fix /
   phase to re-enter / what happens to landed steps. That block is the handoff; the
   next session reads nothing else.
3. Close the session. Re-entering a phase from inside Implement is rule 1 broken.

## Re-enter narrowly

"Re-enter Design" does not mean redo Design. The re-entered phase reads its normal
inputs **plus the deviation**, and its scope is the deviation:

- **Structure** re-cuts from the failing step onward. Landed steps are not re-planned.
- **Design** revisits the one decision the deviation names. Its "Decisions" section
  gains a new entry, dated, with the old one struck through — not deleted: the
  artifact is the record, and a record that forgets its mistakes is not one.
- **Research** answers the one question, as a subagent would: paths, symbols, lines.
  It does not re-map the territory. Append; do not rewrite.

Then the phases downstream of the re-entered one run again, each in a fresh session,
each reading the corrected artifact. Plan is almost always in that set; Structure
often; Research almost never.

## The steps already landed

Three cases, and `99-progress.md` says which applies to each landed step:

- **Keep.** The step is unaffected by the corrected decision. Most are.
- **Adapt.** The step stands but a later step must change it — a new Structure step,
  not a silent edit to a landed one.
- **Revert.** The step embodied the wrong decision. Revert its commit; the commit
  message names the deviation. The reverted step is re-cut by Structure like any other.

Do not "fix forward" a reverted decision inside a step that was about something else.
That is how a plan stops describing the code.

## How it stays the record

- The deviation stays in `99-progress.md`, marked resolved, pointing at the corrected
  artifact and the commit that carried the correction.
- The corrected artifact keeps its history: struck-through decision, dated replacement,
  one line saying which step found the problem.
- `04-plan.md` is regenerated for the affected steps, not patched by hand across the
  board — a plan edited in five places by three sessions no longer passes the
  zero-context test, and that test is the only reason the plan exists.

A recovery that leaves no trace looks cleaner and costs the next reader the very fact
that would have saved them.
