# 01 · Research — 141 A pipeline row that does not parse vanishes silently

**Written against:** `8be8a5d`

Repository: `qrspi`, a Claude Code plugin whose content is Markdown and JSON. No build
step, no runtime dependency. Facts below are repo-root-relative paths in that
repository, with line numbers as of `8be8a5d`.

---

## Reference questions

From `00-questions.md` — all ten answers were "default assumption accepted". The ones
that steer this research:

- **Q1 → the single definition of the pipeline row shape may live in a new small ESM
  module** that is added to `package.json#files` and imported by both `bin/qrspi.mjs`
  and `site/build.mjs`; no dependencies, Node-18 syntax only.
- **Q2 → inside the pipeline block only two kinds of line are legal:** a
  blank/whitespace-only line, and a line that parses as a row. Any third kind of line
  must be covered by the row definition, not by an "ignored" category.
- **Q3 → block selection is in scope too:** one shared rule decides which fenced block
  is the pipeline, used by both the check and the site build.
- **Q4 → the site build must fail on a malformed row as well;** the current `<pre>`
  fallback is removed or becomes unreachable.
- **Q5 → no info-string marker on the fenced block.** Selection stays content-based and
  the blocks render on GitHub/npm exactly as today.
- **Q6 → no hardcoded row count.** The three files must agree and the block must hold at
  least one row.
- **Q7 → parse-equal, not byte-identical,** across the three files.
- **Q8 → exactly three files draw the pipeline,** held in one constant beside the shared
  definition.
- **Q9 → failure message is `path:line` plus the offending line's text,** in the style
  `check` already uses.
- **Q10 → no test framework.** Verification is the manual malform-and-run.

---

## Map of the territory

### Components involved

| Area | Path | Role |
|---|---|---|
| Installer + `check` | `bin/qrspi.mjs` | 611-line ESM script, `#!/usr/bin/env node` at line 1. Imports only Node built-ins (`node:child_process`, `node:fs`, `node:os`, `node:path`, `node:url`, lines 9-13). No `export` statement anywhere. No main-guard: a bare top-level `switch (cmd)` on `process.argv.slice(2)` runs at load. `const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')` at line 15. |
| Site generator | `site/build.mjs` | ~496-line ESM script, same shebang and same `ROOT` computation (line 15). Reads `join(ROOT, 'README.md')` at line 22. Imports `marked` (the only npm import) plus `node:fs`/`node:path`/`node:url`. |
| Pipeline diagram, copy 1 | `README.md:19-26` | Bare ``` ``` ``` fence (no info string), 6 content lines 20-25, closing fence line 26. Flush left. First fenced block in the file. |
| Pipeline diagram, copy 2 | `skills/qrspi/SKILL.md:18-25` | Bare fence, 6 content lines 19-24, closing fence 25. Flush left. |
| Pipeline diagram, copy 3 | `skills/token-efficiency/references/compaction.md:23-30` | Bare fence, 6 content lines 24-29, closing fence 30. Flush left. **Draws an extra `→` after the phase name** — see "Facts that contradict the assumptions". |

### Entry points

| Symbol | Path:line | What it does |
|---|---|---|
| `pipelineRows(text)` | `bin/qrspi.mjs:260-272` | Finds the pipeline block, parses every line, returns an array of normalised strings (`"phase \| context \| output \| size"`) or `null` when no block is found. |
| the pipeline check | `bin/qrspi.mjs:531-552` | Inside `check()`. Maps the three file paths through `pipelineRows`, takes the first as `canonical`, compares each remaining file row-by-row by string equality. |
| `effortByPhase(text)` | `bin/qrspi.mjs:276-292` | The *other* duplicated-numbers check's parser: reduces a Markdown table to `phase → Set<effort level>`. Its comparison is at `bin/qrspi.mjs:554-563`. Out of scope per `00-questions.md`, but it is the sibling pattern. |
| `const PHASES` | `bin/qrspi.mjs:255` | `['Questions', 'Research', 'Design', 'Structure', 'Plan', 'Implement']` — the only existing named constant about the pipeline. Used by `effortByPhase`, **not** by `pipelineRows`. |
| `parseIntro(raw)` | `site/build.mjs:70-80` | Block *selection* for the site. Strips HTML lines from the README intro, then `intro.match(/^([\s\S]*?)```\n([\s\S]*?)```([\s\S]*)$/)` — the first bare fence in the intro (everything before the first `##`). Returns `{ lede, pipeline, after }`; `pipeline` is `null` when no fence matches. |
| `parsePipeline(block)` | `site/build.mjs:83-92` | Parses the block `parseIntro` handed it into row objects `{ phase, context, output, size }`. Returns `null` if fewer than 3 rows parsed. |
| `renderPipeline(rows, fallback)` | `site/build.mjs:96-111` | `if (!rows) return '<pre class="fallback">…esc(fallback)…</pre>'` (line 97); otherwise an `<ol class="flow">` of `<li>`s. Called once, at `site/build.mjs:419`. |
| assembly | `site/build.mjs:172-174` | `parseReadme(md)` → `parseIntro(intro)` → `parsePipeline(pipeline)`; the `rows` variable from line 174 is what line 496 logs. |

