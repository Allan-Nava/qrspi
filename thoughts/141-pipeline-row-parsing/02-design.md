# 02 · Design — 141 A pipeline row that does not parse vanishes silently

**Written against:** `8be8a5d`

This is the main human checkpoint. Correcting 200 lines of markdown costs
infinitely less than correcting 2000 lines of wrong code.

---

## Problem

Two hand-copied parsers read the pipeline diagram — `pipelineRows` (`bin/qrspi.mjs:260-272`)
for `npm test`, `parsePipeline` (`site/build.mjs:83-92`) for the site — and each silently
skips a line it cannot parse (`if (!m) continue`, `bin/qrspi.mjs:268`, `site/build.mjs:88`).
A row malformed the same way in all three files parses to three equal shorter lists: the check
passes, the row leaves the site, its only trace a count in a log line (`site/build.mjs:496`).
They also select the block by different rules — a content predicate over every fence
(`bin/qrspi.mjs:261-263`) against the README intro's first fence (`site/build.mjs:77`) — so the two can read different text.

**Ticket:** 141 · https://github.com/allan-nava/qrspi/issues/141

---

## Proposed solution

One side-effect-free module, `bin/pipeline.mjs`, owns three things: which fenced block is the
pipeline, what a row looks like, and what else a line inside the block may be. It exports
**one** function, returning the parsed rows, the lines it refused — each with its absolute
line number — and the block's bounds: no caller writes the skip-loop this bug lives in, and
none re-finds the fence for itself. It sits under `bin/` because `package.json#files` ships
that directory whole (`package.json:9-17`, `01-research.md` Review notes): `check` keeps
working from a tarball with no manifest edit and no dependency. Both callers import it, so
they agree because they run the same code, not because a comment asks a future editor to keep
two regexes in step (`bin/qrspi.mjs:257-259`, `site/build.mjs:82`). No diagram: the graph is
one module and its two importers, which the table below states directly.

### Components to touch

| Component | Path | Kind of change |
|---|---|---|
| The one definition | `bin/pipeline.mjs` | new — no imports, no top-level side effect |
| `pipelineRows` + its "keep the two in step" comment | `bin/qrspi.mjs:257-272` | remove — moves into the module |
| The pipeline check | `bin/qrspi.mjs:531-552` | modify — call the module, one problem per refused line |
| `parseIntro`; `parsePipeline` + its sample-row comment | `site/build.mjs:70-92` | modify / remove — slice the lede and after-text from the block's line bounds (D3) |
| `renderPipeline`, its call site, assembly, build log | `site/build.mjs:96-111`, `:172-174`, `:419`, `:496` | modify — validate at read time; drop the `fallback` parameter, branch and log branch |
| Prose describing today's site behaviour | `CLAUDE.md:327-332` | modify — "the first fenced block", "skipped", "falls back to a `<pre>`" and "silently drops rows" all stop being true |
| The list of what `check` validates | `CLAUDE.md:275` | modify — the pipeline entry gains the new invariant (every line in the block is blank or a row, named with its file and line), as `CONTRIBUTING.md:329` requires of a new invariant |
| `package.json#files` | `package.json:9-17` | **unchanged** — `bin` is listed as a directory |

---

## Decisions

### D1 · The single definition lives in `bin/pipeline.mjs`

- **Choice:** a new ESM module under `bin/`, importing nothing (not even `node:*`) and running
  nothing at load. **Reversible:** yes.
- **Why:** `bin` ships whole in `package.json#files` (`package.json:9-17`), so no manifest edit;
  the `check` job runs with no `npm install` on Node 18-24 (`.github/workflows/ci.yml:20-41`),
  which a repo-local relative import satisfies and a dependency would not (`package.json` has
  no `dependencies` key). The #99 local-path scan walks `bin/` and exempts only `bin/qrspi.mjs`
  (`bin/qrspi.mjs:518-527`), so the module carries no absolute home path or `file:` URL.
- **Rejected alternatives:**
  - `lib/pipeline.mjs` — needs a `files` edit; forgetting it breaks `npx qrspi check` for
    installed users with no local signal. Cleaner name, worse failure mode.
  - `site/pipeline.mjs` — `site/` is absent from `package.json#files`: installed `check` crashes on import.
  - Export from `bin/qrspi.mjs` — it has no `export` today and its top-level `switch (cmd)`
    runs the CLI at load (`bin/qrspi.mjs:590`): importing it would run a command.
  - Two copies plus a `check` that the regex literals are byte-identical — they **are** identical
    today (`bin/qrspi.mjs:267`, `site/build.mjs:87`) and still differ, because only one applies
    the strip (`:269`). That check passes on this bug.

### D2 · The leading-arrow strip stays, and moves inside the module

