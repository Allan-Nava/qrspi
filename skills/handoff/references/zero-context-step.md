# Writing a step a zero-context agent can execute

An instruction is the hardest handoff, because its failure is silent: an executor who
lacks a fact does not stop and ask, it **guesses** — plausibly, confidently, and in a
direction you did not intend. Every one of the five parts below exists to remove one
kind of guess.

## The five parts

1. **Where.** The exact repo-root-relative path, and the position inside it: "inside
   `class XService`, after `def get()` (line ~85)". Not "in the service".
2. **What.** For code: the complete signature — name, parameters with types, return
   type, error type. The signature *is* the decision; the body is implementation.
   For anything else: the exact artefact that should exist afterwards.
3. **Behaviour.** Numbered, including the error cases: "3. `RefundError.NOT_FOUND` if
   the order does not exist." "Handle errors appropriately" is a guess delegated.
4. **Verification.** The command, copy-pasteable, and what passing looks like. A step
   that cannot be verified as written is an intention, not a step.
5. **Boundaries.** What not to touch, and why: "`def get()` — used by
   `src/api/orders.py:44`". The executor cannot see the callers you saw.

## The five silent failures

| The step says | The executor guesses |
|---|---|
| "follow the existing pattern" | *which* pattern — there are usually two |
| "same as S2" | how much of S2 — and S2 may be in another file |
| "add validation" | validate what, reject how, with which error |
| "update the tests" | which tests, what new cases, expected outputs |
| "in the usual place" | a place — the wrong one, tidily |

Each is a fact that was obvious in your context and absent from theirs.

## The self-test, before sending

Pick one step. Cover everything except that step — no other artifact, no memory of
the session, no repository until the step names a file. Now execute it in your head:

- The first time you would **open a file the step did not name**, the step is
  missing a path.
- The first time you would **choose between two reasonable readings**, the step is
  missing a decision — make it, in the step.
- The first time you would **want to check something**, the step is missing a
  verification command.
- If you reach the end without any of the three, the step passes. Most do not on the
  first pass; that is the point of the test, and it is far cheaper than the rework
  round the executor's guess would have cost.

## Two things that look like completeness and are not

**Length.** A long step can still hide its decision in an adverb. A short step with a
signature, three numbered behaviours, a command and a "do not touch" line is complete.

**Code.** Pasting the implementation is not a step, it is doing the work in the wrong
place, and it goes stale the moment the codebase moves. Write code only for the
signature, and for the case where the exact shape *is* the decision being handed off.