---

## Existing patterns and conventions

### The row regex, duplicated verbatim in two files

- **Where:** `bin/qrspi.mjs:267` and `site/build.mjs:87`.
- **How it works:** both are the literal
  `/^(\S+)\s{2,}(.+?)\s+→\s+(.+?)(?:\s{2,}\((.+)\))?\s*$/` — in `bin/qrspi.mjs` the
  arrow is written as the escape `→`, in `site/build.mjs` as the character `→`.
  Four capture groups: phase, context, output, optional parenthesised size.
- **They are not equivalent in effect.** `bin/qrspi.mjs:269` post-processes group 2 with
  `.replace(/^→\s*/, '')`, stripping a leading arrow; `site/build.mjs:89` does not.
- **Both skip a non-matching line silently:** `if (!m) continue` at `bin/qrspi.mjs:268`
  and `site/build.mjs:88`. Neither records the line, its number, or its file.

### The "keep the two in step" instruction is a comment, not a mechanism

- **Where:** `bin/qrspi.mjs:257-259` — a three-line comment stating that compaction.md
  draws an extra arrow, that the comparison is on parsed rows rather than bytes, and
  "The row shape is the one `site/build.mjs` parses; keep the two in step."
- `site/build.mjs:82` carries the counterpart as a one-line comment reproducing a sample
  row: `` // `Questions   ~20k burned   →  00-questions.md   (~3k)` ``.
- Neither file imports the other (verified: `bin/qrspi.mjs` imports only Node built-ins,
  lines 9-13; `site/build.mjs` imports only `marked` plus built-ins). No shared helper
  module exists anywhere in the repo.

### Block selection differs between the two parsers

- `bin/qrspi.mjs:261-263`: collects **every** fenced block in the file with
  `/```\n([\s\S]*?)```/g` and takes the first whose text `.includes('00-questions.md')`.
- `site/build.mjs:77`: takes the **first** bare fence inside the README intro only, with
  no content predicate.