- **Choice:** the module carries the installer's regex *and* its leading-arrow strip
  (`bin/qrspi.mjs:267`, `:269`) as one indivisible unit. ~~The exported regex is the
  installer's, widened by an optional arrow after the first gap, so the strip disappears.~~
  — reversed at review, **2026-10-11**: the strip executes today, the widened regex was
  reasoned and never run. **Reversible:** yes.
- **Why:** the blocks are not drawn alike — one arrow per row at `README.md:20` and
  `skills/qrspi/SKILL.md:19`, two at `skills/token-efficiency/references/compaction.md:24`
  (`01-research.md`, "THE TWO PARSERS DO NOT CARRY THE SAME ROW SHAPE"). The strip is what
  makes the variant compare equal, and the site's copy lacks it. The first objection to it —
  "a regex **plus** a normaliser you must also call" can be copied half-way — is answered by
  D4, not by the grammar: no caller sees either, so there is nothing left to copy.
- **Rejected alternatives:**
  - Widen the regex so no strip is needed — a simpler grammar, unverified here, and it buys
    nothing once D4 hides regex and normaliser alike behind one call.
  - Adopt the site's version — it parses `compaction.md`'s rows with
    `context = "→  ~20k burned"` and would fail `npm test` on an untouched file.
  - Redraw `compaction.md` with one arrow — out of scope (`00-questions.md`): the only option
    that removes the variant rather than absorbing it, at the cost of editing the diagram.

### D3 · One block rule: the first bare fence whose body contains `00-questions.md`

- **Choice:** one content predicate, applied to a whole file by D4's single entry point — not
  a selector exported beside it; the site stops selecting by position (`site/build.mjs:77`).
  ~~`findPipeline(text)` → `{ body, fence, startLine }`, exported alongside the parser.~~ —
  dropped at review, **2026-10-11**: two exports let a caller select the block one way and
  parse it another, which is this bug one layer up. **Reversible:** yes.
- **Why:** the ticket's second failure is a code block added above the diagram making the two
  read different text; a predicate makes position irrelevant. Q5 refuses the cheaper selector
  (an info string), so selection stays content-based — and both current patterns already
  require a bare fence (`01-research.md`, "Block selection differs").
- **The site needs two things from one block** — the validated rows, and the lede/after split
  around the fence (`site/build.mjs:79`). It calls the entry point on the whole README (`md`,
  `site/build.mjs:22`), so the bounds are README line numbers, and slices lede and after-text
  from **the README's own lines** — not from `parseReadme`'s `intro`, which drops the H1
  (`site/build.mjs:50-52`) and so does not preserve numbering. The HTML pre-filter
  (`site/build.mjs:72-75`) then touches the lede alone, never the block, and the hero's "the
  diagram lives in the intro" requirement becomes one explicit assertion — the bounds fall
  before the first `##` — rather than a second, divergent rule.
- **Rejected alternatives:** positional selection ("first fence in the file") —
  `01-research.md` establishes that only for `README.md:19-26`, not for
  `skills/qrspi/SKILL.md:18-25` or `compaction.md:23-30`; an info string — refused by Q5.

### D4 · The module returns rows *and* refused lines; callers never loop

- **Choice:** one entry point, `readPipeline(text)`, and nothing else exported. Its result says
  whether the file has a pipeline block at all and, when it does, carries the parsed rows, the
  lines it refused, and the block's bounds (D3). Every row carries what `renderPipeline` already
  consumes (`site/build.mjs:96-111`), the normalised comparison string the check compares on
  (`bin/qrspi.mjs:269`) and its absolute line; every refused line carries its line and its text.
  Field names, shape and the no-block signal are **Structure's**. **Reversible:** yes.
- **Legal lines (Q2):** blank or whitespace-only, or a row — nothing else. No block holds a
  third kind of line today (`01-research.md`, "Q2's hedge does not apply"), so the rule costs
  nothing now and is the whole fix.
- **Why not export the regex alone:** the defect is the two `if (!m) continue` loops around it
  (`bin/qrspi.mjs:268`, `site/build.mjs:88`), which exporting the shape would leave in place.
  Splitting `parse()` from `validate()`, or exporting the selector beside the parser (D3),
  fails the same test: a caller can then call one and not the other — today's situation.

### D5 · The check names the refused line, `path:line`-prefixed

- **Choice:** one problem per refused line on the existing `problems` array
  (`bin/qrspi.mjs:565-568`), prefixed `path:line` and quoting the offending text; the wording
  is **Plan's**. The three file paths inline at `bin/qrspi.mjs:532` become one constant in the
  module (Q8). **Reversible:** yes.
- **Why:** the Done-when requires the line to be named, and a `path:line` prefix is what makes
  it clickable in a terminal and parseable as a CI annotation.
