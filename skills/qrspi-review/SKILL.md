---
name: qrspi-review
description: Codex CLI: review one QRSPI artifact for judgement-level weaknesses — finished-but-wrong, not unfinished — and report; edits nothing. Invoke explicitly as $qrspi-review; in Claude Code use /qrspi:review instead.
argument-hint: thoughts/<dir>/<NN-artifact>.md
disable-model-invocation: true
user-invocable: false
---

# Review a QRSPI artifact

> **Codex CLI form of `/qrspi:review`.** Same steps, same gates. Paths below are
> relative to the directory holding this `SKILL.md` (Codex tells you where the skill
> lives); in shell snippets `$SKILL_DIR` stands for that directory — substitute the
> absolute path. The phase references are the sibling skill's, `../qrspi/references/`.
> Codex skills carry no tool allowlist: Codex's own approval mode and sandbox govern
> what runs.

Target: `$ARGUMENTS` — one artifact file. If a directory is given, list it and ask
which file; do not review all of them at once — a review covers one artifact.

## 1. Load the rubric for this artifact type

Read `../qrspi/references/reviewing.md`. The section that
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