- Both patterns require a bare ``` ``` ``` fence with an immediate newline, so a fence
  carrying an info string matches neither.

### How `check()` reports a failure

- **Where:** `bin/qrspi.mjs:565-568`. Failures are pushed as plain strings onto a local
  `problems` array; at the end each is printed as `console.error(\`${c.red('x')} ${p}\`)`
  and the process exits 1. Success prints one summary line at `bin/qrspi.mjs:569`.
- **No existing message uses a `path:line` prefix.** The established shape is
  `` `${file}: <prose>` ``. Examples: `bin/qrspi.mjs:304`/`311`
  `` `${f}: invalid JSON — ${e.message}` ``; `bin/qrspi.mjs:527`
  `` `${file}: carries a local path or file URL ("…") — … (#99)` ``; `bin/qrspi.mjs:537`
  `` `README.md: no pipeline block found — site/build.mjs reads it too` ``.
- The pipeline mismatch message is multi-line and indents its two continuation lines by
  six spaces: `bin/qrspi.mjs:546-548`.

### The file list is an inline array, twice

- `bin/qrspi.mjs:532`: `['README.md', 'skills/qrspi/SKILL.md',
  'skills/token-efficiency/references/compaction.md']` — an inline literal, not a named
  constant.
- `bin/qrspi.mjs:555` does the same for the effort table's three files.
- Each path is read via `existsSync(join(ROOT, f))` then
  `readFileSync(join(ROOT, f), 'utf8')`, so a missing file yields `null` rows rather than
  a throw (`bin/qrspi.mjs:533`).

---

## Constraints

| Constraint | Source | Impact |
|---|---|---|
| The npm tarball ships only 7 entries | `package.json:9-17` — `files`: `["bin", "commands", "skills", ".claude-plugin", ".codex-plugin", "README.md", "LICENSE"]` | Directories `bin`, `commands`, `skills`, `.claude-plugin`, `.codex-plugin` plus two files. `site/`, `scripts/` and `evals/` are **absent**, so they are not published. A module imported by `bin/qrspi.mjs` must sit under one of the five shipped directories or be added to this array. |
| No runtime dependency | `package.json` has **no** `dependencies` key; `devDependencies` is `{"marked": "^18.0.0"}` | `marked` reaches `site/build.mjs` only. Anything `bin/qrspi.mjs` imports must be a Node built-in or a repo-local file. |
| Node 18 floor | `package.json:18-20` — `"engines": {"node": ">=18"}` | Enforced by the CI matrix, not a linter: there is no lint config and no lint script. |
| `check` runs with no `npm install` | `.github/workflows/ci.yml:20-41` — job `check`, matrix `node: [18, 20, 22, 24]`, runs `node bin/qrspi.mjs check` at `ci.yml:36`, then a copy-mode install/uninstall round trip at `ci.yml:39-41` | No install step in this job. Any new module must resolve from the checkout alone on Node 18. |
| The `site` job never runs `npm test` | `.github/workflows/ci.yml:45-57` — single Node 24; `npm install --no-audit --no-fund` (`ci.yml:52`), `npm run build:site` (`ci.yml:54`), `npm pack --dry-run` (`ci.yml:56`) | The two parsers are exercised by two different CI jobs today. |
| The site row count is only logged | `site/build.mjs:496` — `console.log(\`built … pipeline: ${rows ? \`${rows.length} rows\` : 'fallback <pre>'} …\`)` | This is the quiet failure channel: a dropped row shows as a smaller number in a log line nobody reads, and a total failure shows as the string `fallback <pre>`. |
| `site/build.mjs` has no failure path | No `throw` or `process.exit(1)` of its own; only Node's uncaught-exception behaviour (e.g. a missing README from `readFileSync`) | Making the site build fail on a malformed row is a new exit path, not a change to an existing one. |
| A failing build blocks the deploy | `.github/workflows/pages.yml:24-38` runs `npm install`, `npm test` (line 32), `npm run build:site` (line 33); job `deploy` at `pages.yml:39-48` has `needs: build` | Default shell is `set -e`, so a non-zero exit from either command fails `build` and `deploy` does not run. Trigger: push to `main` filtered on `README.md`, `package.json`, `site/**`, `skills/**` and the workflow file, plus `workflow_dispatch`. |
| `npm test` is the only check | `package.json:23` — `"test": "node bin/qrspi.mjs check"`; `"build:site": "node site/build.mjs"` at `package.json:22` | Confirmed: no test framework, no test directory, no `*.test.*` file anywhere in the repo. |
| CONTRIBUTING states the rule | `CONTRIBUTING.md:329` — "Keep `npm test` green; add a check to `bin/qrspi.mjs check` when you add an invariant." Also `CONTRIBUTING.md:17` and `:21`. | New invariants are expected to land in `check`, not in a new harness. |
| `bin/qrspi.mjs` exports nothing | No `export` keyword in the file; top-level `switch` on `process.argv.slice(2)` runs unconditionally at load | Importing anything *from* it today would execute the CLI. |
| `repository` must name the GitHub slug | `package.json:40-43` — `git+https://github.com/Allan-Nava/qrspi.git` | Unrelated to this task but read by `marketplaceSource()`; noted so it is not disturbed. |

---

## Reuse candidates

What already exists and should not be rewritten:

| What | Path | Note |
|---|---|---|
| The row regex and its arrow-strip normalisation | `bin/qrspi.mjs:267` + `:269` | The `bin` copy is the more complete of the two: it is the only one that handles compaction.md's extra arrow. |
| Row normalisation into a comparable string | `bin/qrspi.mjs:269` | `[phase, context, output, size ?? ''].map(c => c.trim()).join(' | ')` — the parse-equal comparison Q7 keeps. |
| Row objects for rendering | `site/build.mjs:89` | `{ phase, context, output, size }` with `size` nullable; `renderPipeline` at `site/build.mjs:96-111` consumes exactly those four fields. |
| The `problems` array + exit-1 reporting | `bin/qrspi.mjs:565-568` | Every new failure is one string pushed onto it. |
| `const PHASES` | `bin/qrspi.mjs:255` | An existing named constant for the six phase names, already in the same block of the file. |
| `effortByPhase` and its comparison | `bin/qrspi.mjs:276-292`, `:554-563` | The sibling "same numbers in three files" check. Explicitly out of scope (`00-questions.md`, "Out of scope") but it is the shape the pipeline check mirrors. |
| `ROOT` | `bin/qrspi.mjs:15` and `site/build.mjs:15` | Both files already compute the repo root identically from `import.meta.url`. |

---

## Existing tests

There is **no test framework, no test directory, and no `*.test.*` file** anywhere in
the repository.

| What it covers | Path | How to run it |
|---|---|---|
| Every automated invariant in the repo, including the pipeline-row comparison | `bin/qrspi.mjs` `check()`, lines ~298-570 | `npm test` (== `node bin/qrspi.mjs check`), `package.json:23` |
| That `check` passes on Node 18, 20, 22, 24 without `npm install` | `.github/workflows/ci.yml:20-41` | push / PR |
| That the site builds and the tarball packs | `.github/workflows/ci.yml:45-57` | push / PR; `npm run build:site` and `npm pack --dry-run` |
| Skill-trigger evals (unrelated to the pipeline) | `evals/trigger/qrspi.json`, `token-efficiency.json`, `handoff.json` | the skill-creator harness, per `CONTRIBUTING.md`; not in `package.json#files` |
| Contributor measurement tooling (unrelated) | `scripts/measure-context-cost.mjs`, `scripts/measure-run.mjs` | run by hand; not in `package.json#files` |

---

## Blind spots

Things that could not be determined, and why:

- **Whether `npx qrspi check` is ever run from an installed tarball in a way that would
  break on a missing module.** The failure mode is inferred from `package.json#files`
  (`package.json:9-17`) and the `bin` entry (`package.json:6-8`); it was not reproduced
  by packing and running.
- **Whether any consumer other than `site/build.mjs` reads the README's first fenced
  block.** The repo was searched for further copies of the diagram; nothing else parses
  it. Two *renderings* of the same phase→artifact mapping exist and are not fenced
  Markdown blocks, so neither parser sees them: `assets/social-preview.html:32` (the OG
  card's `<div>` rows) and the sample row in the comment at `site/build.mjs:82`.
- **Whether GitHub's and npm's Markdown renderers treat a fence with an info string
  differently enough to matter.** Not tested; `00-questions.md` Q5 decided against an
  info string, so it did not need resolving.
- **The exact end line of `check()`.** `bin/qrspi.mjs:569` is its last statement and
  `:570` its closing brace, with `function help()` at `:572`; the opening line was read
  as approximately `:298` and not pinned exactly.

---

## Facts that contradict the assumptions

### THE TWO PARSERS DO NOT CARRY THE SAME ROW SHAPE

The regex literals at `bin/qrspi.mjs:267` and `site/build.mjs:87` are character-for-
character the same rule, but the two functions do not behave the same. `bin/qrspi.mjs:269`
applies `.replace(/^→\s*/, '')` to capture group 2; `site/build.mjs:89` does not.

That strip is load-bearing, because **the three blocks are not drawn the same way.**
Verified byte-for-byte at `8be8a5d`:

- `README.md:20` and `skills/qrspi/SKILL.md:19` — one arrow per row:
  `Questions   ~20k burned    →  00-questions.md   (~3k)`
- `skills/token-efficiency/references/compaction.md:24` — **two** arrows per row:
  `Questions   →  ~20k burned     →  00-questions.md   (~3k)`

With lazy group 2, the regex matches compaction.md's row with
`context = "→  ~20k burned"`. Only the strip at `bin/qrspi.mjs:269` makes it compare
equal to README's `context = "~20k burned"`. The comment at
`bin/qrspi.mjs:257-259` says so explicitly. The site never notices because it parses
`README.md` alone.

Consequence for the single definition (Q1): a shared row parser that is the *site's*
version silently breaks `npm test` on compaction.md; one that is the *installer's*
version changes nothing visible but is the only correct one of the two. Either the shared
definition keeps the strip, or compaction.md's extra arrow has to be addressed — and
touching the diagram's text is listed as out of scope in `00-questions.md`.

### Q2's hedge does not apply: there is no third kind of line today

All three blocks contain exactly 6 content lines, all 6 of which parse as rows. **Zero
blank lines, zero whitespace-only lines, zero header/caption/arrow/continuation lines**,
in any of the three. (`README.md:20-25`, `skills/qrspi/SKILL.md:19-24`,
`skills/token-efficiency/references/compaction.md:24-29`.) Q2 anticipated finding a line
of a third kind that would have to be folded into the row definition; there is none.

### The two block selectors are not two phrasings of one rule — they take different inputs

- `pipelineRows` (`bin/qrspi.mjs:261-263`) is handed a **whole file** and scans all its
  fenced blocks for one containing `00-questions.md`.
- `parsePipeline` (`site/build.mjs:83`) is handed an **already-extracted block**.
  Selection happened earlier, in `parseIntro` (`site/build.mjs:70-80`), which first
  filters out every line opening or closing an HTML `p`/`img`/`div`/`a`/`picture`/`source`
  tag (`site/build.mjs:72-75`) — because the README opens with an HTML logo block — and
  only then takes the first bare fence in the text before the first `##`.

So a shared block-selection rule (Q3) has to reconcile two different call shapes and the
site's HTML pre-filter, not merely unify two regexes.

### `check` has no `path:line` precedent

Q9's default assumes the message follows "the style the rest of `check` already uses".
No message in `check` carries a line number; the established form is
`` `${file}: <prose>` `` (`bin/qrspi.mjs:304`, `:311`, `:527`, `:537`). A `path:line`
prefix would be the first of its kind in the file.

### Partly wrong premise: the existing comparison is not blind to a missing row

`bin/qrspi.mjs:544` loops to `Math.max(canonical.rows.length, copy.rows.length)` and
reports `(missing)` for the short side, so a row dropped from **one** file already fails.
The gap is narrower than "CI only logs the count": it is a row malformed (or deleted) the
**same way in all three** files, which parses to three equal shorter lists.

---

## Review notes

Added at review (2026-10-11, Allan Nava), from the parallel Research run with Haiku 5.5
subagents (#140):

- `bin/qrspi.mjs` is **611** lines (corrected above from 570); the top-level
  `switch (cmd)` that runs the CLI on load is at `bin/qrspi.mjs:590`.
- `package.json#files` lists `bin` as a **whole directory** (`package.json:9-17`), so a new
  module placed under `bin/` ships in the npm tarball with no `files` edit.
- The #99 local-path scan in `check` walks `bin/` (`bin/qrspi.mjs:518-527`) and exempts
  only `bin/qrspi.mjs` itself, so a new `bin/*.mjs` is scanned by it.

## Targeted round — 2026-10-11 (#141)

A second, narrow Research round closing the three items in
`thoughts/141-pipeline-row-parsing/02-design.md` § "More research needed" (lines 216-221).
Facts only; three subagent explorations, output format `path · symbol · max 2 lines`.
Scope was those three questions and nothing else — no part of `02-design.md` other than
its three checkboxes was touched.

### T1 · Nothing styles `.fallback` — the class is decorative

No CSS rule anywhere in the repository matches `.fallback`, bare, compound, descendant,
or inside any `@media` block. `site/build.mjs` carries exactly three occurrences of the
string:

| `site/build.mjs` | what it is |
|---|---|
| `:96` | `renderPipeline(rows, fallback)` — the second parameter's name, a JS identifier |
| `:97` | the emitted `<pre class="fallback">`, in the `!rows` branch; the only place the class reaches markup |
| `:496` | the string `fallback <pre>` inside the final `console.log` build line |

The single inline stylesheet opens at `site/build.mjs:258`. Its pipeline rules are
introduced by the `/* pipeline */` comment at `site/build.mjs:328` — the line
`02-design.md:216` cites, confirmed correct as the block's start marker — and run
`site/build.mjs:329-341`: `.flow`, `.flow-row`, `.flow-row + .flow-row`,
`.flow-row:hover`, `.flow-n`, `.flow-phase`, `.flow-ctx`, `.flow-size`, `.flow-arrow`,
`.flow-out`. Every selector is `.flow*`; none is `.fallback`.

Repo-wide: no committed stylesheet and no rule in `assets/social-preview.html` styles
`.fallback`. The only other occurrence of the string in the tree is prose at
`thoughts/141-pipeline-row-parsing/02-design.md:216`. **Consequence of fact, not a
proposal:** the emitted `<pre class="fallback">` renders today with the browser's
default `pre` styling only.

### T2 · `README.md` and `CONTRIBUTING.md` document the behaviour nowhere

The inventory is empty for the kind that mattered. Neither file states the
skip-a-non-matching-row behaviour, its silence, the three-row threshold, or the `<pre>`
fallback. Zero passages of kind *behaviour* in either file. All prose documenting the
behaviour lives in `CLAUDE.md:327-332` (confirmed verbatim this round: "a row that does
not match is skipped, and if fewer than three match the whole block falls back to a
`<pre>`… reshaping the pipeline block silently drops rows, so re-run the build and look
at the output") and `CLAUDE.md:275` (confirmed: the sentence listing what `check`
validates, "pipeline diagram across the three files that draw it"), plus the comments
inside `site/build.mjs` itself.

What the two files do carry:

| Passage | Kind | What it says |
|---|---|---|
| `README.md:19-26` | — | the parsed fenced block itself (its line range) |
| `README.md:20-25` | format-contract | the six rows are the only statement of the row shape — phase token, 2+ spaces, context, spaced arrow, output, optional parenthesised size — expressed **by example**, never in prose |
| `README.md:25` | format-contract | the Implement row omits the size parenthesis, documenting by example that the trailing group is optional; it is the row closest to failing the regex |
| `README.md:17` | mention | the Q→R→S→P→I phase line in the lede `parseIntro` splits off at the fence; names the pipeline, says nothing about parsing |
| `README.md:28` | mention | "These are the phase's own context" refers back to the block's figures and assumes a rendered diagram |
| `CONTRIBUTING.md:5` | mention | names `site/build.mjs` as the generator of the site from `README.md` |
| `CONTRIBUTING.md:18` | mention | `npm run build:site` in the local loop; output path only |
| `CONTRIBUTING.md:61` | mention | "the pipeline figures in the README" as unverified assertions — about the numbers' truth, not the format or the parser's tolerance |
| `CONTRIBUTING.md:330` | format-contract | tells contributors to rebuild and eyeball after editing `README.md`, and states one parsing contract explicitly (hero = first prose paragraph) |

Counts: `README.md` 4 passages (plus the block range), `CONTRIBUTING.md` 4 passages,
0 of kind *behaviour* in either.

### T3 · Reproduced by packing: `bin/pipeline.mjs` would ship and resolve — but `check` already exits 1 inside the tarball

Run from `/home/allan/projects/qrspi-141` on 2026-10-11, into two fresh empty
directories (pack destination, then extraction):

- `npm pack` → exit **0**, `qrspi-0.8.0.tgz`, 41 files, 62.0 kB packed / 171.0 kB
  unpacked. No warning about files on stderr; only the `npm notice` manifest block.
- `package.json:10` lists `bin` as the bare directory name inside `files`
  (`package.json:9-17`), not a glob or a per-file list, so npm packs the directory
  recursively. There is no `.npmignore`; `.gitignore:1-3` lists only `node_modules/`,
  `site/dist/` and `*.tgz`, nothing under `bin/`, and `files` governs regardless.
- The tarball carries exactly one path under `bin/`: `package/bin/qrspi.mjs`. Top level:
  `package/LICENSE`, `package/package.json`, `package/README.md`.
- The extracted layout keeps `bin/` as a real directory beside `qrspi.mjs`. The package
  is `"type": "module"` (`package.json:5`) with `"bin": {"qrspi": "bin/qrspi.mjs"}`
  (`package.json:6-8`), and `bin/qrspi.mjs:15` resolves `ROOT` from
  `dirname(fileURLToPath(import.meta.url))`, so the script's own directory is the
  sibling-resolution base in the extracted package too. A positive control — a `.mjs`
  importing `./pipeline.mjs` from its own directory — resolved and executed.
- Negative control, today: resolving `./pipeline.mjs` from inside the extracted package
  fails with `ERR_MODULE_NOT_FOUND`, because the module does not exist yet.

**So: (a) a new `bin/pipeline.mjs` ships in the npm tarball with no `package.json#files`
edit; (b) a sibling `./pipeline.mjs` specifier from `bin/qrspi.mjs` resolves inside the
extracted tarball.** This confirms the `01-research.md` "Review notes" inference
(`bin` packed as a whole directory) by reproduction rather than by reading `files`.

The reproduction also turned up a fact the item did not ask for, recorded because it
invalidates "pack and run `check`" as a verification step:

- `node bin/qrspi.mjs check`, run from inside the extracted `package/` directory, exits
  **1**. Its entire output is one line, verbatim:
  `x marketplace.json: plugin qrspi-pane has no .claude-plugin/plugin.json under ./plugins/qrspi-pane`
- The same command in the repository exits **0**
  (`ok — 3 skills, 3 commands (+3 Codex forms), 7 references, manifests in sync`), so the
  failure is a property of the tarball, not of the code: `plugins/qrspi-pane` is
  deliberately absent from `package.json#files` while `bin/qrspi.mjs:319-326` walks
  every plugin `.claude-plugin/marketplace.json` lists and pushes a problem for each
  `source` directory it cannot find (`bin/qrspi.mjs:323`). The comment immediately above
  it, `bin/qrspi.mjs:317-318`, states that qrspi-pane stays out of the npm package —
  the exclusion is intended, the check does not account for it.
- Therefore `check` cannot today be used as a pass/fail oracle *inside* a packed
  tarball; a `bin/pipeline.mjs` invariant verified that way would be read against an
  exit code that is already 1 for an unrelated reason. Stated as an observation only —
  no fix proposed here, and it is outside `02-design.md`'s scope as written.

## Status

- [x] Research complete
- [x] Self-contained (explicit paths, no reference to session context)
- [x] Zero solution proposals
- [x] Reviewed (2026-10-11, Allan Nava — "si procedi con sonnet", in the Claude Code session driving this run; one fact corrected, three added under Review notes)

> **Compression ratio:** ~75k burned → ~5k artifact = ~15×
> Next phase: **Design**. It receives: this file + `00-questions.md` + the ticket.