- **Rejected alternative:** naming the line in prose, in the `` `${file}: <prose>` `` form the
  file already uses — keeps the house style, loses click-through. The cost of the choice: **no
  message in `check` carries a line number today** (`bin/qrspi.mjs:304`, `:311`, `:527`,
  `:537`), and `01-research.md` flags Q9's "the style `check` already uses" as wrong about it.

### D6 · The site hard-fails, at read time, and loses the `<pre>` fallback

- **Choice:** validate straight after `readFileSync(README)` (`site/build.mjs:22`), before any
  HTML: no block, any refused line, or zero rows prints and exits 1 through a local `die()`
  mirroring `bin/qrspi.mjs:31-34`. The `rows.length >= 3` guard (`site/build.mjs:91`) and the
  `if (!rows)` fallback (`:97`) go. **Reversible:** yes — restoring the branch is a few lines.
- **Why:** Q4. `site/build.mjs` has no failure path of its own today (`01-research.md`,
  Constraints), so this is a new exit, not a changed one; `.github/workflows/pages.yml` runs
  `npm test` (line 32) before `npm run build:site` (line 33) with `deploy` gated on
  `needs: build` (`:39-48`), so a malformed row stops the deploy twice over.
- **Rejected alternatives:** keep the fallback as dead code — unreachable code documenting a
  policy we just reversed; warn and continue — today's behaviour, louder log, refused by Q4.
- **Trade-off, plainly:** a sloppy README edit now fails the Pages deploy where it used to
  degrade to a `<pre>`. Q4 chose a loud nothing over a quiet wrong hero.

### D7 · No row-count and no phase-name assertion

- **Choice:** each file must yield at least one row and the three must parse equal (Q6, Q7);
  no hardcoded six. **Reversible:** yes — a cheap follow-up, the constant already exists.
