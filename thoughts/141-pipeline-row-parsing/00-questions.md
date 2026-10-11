# 00 · Questions — 141 A pipeline row that does not parse vanishes silently

**Written against:** `8be8a5d`

The default assumption is what makes this phase non-blocking: work can proceed
without waiting for answers, and the assumptions are on the record.

---

## Ticket

**ID:** 141
**Link:** https://github.com/allan-nava/qrspi/issues/141
**Title:** A pipeline row that does not parse vanishes from the site and from npm test without a failure

The pipeline diagram is read by two parsers: `pipelineRows()` in `bin/qrspi.mjs:260`
(what `npm test` uses to compare the three files that draw it) and `parsePipeline()` in
`site/build.mjs:83` (what renders the site). They carry the same regex, copied by hand
under a "keep the two in step" comment, and both skip any line that does not match it.

**What goes wrong**

- A row malformed the same way in `README.md`, `skills/qrspi/SKILL.md` and
  `skills/token-efficiency/references/compaction.md` parses to three equal lists minus
  that row: `npm test` passes, the site drops the row, and CI only logs the row count.
- They choose the block differently: the check takes the fenced block that contains
  `00-questions.md`, the site the first fenced block in the README's intro. A code block
  added above the diagram makes them read different text.

**Wanted**

- A line in the pipeline block that is neither blank nor a parseable row fails
  `npm test`, naming file and line.
- One definition of the row shape (and of which block is the pipeline), used by both the
  check and the site build.

**Constraints**

- `bin/qrspi.mjs` stays dependency-free and Node-18-compatible; it runs in CI without
  `npm install`.
- The site generator carries no prose of its own (CLAUDE.md, "The site").
- What ships in the npm tarball is governed by `package.json#files`; a new module either
  belongs there or must not be needed by the installer.

**Done when**

- [ ] A deliberately malformed row in all three files makes `npm test` fail, and the
  message names the line.
- [ ] The row regex exists once.
- [ ] `npm test`, `npm run build:site` and `npm pack --dry-run` pass, and the site still
  renders all six rows.

---

## Questions

### Q1 · Where may the single definition live, given the tarball and dependency constraints?

- **Risk if unresolved:** the whole shape of the fix depends on this. A new module
  imported by `bin/qrspi.mjs` must ship in `package.json#files` or `npx qrspi check`
  breaks for installed users; keeping the definition inside `bin/qrspi.mjs` and importing
  it from `site/build.mjs` makes the site build depend on the installer; a third
  location satisfies neither unless it is packaged.
- **Default assumption:** the definition lives in a new small ESM module added to
  `package.json#files`, imported by both `bin/qrspi.mjs` and `site/build.mjs`, with no
  dependencies and Node-18 syntax only.
- **Answer:** default accepted.

### Q2 · What counts as a legal line inside the pipeline block, besides a row?

- **Risk if unresolved:** too strict and every legitimate decoration (a blank line, a
  header line, a caption, a continuation, an arrow drawn across lines) becomes a CI
  failure; too lax and the bug survives. This is the definition the check is built on.
- **Default assumption:** only two kinds of line are legal — a blank/whitespace-only
  line, and a line that parses as a row. Anything else fails. If the current blocks in
  the three files contain a line of a third kind, that line is treated as a row shape to
  be covered by the definition, not as a licence to add an "ignored" category.
- **Answer:** default accepted.

### Q3 · Is the block-selection divergence in scope, or only the row shape?

- **Risk if unresolved:** fixing the regex alone leaves the second half of the bug — the
  check and the site can still read different text — and the ticket's "Wanted" asks for
  both. Doing both widens the change into `site/build.mjs`'s block handling.
- **Default assumption:** both. One shared rule decides which fenced block is the
  pipeline, used by the check and the site build.
- **Answer:** default accepted.

### Q4 · Should `npm run build:site` also hard-fail on a malformed row, or keep its fallback?

