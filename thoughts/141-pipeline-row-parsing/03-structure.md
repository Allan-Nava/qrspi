# 03 · Structure — 141 A pipeline row that does not parse vanishes silently

**Written against:** `8be8a5d`

---

## Reference

Design: [`02-design.md`](./02-design.md)

HEAD is the commit the design was written against, so every `path:line` it cites still
resolves as written.

---

## Settled before the split

D4 hands Structure the result's field names, shape and no-block signal; the design's Status
note hands it the three-file list. Both are fixed here rather than in Plan because S2 and S3
run in parallel against them — a step cannot be independently verifiable if its interface is
still open.

### The one export

`readPipeline(text)` — `text` is a whole file's contents, never a pre-sliced block.

```
{ found: false }                                   // no pipeline block in this text
{ found: true, start, end, rows: [...], refused: [...] }
```

- `start`, `end` — 1-based absolute line numbers of the opening and closing fence lines
  (D3's bounds; the site slices lede and after-text around them).
- `rows[i]` — `{ phase, context, output, size, key, line }`. `phase`, `context`, `output`,
  `size` are exactly what `renderPipeline` consumes today (`site/build.mjs:96-111`), `size`
  being `null` when the row has none (`site/build.mjs:89`). `key` is the normalised
  comparison string the check compares on, including D2's leading-arrow strip
  (`bin/qrspi.mjs:269`). `line` is the row's absolute 1-based line.
- `refused[i]` — `{ line, text }`: absolute 1-based line, and the line's raw text for
  quoting (D5).
- Legal lines (Q2): blank or whitespace-only, or a row. Anything else lands in `refused`.

**The no-block signal is `found: false`, not `null`.** Both callers must distinguish "this
file has no pipeline block" from "the block is there and holds no rows" — they are two
different messages in the check (`bin/qrspi.mjs:537`, `:541`) and two different failures on
the site (D6). A `null` return collapses them, which is how `pipelineRows` reads today
(`bin/qrspi.mjs:264` returns `null`, and the caller tests `!canonical.rows?.length` for both
cases at `:536`).

Nothing else is exported, per D4.

### The three-file list stays in `bin/qrspi.mjs`

D5 says the three paths inline at `bin/qrspi.mjs:532` "become one constant in the module";
D4 says `readPipeline` is the only export. Settled: one `const` in `bin/qrspi.mjs`, beside
`PHASES` (`bin/qrspi.mjs:255`) — **not** a second export from `bin/pipeline.mjs`.

- Which files are compared is `check`'s policy, not the grammar; the site reads `README.md`
  alone and would never import the list.
- A second export is the mechanism D4 exists to remove: two symbols are two things a caller
  can take one of.
- D5's intent — one constant instead of three paths inline in an expression — is met either
  way, so the cheaper reading wins.

---

## Steps

Every command below is run from the repo root. `$S` is a scratch directory outside the repo
(the session's scratchpad); nothing it holds is committed — Q10 refuses a test framework, so
the negative cases are one-off commands, not fixtures.

The pipeline block in `README.md` is lines **19-26**: opening fence 19, six rows 20-25,
closing fence 26. Several verifications below depend on those numbers; they hold at `8be8a5d`.

### S1 · `bin/pipeline.mjs` — the one definition

- **Goal:** the module of D1-D4 exists and is correct: one export `readPipeline(text)` with
  the shape fixed above, the block predicate (D3), the row regex and its leading-arrow strip
  as one unit (D2), the legal-line rule (Q2). No imports, not even `node:*`; nothing runs at
  load. Nobody calls it yet.
- **Touches:** `bin/pipeline.mjs` (new). Nothing else.
- **Depends on:** — (none)
- **Who:** agent
- **Fits:** one new file of ~40 lines; the only reading is `bin/qrspi.mjs:260-272` and
  `site/build.mjs:83-92`, the two parsers it replaces.
- **Verify:** three commands, all three must pass.

  1. The module agrees with the three drawn blocks and reports a refusal at its absolute line:

     ```bash
     node --input-type=module -e '
     import { readPipeline } from "./bin/pipeline.mjs"
     import { readFileSync } from "node:fs"
     const files = ["README.md", "skills/qrspi/SKILL.md", "skills/token-efficiency/references/compaction.md"]
     const got = files.map((f) => readPipeline(readFileSync(f, "utf8")))
     got.forEach((r, i) => {
       if (!r.found) throw new Error(files[i] + ": no block found")
       if (r.refused.length) throw new Error(files[i] + ": refused " + JSON.stringify(r.refused))
       if (!r.rows.length) throw new Error(files[i] + ": no rows")
     })
     const keys = got.map((r) => r.rows.map((x) => x.key).join("\n"))
     if (new Set(keys).size !== 1) throw new Error("keys differ:\n" + keys.join("\n--\n"))
     if (got[0].start !== 19 || got[0].end !== 26 || got[0].rows.length !== 6) throw new Error("README bounds/rows: " + JSON.stringify([got[0].start, got[0].end, got[0].rows.length]))
     const bad = readPipeline("# x\n\n```\nQuestions  ~20k burned  → 00-questions.md  (~3k)\nnonsense line\n```\n")
     if (bad.refused.length !== 1 || bad.refused[0].line !== 5) throw new Error("refusal not at its absolute line: " + JSON.stringify(bad.refused))
     if (readPipeline("# x\n\nno fence here\n").found !== false) throw new Error("no-block signal wrong")
     console.log("ok — 3 files agree,", got[0].rows.length, "rows")
     '
     ```

     The three keys being equal is the load-bearing assertion: it is D2's strip working on
     `compaction.md`'s two-arrow rows, which is the half the site's copy lacks.
  2. `npm test` — still green. Nothing imports the module yet, so this proves only that the
     new file trips no existing invariant (the #99 local-path scan walks `bin/`,
     `bin/qrspi.mjs:518-527`, and exempts only `bin/qrspi.mjs`).
  3. It ships: `npm pack --dry-run 2>&1 | grep -c 'bin/pipeline\.mjs'` prints `1` with no
     edit to `package.json#files` (D1).
- **Repo state after:** working, both old parsers still in place and in use; the module is
  dead code.

### S2 · `check` calls the module and names each refused line

- **Goal:** `pipelineRows` and its "keep the two in step" comment are gone
  (`bin/qrspi.mjs:257-272`); the pipeline check (`:531-552`) calls `readPipeline`, pushes one
  problem per refused line prefixed `path:line` and quoting the line (D5), and keeps the
  existing no-block and row-disagreement problems; the three paths at `:532` become the
  `const` settled above.
- **Touches:** `bin/qrspi.mjs`
- **Depends on:** S1
- **Who:** agent
- **Fits:** one function removed, one block of ~20 lines rewritten, in a file read only
  around `:250-272` and `:531-552`.
- **Verify:**

  1. `npm test` — green, and the success line still prints (`bin/qrspi.mjs:569`).
  2. `grep -c 'pipelineRows' bin/qrspi.mjs` prints `0`.
  3. The bug the ticket is about now fails, naming the line:

     ```bash
     sed -i '26i not a row' README.md            # junk becomes README.md:26, inside the block
     node bin/qrspi.mjs check; echo "exit=$?"    # expect exit=1
     node bin/qrspi.mjs check 2>&1 | grep -F 'README.md:26'   # expect a hit quoting "not a row"
     git checkout -- README.md && git diff --quiet README.md && echo restored
     ```

     Pre-change this sequence exits 0 and prints nothing — that is the defect.
  4. A row made inconsistent in one file only is still caught (the old behaviour is not lost):
     same insert/revert dance with `sed -i '20s/~20k/~21k/' README.md`, expecting exit 1 and
     a `pipeline row 1 disagrees` problem.
- **Repo state after:** working; `npm test` green and strictly stricter than before. The site
  still carries its own parser.

### S3 · the site calls the module, validates at read time, loses the `<pre>` fallback

- **Goal:** D3 and D6 on the site. `readPipeline` is called once on the whole README
  (`site/build.mjs:22`); `parsePipeline` (`:83-92`) is gone; `parseIntro` (`:70-80`) slices
  lede and after-text from the README's own lines using `start`/`end` instead of
  re-finding the fence, dropping the H1 line as `parseReadme` does (`:50-52`), and the HTML
  pre-filter (`:72-75`) applies to the lede alone; the bounds are asserted to fall before the
  first `##`; no block, any refused line, or zero rows prints and exits 1 through a local
  `die()` mirroring `bin/qrspi.mjs:31-34`; `renderPipeline` loses its `fallback` parameter and
  `if (!rows)` branch (`:96-97`), its call site loses the second argument (`:419`), and the
  build log loses its `fallback <pre>` branch (`:496`).
- **Touches:** `site/build.mjs`
- **Depends on:** S1
- **Who:** agent
- **Fits:** one file, ~60 lines changed across five known regions; `site/build.mjs` is ~500
  lines and the rest of it is untouched CSS and HTML assembly.
- **Verify:** capture the baseline **before** editing, then assert the page did not move.
  `site/build.mjs` needs `marked` (`package.json#devDependencies`), which a fresh checkout
  does not have — `npm install` once first. The installer and `check` still need nothing.

  1. Baseline, on the clean tree: `node site/build.mjs --out $S/dist-before`
  2. After the edit: `node site/build.mjs --out $S/dist-after`
  3. `diff -q $S/dist-before/index.html $S/dist-after/index.html` — **identical**. The README
     is unchanged and its rows parse today, so any difference is a regression; this is what
     catches the H1 trap in the lede slice (it would move the hero and the
     `<meta name="description">`, `site/build.mjs:174-178`).
  4. `grep -c 'class="flow-row"' $S/dist-after/index.html` prints `6`;
     `grep -c 'class="fallback"' $S/dist-after/index.html` prints `0`.
  5. `grep -cE 'parsePipeline|fallback' site/build.mjs` prints `0`.
  6. `node site/build.mjs 2>&1 | grep -F 'pipeline: 6 rows'` — one hit, and no `fallback`
     branch left in the log line.
  7. The build now hard-fails, at read time:

     ```bash
     sed -i '26i not a row' README.md
     node site/build.mjs --out $S/dist-bad; echo "exit=$?"   # expect exit=1
     test ! -e $S/dist-bad/index.html && echo "nothing written"   # it died before any HTML
     git checkout -- README.md && git diff --quiet README.md && echo restored
     ```

     Pre-change this exits 0 and silently ships a five-row hero.
  8. `npm test` — green (S2's check reads the same README).
- **Repo state after:** working; the site builds the same page from the same README, and both
  readers run one definition. The code change is complete at the end of this step.

### S4 · the module resolves from a packed tarball

- **Goal:** close the backward-compat risk in the design's Impact table — a published tarball
  in which `bin/pipeline.mjs` is missing or unresolvable makes `npx qrspi check` throw on
  import instead of reporting problems.
- **Touches:** nothing. Commands only.
- **Depends on:** S1, S2
- **Who:** agent
- **Fits:** four commands.
- **Verify:** pack, extract into its own empty directory, and run it **by path** from outside
  that directory (an extracted archive is untrusted input, even our own):

  ```bash
  rm -rf $S/tar && mkdir -p $S/tar
  npm pack --pack-destination $S/tar
  tar -xzf $S/tar/qrspi-*.tgz -C $S/tar
  node --input-type=module -e 'import("'"$S"'/tar/package/bin/pipeline.mjs").then((m) => { if (typeof m.readPipeline !== "function") throw new Error("no readPipeline"); console.log("resolves") })'
  node $S/tar/package/bin/qrspi.mjs check 2>&1 | grep -En 'pipeline|not a row|Cannot find module'   # expect no output
  ```

  **The exit code is not the oracle here.** `check` already exits 1 inside an extracted
  tarball because `plugins/qrspi-pane` is not shipped (`02-design.md`, "More research needed",
  T3). The assertion is that no *pipeline* problem and no module-resolution error appear.
- **Repo state after:** unchanged — this step commits nothing.

### S5 · `CLAUDE.md`: the stale site prose and the invariant list

- **Goal:** `CLAUDE.md:327-332` stops describing behaviour this ticket removes — "the first
  fenced block", a row that "is skipped", "falls back to a `<pre>`", "silently drops rows" —
  and `:275`'s list of what `check` validates gains the new invariant: every line inside the
  block is blank or a row, and a refused line is named with its file and line.
  `CONTRIBUTING.md:329` requires the second half.
- **Touches:** `CLAUDE.md`
- **Depends on:** S2, S3 — the prose asserts their behaviour, so it must not land first.
- **Who:** agent
- **Fits:** two paragraphs.
- **Verify:**

  1. The stale claims are gone: `grep -nE 'falls back to a|silently drops rows' CLAUDE.md`
     prints nothing.
  2. The invariant is stated, and greppable: `grep -c 'blank or a row' CLAUDE.md` prints at
     least `1` (the literal phrase is the hook; the sentence around it is Plan's).
  3. `npm test` — green; and `grep -rn '](' README.md CLAUDE.md` still resolves (the
     house check in `CLAUDE.md`, "Verifying a change").
- **Repo state after:** working; the repo's own documentation matches the code. This is the
  last step that changes a tracked file.

### S6 · the built page, looked at

- **Goal:** D6 removed the only thing that stood between a parse change and the hero. One
  human looks at the page before it deploys — the convention `CLAUDE.md` states for the
  generator ("re-run the build and look at the output").
- **Touches:** `thoughts/141-pipeline-row-parsing/99-progress.md` (the observation).
- **Depends on:** S3
- **Who:** **human.** `diff -q` in S3 proves the bytes did not move; it cannot say the page
  was ever right. Only this step looks.
- **Fits:** one build, one browser.
- **Verify:** `npm install` (for `marked`, as in S3), then
  `npm run build:site && open site/dist/index.html` (or the platform's opener),
  then a row written into `## Verifications run` in
  `thoughts/141-pipeline-row-parsing/99-progress.md`, result cell beginning `observed:` and
  stating the six phase rows draw with their context, arrow, artifact and size, and that no
  `<pre>` block appears in the hero. Proof it was recorded:

  ```bash
  grep -nE '\|\s*S6\s*\|\s*observed:' thoughts/141-pipeline-row-parsing/99-progress.md
  ```
- **Repo state after:** working, unchanged but for the artifact.

### S7 · CI on Node 18/20/22/24, on the real PR

- **Goal:** the one claim no local run can make. D1 chose a repo-local relative import because
  `check` runs with **no `npm install`** on four Node versions (`.github/workflows/ci.yml:20-41`);
  one developer machine runs one of them. This step is the measurement.
- **Touches:** `thoughts/141-pipeline-row-parsing/99-progress.md` (the observation).
- **Depends on:** S1-S5, all landed on the branch and pushed as a PR.
- **Who:** **live** — needs a real harness: GitHub Actions on a pushed branch.
- **Fits:** a wait, not a session.
- **Verify:** the PR's `ci.yml` run green on all four Node versions, including the copy-mode
  round trip and the site build + `npm pack` job (`ci.yml:45-57`), then a row in
  `## Verifications run` of `thoughts/141-pipeline-row-parsing/99-progress.md` whose result
  cell begins `observed:` and carries the run URL. Proof:

  ```bash
  grep -nE '\|\s*S7\s*\|\s*observed:.*actions/runs/[0-9]+' thoughts/141-pipeline-row-parsing/99-progress.md
  ```

  **Not in scope for this step:** exercising the Pages hard-fail in CI. That would mean
  pushing a deliberately malformed README. S2 and S3 prove the exit code locally, and
  `pages.yml:32-33` with `deploy` gated on `needs: build` (`:39-48`) is read, not run.
- **Repo state after:** working; the branch is reviewable.

---

## Dependency graph

```
S1 ──┬── S2 ──── S4   tarball resolves      (agent, commits nothing)
     │      ╲
     │       ╲─── S5   CLAUDE.md             (agent — the one cross-edge: S2 and S3)
     │       ╱
     └── S3 ──── S6   the page, looked at   (human)

S1…S6 ──────────── S7   CI on Node 18-24     (live, on the pushed branch)
```

Edges, written out, since the drawing cannot show two parents cleanly: S2 → S1; S3 → S1;
S4 → S1, S2; S5 → S2, S3; S6 → S3; S7 → S1, S2, S3, S4, S5, S6.

**Parallelisable:**

- **S2 ‖ S3** — the whole point of S1 landing first. S2 touches `bin/qrspi.mjs` only, S3
  `site/build.mjs` only; neither reads the other's file. Separate worktrees, no shared edit.
  **One caveat:** both negative tests `sed -i` and then `git checkout -- README.md`. On
  separate worktrees that is two separate checkouts and safe; in **one** checkout they must
  not run at the same time, or one restores the other's README mid-run.
- **S4 ‖ S5 ‖ S6** — S4 commits nothing, S5 edits `CLAUDE.md`, S6 edits only
  `99-progress.md`.
- **Never parallel:** S1 (everything waits on the interface) and S7 (it measures the merged
  branch).
- `99-progress.md` is shared state. S6's and S7's observations go through the single owner
  `05-implement.md` names, not concurrent edits from two sessions.

---

## Recommended execution order

1. S1
2. S2 ‖ S3
3. S4 ‖ S5 ‖ S6
4. S7

The code change is complete after step 2; everything after it is documentation and
verification. If the work has to stop early, stopping after S3 leaves the repo correct,
green and strictly stricter than `8be8a5d` — only `CLAUDE.md` lies, and it lies today too.

---

## Per-step risks

| Step | Risk | Fallback |
|---|---|---|
| S1 | `key` does not reproduce `bin/qrspi.mjs:269` exactly — most likely by dropping D2's leading-arrow strip — so `compaction.md`'s two-arrow rows (`compaction.md:24`) stop comparing equal and S2's `npm test` fails on an untouched diagram. | S1's verify 1 asserts the three key lists are equal before S2 starts, so this cannot reach S2. If it does, the fault is in the module; **do not edit the diagram** — redrawing `compaction.md` is out of scope (`02-design.md`, "What we are NOT doing"). |
| S1 | The shape fixed above turns out to be wrong for one caller once that caller is written, breaking the parallel split. | The interface section is Structure's, not Plan's: amend it there and re-run S1's verify before S2/S3 resume. A shape change after S2 and S3 have both landed is a replan, recorded in `99-progress.md` § Deviations. |
| S2 | `found: false` (no block) and a found block with zero rows need two different problems; collapsing them loses the message `bin/qrspi.mjs:537` prints today, which says the site reads the file too. | S2's verify 1 keeps `npm test` green but does not exercise either branch. Delete the whole block from a scratch copy of `README.md` to check the wording once; it is one command, not a step. |
| S3 | The lede slice keeps the README H1 (`README.md:1`), which `parseReadme` drops (`site/build.mjs:50-52`). The hero gains a line and `<meta name="description">` changes. | S3's verify 3 — the byte-identical `diff -q` — fails loudly. This is the trap the baseline exists for; capture `dist-before` **before** touching the file or the check is unavailable. |
| S3 | A sloppy README edit now fails the Pages deploy where it used to degrade to a `<pre>`. | Accepted, by Q4 and D6's stated trade-off: a loud nothing over a quiet wrong hero. `pages.yml:32-33` runs `npm test` before the build, so the failure arrives at the check first, with a `path:line`. |
| S4 | The exit code is read as the oracle and the step is recorded as failing for an unrelated reason (`plugins/qrspi-pane` is not in the tarball). | The verify asserts on the absence of pipeline and module-resolution lines in the output, and says so in the step. `02-design.md` T3 is the reference. |
| S5 | One of the two passages is fixed and the other left stale — they are the same claim in two places (`CLAUDE.md:275`, `:327-332`). | The two greps in S5's verify cover both halves: the removal and the new invariant. |
| S6 | Skipped as "the diff was empty". The diff proves nothing about whether the page is right. | The step is `human` and its grep is in the Done-when: `/qrspi:next` has a row in `99-progress.md` to point at, or the step is open. |
| S7 | A post-18 syntax or API in `bin/pipeline.mjs` passes locally and fails on Node 18 (the floor, `ci.yml:20-41`). | S1 keeps the module import-free and small; if CI disagrees, the fault is in S1 and S1 re-opens — no other step changes. The failure is cheap and early: `check` is the first job. |

---

## Status

- [x] Decomposition complete — 7 steps: 5 agent, 1 human (S6), 1 live (S7)
- [x] Every step has a verification command — including S6 and S7, whose written observation
      in `99-progress.md` § Verifications run is proved by the grep in each step
- [x] Every step leaves the repo working — `npm test` green at every boundary; S1 lands dead
      code, S4 commits nothing
- [x] Dependencies and parallelism mapped — S2 ‖ S3, then S4 ‖ S5 ‖ S6; the one-checkout
      caveat on the two negative tests is stated
- [x] Approved (2026-10-11, Allan Nava, in chat — "si approvo e procedi con il plan")

> Next phase: **Plan**. It receives: this file + `02-design.md`.
