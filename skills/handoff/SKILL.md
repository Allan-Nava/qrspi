---
name: handoff
description: Write a handoff — the note a fresh session with zero context reads to continue this work — when asked to summarise a session before context runs out, compress research or a long investigation into a file, hand work to another agent or a later self, or write a plan step someone else executes without asking questions. Covers what survives a context reset, the load-bearing-fact test, compressing without losing the evidence trail, and the self-containment failures ("the file from before", "as discussed above") that make a handoff fail silently.
---

# Handoff

A handoff is a document written for a reader who has **none of your context**: a fresh
session, another agent, yourself after `/clear`. It is the one artifact whose quality is
measured only after the writer is gone — which is why it is usually written badly, and
why the cost lands on someone else.

The compaction ratios and operating rules are in the `token-efficiency` skill; the
phase skeletons are in `qrspi`. This skill is the **craft**: which facts to keep, how to
state them so they survive, and how to know before sending whether it will work.

## The one test

> Cover everything but the handoff. Could a competent stranger act on it — no
> questions, no exploration — and arrive where you would have?

If they would have to ask one thing, the handoff is missing that thing. If they would
have to open a file to find out what you meant, you meant a path and did not write it.

## What survives a context reset

| Survives | Does not |
|---|---|
| files on disk, git history, the handoff itself | the conversation — every word of it |
| a path, a symbol, a line number | "the file we looked at", "the function above" |
| a decision **with its reason** | a decision alone (it will be re-argued) |
| a verification command and its real output | "tests pass" |
| an open question, stated as a question | a feeling that something was off |
| a constraint and where it comes from | "be careful with the schema" |

Everything in the right-hand column is what a session *knows* at the end and what a
handoff written from inside that session tends to assume. `references/what-survives.md`
goes through each.

## The load-bearing-fact test

Faced with 200k tokens of investigation, which facts go in? For each candidate:

> If the next session did not know this, what would it do **wrong**?

Nothing → decoration, cut it. Something → load-bearing: keep it, as a citation
(`path:line`, symbol) not a quotation. A research handoff that keeps the evidence trail
and drops the evidence itself compresses 30-50× and loses nothing that can be
recovered by following the citation. `references/load-bearing.md` has the categories
that are almost always load-bearing and the ones that almost never are.

## Writing a step someone else executes

The hardest handoff is an instruction: a plan step, a task for a subagent, a "next
concrete action". It fails in one of five ways, all silent — the executor does not
stop, it guesses. `references/zero-context-step.md` lists them, the five parts every
executable step needs, and the self-test that catches a guess before it is made.

## The failure modes, by name

- **"The file from before."** A reference to session state. Replace with the path.
- **"As discussed above."** There is no above. Replace with the decision and reason.
- **"The usual pattern."** Whose usual? Replace with `path:line` of one instance.
- **"Same as S2."** Only if S2 is in the same file, and even then, say what part.
- **The relative path** — relative to a `cwd` the reader does not share.
- **The summary that lost its source** — "the API rejects empty names" with no line.
- **The unstated default** — a choice made silently that the reader will make
  differently.

## Related

- `qrspi` — the workflow whose every phase boundary is a handoff; its templates are
  the skeletons this skill fills well.
- `token-efficiency` — why compaction pays (`references/compaction.md`), and the
  compression-ratio KPI a good handoff moves.
