# Reviewing — what the gates cannot see

`/qrspi:next` gates mechanically: placeholders left, boxes unticked, a step with no
verification command, a plan that fails the zero-context test. Those catch an artifact
that is **unfinished**. They cannot catch one that is finished and wrong — plausible,
well-formatted, self-contained, and resting on a false fact or a hidden decision. That
one passes every gate and costs a rework round downstream. Rule 6 makes you the
checkpoint; this is what to look for.

## Three questions for any artifact

1. **What would make this wrong?** Not "is it wrong" — you will say no. Name the
   single fact or decision that, if false, invalidates the most downstream work. Then
   check that one against the code, not against the artifact.
2. **What did the author not look at?** Every artifact has a blind-spots section or a
   not-doing section. An empty one is not reassurance; it is the author not knowing
   what they skipped.
3. **Does it read well because it is right, or because it is fluent?** A model writes
   fluent prose about a codebase it has misread. Fluency is evidence of nothing.

## Per artifact

### `00-questions.md`

- A question that is really a design choice — "should we add a column or a table?" is
  Design's decision wearing a question mark. It leaks the solution into Research.
- A default assumption that decides the solution rather than unblocking the work.
- Ten questions of equal weight. The order is the point; if it could be shuffled, the
  risk was not assessed.
- Out-of-scope empty. The ticket always suggests something you are not doing.

### `01-research.md`

- **A fact without `path:line`.** Every statement about the code is a citation or it is
  a guess. Spot-check three at random against the repo; if one is off, assume the rest
  are.
- Summary where evidence should be: "the service validates input" instead of the
  function, the file, the line, and what it actually checks.
- A fact that conveniently supports the obvious solution. Research was not given the
  ticket for a reason; if the map still tilts toward one answer, ask how.
- Tests listed without a run command, or a run command nobody ran.
- Blind spots empty, or "Facts that contradict the assumptions" empty. Real research
  contradicts something.
- Line numbers from a stale checkout. Check the commit the research was done against.

### `02-design.md`

- **Over-specified.** Function bodies, exact signatures, file-by-file edits: that is the
  Plan's job. A design that contains the plan cannot be reviewed as a design, and locks
  in detail before Structure has cut the work.
- A decision with no rejected alternative, or an alternative rejected without a reason
  anchored to `01-research.md`. Either the alternative was not considered, or the reason
  is taste.
- A claim about the code with no path in the research doc. It was invented, or it
  belongs in "More research needed".
- Impact rows left blank instead of saying "none, because…". Blank is unexamined.
- Reversibility unanswered. The irreversible decisions are the ones to argue about.

### `03-structure.md`

- **A step that hides a decision.** "Choose the right serialisation format" is not a
  step, it is Design left undone. Send it back.
- Verification that names no test: "tests pass" — which, and what would fail?
- Two steps marked parallel that touch the same file. Check the *Touches* lines.
- A step that would not fit one session under 40%. If you cannot see how it ends, it
  is two steps.
- A dependency graph that is a straight line. Sometimes true; usually unexamined.

### `04-plan.md`

- **A step that hides a decision**, again, one level down: "handle errors
  appropriately", "follow the existing pattern" with no `path:line` for the pattern.
- A signature missing its error type or return type. The executor will pick one.
- A test case without an expected output, or with an expected output that restates the
  input.
- "Do NOT touch" absent where the research showed shared code. Somebody will touch it.
- Rollback missing or "revert the commit" for a change with a migration.
- The zero-context test, taken seriously: pick a step and ask whether a session with
  **only this file** could execute it. If you had to remember something, it is not in
  the file.

### `99-progress.md`

- A discovery fixed inline ("while I was there…"). That is scope the plan did not
  authorise; it goes to a follow-up.
- A deviation with no *Re-enter* field, or one set to "none" that names a Design fact.
- Peak context climbing session over session. Steps are too large, or the executor is
  reading whole files.

## What a review says

Name **specific weaknesses**, each with where it is (§), what is wrong, and what it
costs if left: blocks the next phase / fix before advancing / note. A review that
echoes the checklist — "citations present, alternatives documented" — has not
reviewed anything. The useful review is short and points at two or three lines.