- **Risk if unresolved:** the site currently falls back to a `<pre>` when fewer than three
  rows parse — a deliberate graceful degradation. Making it throw changes a deploy path
  (`pages.yml` on every push to `main`); leaving it means the site can still silently
  differ from what the check validated.
- **Default assumption:** the site build fails too, so the two parsers cannot disagree
  about validity; the `<pre>` fallback is removed or becomes unreachable.
- **Answer:** default accepted.

### Q5 · May the fenced block gain an explicit marker (an info string) to identify it?

- **Risk if unresolved:** an info string is the cheapest unambiguous block selector, but
  it changes how the block renders on GitHub and npm, and it has to be added to all three
  files — a user-visible change to the README's headline diagram.
- **Default assumption:** no marker. The blocks stay as they render today and selection
  stays content-based.
- **Answer:** default accepted.

### Q6 · Does the row count become an asserted invariant, and is it hardcoded?

- **Risk if unresolved:** CI today only logs the count, which is how the ticket's failure
  mode stays quiet. Asserting "exactly six" pins the diagram to today's six phases;
  asserting only "the three files agree and the count is non-zero" keeps the existing
  blind spot for a row deleted from all three.
- **Default assumption:** the three files must agree and the block must contain at least
  one row; no hardcoded six. The malformed-line failure is what closes the reported gap.
- **Answer:** default accepted.

### Q7 · Must the three blocks be byte-identical, or only parse to the same rows?

- **Risk if unresolved:** byte-identical is a stronger and simpler check but may reject
  legitimate differences in the three files' blocks (indentation, surrounding context);
  parse-equal is what the check does today.
- **Default assumption:** parse-equal, as today. Formatting differences stay allowed.
- **Answer:** default accepted.

### Q8 · Is the list of files that draw the pipeline exactly those three, and where is it stated?

- **Risk if unresolved:** if a fourth file draws the diagram (now or later) and is not in
  the list, it is unchecked — the same class of silent gap. CLAUDE.md names three.
- **Default assumption:** three files, as CLAUDE.md and the ticket state, held in one
  constant alongside the shared definition.
- **Answer:** default accepted.

### Q9 · Is the failure message format constrained?

- **Risk if unresolved:** "names file and line" could mean a `path:line` prefix (clickable,
  and parseable as a CI annotation) or free prose. Getting it wrong is cheap to fix but
  the Done-when clause is written against it.
- **Default assumption:** `path:line` plus the offending line's text, in the style the
  rest of `check` already uses for failures.
- **Answer:** default accepted.

### Q10 · Does the check itself need a regression test, with no test framework in the repo?

- **Risk if unresolved:** the Done-when clause is verified by hand-malforming three files
  and reverting. Without a test, the next refactor can re-open the gap silently — the
  exact failure this ticket is about. But adding a framework contradicts "no build, no
  dependency".
- **Default assumption:** no framework. Verification is the manual malform-and-run in the
  Done-when list, recorded in the artifact; a self-test is a follow-up if wanted.
- **Answer:** default accepted.

---

## Out of scope

Things the ticket might suggest but that we are **not** doing in this task:

- Changing what the pipeline diagram *says* — the phases, their context budgets or
  artifact sizes. This is about how it is parsed, not its content.
- The other duplicated-numbers check, the per-phase effort table across its three files.
  Same class of problem, separate ticket.
- Making `site/build.mjs` dependency-free (it uses `marked`, a devDependency, by design).
- CI annotation plumbing in `.github/workflows/ci.yml` beyond whatever `npm test`'s exit
  code already gives.

---

## Status

- [x] Questions generated
- [x] Reviewed by a human (2026-10-11, Allan Nava — "ok default", in the Claude Code session driving this run)
- [x] Answers collected (or assumptions explicitly accepted) — all ten defaults accepted

> Next phase: **Research**. The ticket is **not** passed to Research — only the
> questions and their answers.
