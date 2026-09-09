# What survives a context reset

The writer of a handoff is the one person who cannot see what it lacks: everything
missing is still in their context, so the document reads complete. This is the
inventory of what is actually on the other side of the reset.

## Survives

**Files on disk and in git.** The only durable substrate. If a fact matters and is not
in a file, it is gone. The handoff is one such file; the code it points at is others.

**Identities: path, symbol, line.** `src/billing/refund.py:142` `process_refund` survives
any reset. "The refund function" survives only if there is exactly one and the reader
finds it — which is exploration, which is what the handoff exists to prevent. Line
numbers drift; pair them with the symbol, and say which commit they were read at.

**Decisions with their reasons.** "Use the enum, not a boolean — the schema already
has `status` as an enum (`migrations/0042.sql:8`) and two consumers switch on it."
Without the reason the next session re-opens the question, and may decide otherwise
with the same evidence. The reason is what makes the decision stay decided.

**Verification, as a command and its real output.** `pytest tests/billing -q` → `12
passed`. Not "tests pass". The command is how the reader re-checks; the output is how
they know what "pass" looked like when you left.

**Open questions, as questions.** "Does the webhook retry on 5xx? Not determined —
`src/hooks/dispatch.py` has no retry and I did not find the caller." A question stated
is inherited. A doubt felt is not.

**Constraints with their source.** "Column `status` is a DB enum (`migrations/0042.sql:8`)
— adding a value is a migration." The source is what lets the reader judge whether the
constraint still holds.

## Does not survive

**The conversation.** All of it — every tool result, every file read, every correction
the user made mid-way. Assume the reader saw none of it, because they did not.

**Deixis.** "This file", "that function", "the one above", "here", "the earlier
approach". Each is a pointer into a context that no longer exists. Every one of them
must be replaced by its referent, spelled out.

**Implicit agreements.** Something the user said once and you have been honouring
since — "don't touch the public API", "we're not doing auth in this ticket". If it is
not written down as a constraint or an out-of-scope line, the next session will break
it in good faith.

**Partial mental models.** You know the shape of the module now. That knowledge is
several hundred tool calls of exploration, and none of it is in the handoff unless you
write the map: the four files that matter, what each does, one line each, with paths.

**Things you decided not to do, and why.** Rejected alternatives evaporate first and
are re-proposed first. One line each: what, why not.

**The working directory.** Relative paths are relative to a `cwd` the reader may not
share. Repo-root-relative, always.

## The habit that fixes most of it

Before writing the handoff, run through the session's tool calls once and ask of each
file you opened: does the handoff name it, and say why it matters? If you opened it
and it did not matter, say nothing. If it mattered, the path goes in with one line.
That pass converts the mental model into the map, and it is the step writers skip.