- **Rejected alternative:** assert the rows' phase column equals `PHASES`
  (`bin/qrspi.mjs:255`). Attractive: an existing constant, and it closes the one hole left
  open — a row **deleted** from all three files still passes, because the comparison at
  `bin/qrspi.mjs:544` only reports `(missing)` for a short side (`01-research.md`, "Partly
  wrong premise"). Rejected because Q6 was answered the other way and research never verified
  that the phase cells in all three blocks match `PHASES`.
- **That hole is accepted** for this ticket and tracked as **#151** (review, 2026-10-11).

### D8 · Nothing enforces "the regex exists once" after this lands

- **Choice:** the module and its comment are the only guard against re-duplication.
  **Reversible:** yes.
- **Why:** a scan of tracked `.mjs` files for a second row regex keys on fragments like
  `\s{2,}` that are too generic to be safe, and `CONTRIBUTING.md:329` asks `check` to enforce
  stated invariants, not to guess at them. What failed here was a comment requesting sync
  (`bin/qrspi.mjs:257-259`, `site/build.mjs:82`); an `import` is a mechanism, not a request.
- **Rejected alternative:** add the scan anyway — the only insurance against this exact
  regression. **Weak spot:** "the row regex exists once" holds the day it lands, unprotected after.

---

## Impact

| Area | Impact | Mitigation |
|---|---|---|
| DB schema, data migration, security, performance | None — no runtime state, no new input, dependency or network call; the diagram blocks are not edited (D2); one extra module load in two scripts. | — |
| Public API | `npx qrspi check` gains failures it did not have; the tarball gains `bin/pipeline.mjs`. Installer commands untouched. | `npm pack --dry-run` (Done-when) and the tarball job at `ci.yml:45-57`. |
| Backward compat | A published tarball missing `bin/pipeline.mjs` would make `npx qrspi check` throw on import instead of reporting problems. | Pack-and-run before tagging — see "More research needed". |
| Contributors / CI | A malformed line now fails `npm test` **and** blocks the Pages deploy (`pages.yml:32-33`, `:39-48`). | The message names `path:line` and quotes the line (D5). |
| Docs | `CLAUDE.md:327-332` describes behaviour this removes; the invariant list at `:275` gains a clause. | Both edited in the same PR (Components table). |

---

## What we are NOT doing

- **Changing what the diagram says** — phases, budgets, sizes, or `compaction.md`'s second
  arrow (`00-questions.md`, "Out of scope"). D2 absorbs the variant instead.
- **The effort-table check** (`effortByPhase`, `bin/qrspi.mjs:276-292`, compared at `:554-563`)
  — same pattern, separate ticket. **An info string** (Q5). **A test framework** (Q10). **CI
  annotation plumbing** beyond the exit code. **`site/build.mjs` staying dependency-free.**
- **Making the HTML pre-filter fence-aware** (`site/build.mjs:72-75`): it drops any line opening
  an HTML tag. D3 moves it off the block; in the rest of the intro it still corrupts such a line. Latent, not this bug.
- **Deciding the v0.9.0 subagent-model question.** The ticket records that Research ran twice as
  the #140 measurement; that lives outside this artifact and does not steer the design.

---

## More research needed

Facts the design assumes but `01-research.md` did not verify:

- [x] **Whether anything styles `.fallback`** in the generator's CSS (`site/build.mjs:328` is
  the pipeline CSS) before D6 deletes the class.
  Nothing does — no `.fallback` rule anywhere in the repo; the pipeline rules
  (`site/build.mjs:329-341`) are all `.flow*`. See `01-research.md` § "Targeted round —
  2026-10-11 (#141)", T1.
- [x] **The full inventory of prose documenting today's skip-and-fallback.** `CLAUDE.md:327-332`
  is known (and `:275`'s invariant list); `README.md` and `CONTRIBUTING.md` were not inventoried.
  Neither file documents the behaviour at all — 0 passages of that kind; both carry only
  the by-example format contract (`README.md:19-26`) and mentions. See
  `01-research.md` § "Targeted round — 2026-10-11 (#141)", T2.
- [x] **That a packed tarball's `npx qrspi check` resolves `bin/pipeline.mjs`** — a blind spot
  in `01-research.md`, inferred from `package.json#files`, never reproduced by packing.
  Reproduced: it ships and a sibling `./pipeline.mjs` resolves — but `check` itself already
  exits 1 inside the extracted tarball (unshipped `plugins/qrspi-pane`), so it is not a
  pass/fail oracle there. See `01-research.md` § "Targeted round — 2026-10-11 (#141)", T3.

> If this list is not empty, consider a short targeted Research round **before**
> moving to Structure. It costs less than the rework.

---

## Review

| Comment | From | Status | Resolution |
|---|---|---|---|
| The export surface contradicts itself: one function (Proposed solution, D4) vs a second `findPipeline` (D3), and the site needs the block's text/position, which `readPipeline` does not return. Decide: **one export**, `readPipeline(text)`, whose result also carries the block's start and end lines, so the site slices the intro from them. No `findPipeline` export. | Allan Nava (chat, 2026-10-11), from `/qrspi:review` | resolved | D3 strikes `findPipeline` and D4 states one export whose result carries the block's bounds; the site slices lede and after-text from the README's own lines, not `parseReadme`'s `intro` (it drops the H1, `site/build.mjs:50-52`). |
| D4 and D5 state Plan-altitude detail — the row's field names, a `key` comparison string, the literal message template. State the decisions (rows and refused lines with line numbers; a `path:line` message naming and quoting the line) and leave the names and the template to Structure and Plan. | Allan Nava (chat, 2026-10-11), from `/qrspi:review` | resolved | D4 now names only what the result carries (rows, refused lines with absolute line numbers, block bounds) and hands field names and shape to Structure; D5 states the `path:line` prefix quoting the line and hands the wording to Plan. |
| D2: keep the existing leading-arrow strip (`bin/qrspi.mjs:269`), moved **inside** the module, rather than widening the regex. Callers never see the regex (D4), so "a normaliser you must also call" cannot be copied half-way any more, and the strip is executed behaviour where the widened regex is not. Drop D2's item from "More research needed". | Allan Nava (chat, 2026-10-11) | resolved | D2 reversed and dated: the strip moves inside the module, the old choice is struck through, the widened regex becomes a rejected alternative, the weak spot and its research item are gone. |
| D7: the hole (a row deleted from all three files passes) is accepted for this ticket and tracked separately as #151. | Allan Nava (chat, 2026-10-11) | resolved | D7 records the hole as accepted and tracked as #151, with downstream phases told not to re-litigate it; the reviewer-prompt line and the conditional research item are gone. |
| Notes, no change required: D1 and D8 cite the repo rather than `01-research.md` (citations verified by `/qrspi:review`); the Components row for `CLAUDE.md:275` gives a reason that holds only for `:327-332` — say what actually changes at `:275`, or drop the row. | `/qrspi:review` | resolved | Citations left as they stand (verified). The Components table splits the row: `:327-332` is the stale site prose, `:275` is the list of what `check` validates and gains the new invariant (`CONTRIBUTING.md:329`). |

---

## Status

- [x] Design written
- [x] Anchored to research facts (every claim has a path)
- [x] Alternatives documented
- [x] Reviewed by the team (2026-10-11, Allan Nava and `/qrspi:review` — read in full, automated review, decisions in chat)
- [x] Comments resolved (2026-10-11 — all five; D2 reversed, D3/D4 cut to one export, D4/D5 raised to design altitude, D7's hole tracked as #151)
- [x] Approved (2026-10-11, Allan Nava, in chat — "si approvo, procedi"). Note for Structure: D4 says `readPipeline` is the only export while D5 moves the three-file list into the module; either export that constant too or keep the list in `bin/qrspi.mjs` — not a design choice, Structure's to settle.

> Next phase: **Structure**. It receives: this file only.
