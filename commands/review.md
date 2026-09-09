---
description: Review one QRSPI artifact for judgement-level weaknesses — finished-but-wrong, not unfinished — and report; edits nothing
argument-hint: thoughts/<dir>/<NN-artifact>.md
allowed-tools: Bash(ls *), Bash(grep *), Read
---

# Review a QRSPI artifact

Target: `$ARGUMENTS` — one artifact file. If a directory is given, list it and ask
which file; do not review all of them at once — a review covers one artifact.

## 1. Load the rubric for this artifact type

Read `${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/reviewing.md`. The section that
applies is the one matching the file's `NN-` prefix; the three questions at the top
apply to every artifact.

## 2. Read the artifact — and spot-check it against the repository

Read the target file once. Then, without reading any other artifact:

- For `01`, `02`, `04`: pick **three** `path:line` citations at random and verify each
  with `grep -n` on the repository. A citation that does not hold is the finding — do
  not go on to verify all of them, say that one was off and the rest are suspect.
- For `03`, `04`: pick one step and ask whether a fresh session, holding only this
  file, could execute it. Name what it would have to guess.
- For `02`: for each decision, check that its reason cites a path in the research doc.
  Do not open the research doc to check the path is real — that is Research's review.

Do not read the upstream artifacts wholesale. The review is of this file; if it needs
another file to be understood, that is itself a finding (self-containment).

## 3. Report

A table, most costly first:

| § | Weakness | Why it costs downstream | Severity |
|---|---|---|---|
| | specific: the line, the claim, the missing thing | which later phase pays, and roughly what | blocks / fix before advancing / note |

Then one verdict line: **advance**, **fix first**, or **send back to <phase>**.

Two or three real findings beat a dozen echoes of the checklist. If you find nothing,
say which three citations you checked and which step you tried the zero-context test
on, so the reader knows what "nothing" covered.

## 4. Stop

Do not edit the artifact. Do not run the next phase. Do not fix what you found — the
author does, in the artifact, so the record stays theirs.
