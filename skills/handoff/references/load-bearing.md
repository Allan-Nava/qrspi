# The load-bearing-fact test

A long investigation produces hundreds of facts. A handoff that keeps them all is not a
handoff, it is the transcript with the tool calls removed — and the reader drowns in
it exactly as you would have. The test that sorts them:

> **If the next session did not know this, what would it do wrong?**

Nothing → decoration. Cut it without regret; it can be rediscovered in one grep.
Something → load-bearing. Keep it, and keep it **as a citation, not a quotation**.

## Almost always load-bearing

| Kind | Keep as |
|---|---|
| Where the relevant things live | `path:line` · symbol · one line on its role |
| An existing pattern the new code must follow | one instance, `path:line-line`, who else uses it |
| A constraint that shapes the solution | the constraint, its source (`migrations/…`, a contract, a flag), its consequence |
| Something that already exists and must not be rewritten | path, and what it does that you would otherwise redo |
| A fact that **contradicts** an assumption you started with | in its own section, first — it is the most valuable line in the document |
| Where the tests are, and how they run | path, the command, what a run looked like |
| What you could not determine | the question, and where you looked |

## Almost never load-bearing

- **Pasted code.** The reader has the repository. A path and a line replace forty lines
  of quotation and cannot go stale in a different way from the code.
- **The narrative of how you found out.** "First I looked in `services/`, then…" The
  reader needs where it is, not your route.
- **Confirmations.** "The tests do pass." Only failures, surprises, and the command.
- **Facts about files you opened and did not need.** Opening a file is not a reason
  to mention it.
- **Restating the ticket.** The reader has it, or is deliberately not meant to.

## Compressing research without losing the evidence trail

The ratio a good research handoff reaches is 30-50×: 200k tokens of exploration into
a 4-5k document. It is achieved by one substitution, applied everywhere — **the
citation stands in for the evidence**:

```
before: <40 lines of process_refund pasted> "…so refunds are validated here"
after:  Refund validation — `src/billing/refund.py:142-171` `process_refund`;
        rejects amount > order total (l.158), unknown order (l.150).
```

The second form is one line, carries two facts the first only implied, and points at
the source for anyone who needs the forty lines. Nothing was lost: the trail is intact,
and the reader follows it only if they must.

Three rules keep the trail honest:

1. **Every fact has a path.** A statement about the code with no `path:line` is a
   memory, and memories are what the reset erases.
2. **Line numbers carry the commit.** One line at the top: "read at `a1b2c3d`". Lines
   drift; the reader can `git blame` across the gap if they know it exists.
3. **Contradictions are promoted, not buried.** If the code disproved something the
   ticket, the questions, or you assumed — that goes in its own section, near the
   top, in plain words. It is the fact most likely to save the next phase a rework
   round, and the one most likely to be softened into a footnote.

## The size signal

A research handoff over ~300 lines is almost always pasting code or narrating. A plan
step under ten lines is almost always hiding a decision. Neither is a rule; both are
where to look first.
