# 01 · Research — 148 The ticket reaches Research through 00-questions.md

**Written against:** `e749e13`

This is the most expensive phase and the one with the highest compression ratio
(~30-50×). It is also the one that most needs subagents.

---

## Reference questions

From `00-questions.md` — the answers that steer this research:

- Q1 → the task ID and a short neutral title (directory slug, artifact H1) may reach Research; the ticket body, its link, and anything stating what is wanted or when it is done may not.
- Q2 → the verbatim ticket copy is removed and the Questions phase is told not to restate the ticket's goals or claims as facts; residual paraphrase is accepted, not checked.
- Q3 → task directories in the old layout (ticket inside `00-questions.md`) must still advance with `/qrspi:next`, which then warns that Research will see the ticket; no migration.
- Q4 → if the ticket gets its own file, it is plain input: no Status block, not gated, not counted as a phase; `npm test` knows it exists and checks only copy-safety.
- Q5 → Design reads the ticket and carries its done-when into the Design artifact; Structure and Plan read only their upstream artifacts.
- Q6 → proof is both a static `npm test` assertion (templates and Research prompt carry no ticket section and do not point at it) and one real Research run checked in its transcript.
- Q7 → a ticket URL given to `/qrspi:new` is stored with the ticket, never where Research reads; Questions and Design fetch it.
- Q8 → Codex twins `skills/qrspi-new`, `skills/qrspi-next`, `skills/qrspi-review` mirror their commands; `npm test`'s step-list comparison covers them.
- Q9 → `/qrspi:review` reads the ticket for Design and later artifacts, never for Questions' answers or Research.

---

## Map of the territory

All paths are relative to the repo root `/home/allan/projects/qrspi`. The plugin is
markdown (commands, skills, phase templates) plus one Node CLI, `bin/qrspi.mjs`,
whose `check` subcommand is `npm test` (`package.json:23`).

### Components involved

| Area | Path | Role |
|---|---|---|
| Phase templates | `skills/qrspi/references/00-questions.md` … `04-plan.md`, `05-implement.md`, `99-progress.md` | Each numbered file is both the phase prompt (a `> **PROMPT` blockquote) and the artifact skeleton. `05-implement.md` is a prompt only. There is no `templates/` dir. |
| Review rubric | `skills/qrspi/references/reviewing.md` | Per-artifact sections (`### 00-questions.md` :23, `### 01-research.md` :32, `### 02-design.md` :47, `03` :64, `04` :74, `99` :89). |
| Workflow skill | `skills/qrspi/SKILL.md` | Rules and the phase table saying what each phase reads. |
| `/qrspi:new` | `commands/new.md`, Codex twin `skills/qrspi-new/SKILL.md` | Bootstraps `thoughts/<dir>/` from the templates and runs Questions. |
| `/qrspi:next` | `commands/next.md`, Codex twin `skills/qrspi-next/SKILL.md` | Detects the current phase from the artifacts and emits the next phase prompt. |
| `/qrspi:review` | `commands/review.md`, Codex twin `skills/qrspi-review/SKILL.md` | Reviews one artifact against `reviewing.md`. |
| CLI / test harness | `bin/qrspi.mjs` | `install` / `uninstall` / `path` / `check` (dispatch :598-622). |
| Pipeline grammar | `bin/pipeline.mjs` | Parses the pipeline diagram in three docs; marker string `00-questions.md` (:23). |
| Pane plugin | `plugins/qrspi-pane/hooks/register.tsx` | Read-only status pane; hardcoded `PHASES` (:10-15) mapping Q/R/D/S/P to `00`…`04` files, plus `99-progress.md` (:83). |
| User docs | `README.md`, `AGENTS.md`, `CLAUDE.md`, `site/` | Describe the "ticket stays out of Research" rule. |

### Entry points

| Symbol | Path:line | What it does |
|---|---|---|
| Questions PROMPT | `skills/qrspi/references/00-questions.md:9` | "Input: the ticket text below. Nothing else."; `TICKET:` block with `<paste the Linear/Jira ticket here>` at :25-26. |
| `## Ticket` section | `skills/qrspi/references/00-questions.md:34-40` | Placeholders `**ID:**`, `**Link:**`, `**Title:**`, then `<ticket text>` (:40). This section survives in the artifact after the PROMPT is stripped. |
| Out of scope intro | `skills/qrspi/references/00-questions.md:62` | "Things the ticket might suggest but that we are not doing". |
| Questions → Research handoff | `skills/qrspi/references/00-questions.md:74-75` | "The ticket is not passed to Research — only the questions and their answers." |
| Research PROMPT input | `skills/qrspi/references/01-research.md:9-11` | Input is `00-questions.md`; "The ticket text is deliberately withheld". |
| Research → Design handoff | `skills/qrspi/references/01-research.md:127` | "Design. It receives: this file + `00-questions.md` + the ticket." |
| Design PROMPT input | `skills/qrspi/references/02-design.md:9` | Input `00-questions.md`, `01-research.md`, "and now also the original ticket". |
| Design header | `skills/qrspi/references/02-design.md:38` | `**Ticket:** <ENG-1234> · <url>` placeholder. |
| Later handoffs | `02-design.md:123`, `03-structure.md:114`, `04-plan.md:151` (all under `skills/qrspi/references/`) | Structure gets `02` only; Plan gets `03` + `02`; Implement gets `04` + `99`. None names the ticket. |
| Plan acceptance criteria | `skills/qrspi/references/04-plan.md:119` | `### Acceptance criteria` section; no template line mentions a ticket "done when". |
| `/qrspi:new` args | `commands/new.md:3,9-12` | `<TASK-ID> [ticket text, URL, or nothing]`; first token is the ID, the rest is ticket text or URL. |
| `/qrspi:new` copy step | `commands/new.md:20-26` | `cp` of `00-questions,01-research,02-design,03-structure,04-plan,99-progress` from `${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/` into `thoughts/<dir>/`. |
| `/qrspi:new` ticket write | `commands/new.md:30-33` | Strips PROMPT, replaces H1, "replace the `## Ticket` placeholders with the real ID, link, title, and body". |
| `/qrspi:new` no-ticket path | `commands/new.md:17-18` | Dir slug is a kebab summary of the ticket; with no ticket, ID alone and ask the user before step 4. |
| `/qrspi:new` closing | `commands/new.md:49` | "Research must not inherit this session's context — or the ticket text." |
| `/qrspi:new` tools | `commands/new.md:4` | `allowed-tools`: mkdir, cp, ls, Read, Write, Edit — no fetch tool; no step fetches a URL. |
| Codex `new` twin | `skills/qrspi-new/SKILL.md:4,18-21,26-27,29-34,41-42,45,58` | Same content; copies from `"$SKILL_DIR/../qrspi/references/"`. |
| Phase detection | `commands/next.md:12-27` | `ls` the task dir; a file is complete when `## Status` boxes are ticked and no `<...>` / `_(to be filled` remain; awk counts `[ ]` under `## Status` in `0*.md`. |
| Next-phase prompt emission | `commands/next.md:33-39` | Extracts only the `> **PROMPT` block of `skills/qrspi/references/<NN>-<phase>.md`. |
| Phase input table | `commands/next.md:45-47` | Questions: the ticket; Research: `00` — "never the ticket"; Design: `00` + `01` + the ticket. |
| Gates | `commands/next.md:100-101` | Refuses to advance on placeholders, unticked boxes, or non-empty "More research needed". |
| Codex `next` twin | `skills/qrspi-next/SKILL.md:27-36,54-56` | Same detection and table, ~9-line offset. |
| Review inputs | `commands/review.md:12-31` | Loads `reviewing.md`; reads only the target file; spot-checks `path:line` for `01`/`02`/`04`; "do not read the upstream artifacts wholesale". The word "ticket" does not appear. Twin `skills/qrspi-review/SKILL.md` same. |

---

## Existing patterns and conventions

### Template = prompt + skeleton, stripped on copy

- **Where:** `skills/qrspi/references/0*.md`; strip step `commands/new.md:30-33`; emission `commands/next.md:33-39`.
- **How it works:** the `> **PROMPT` blockquote is the phase prompt; `/qrspi:new` copies the file and deletes the blockquote, leaving the skeleton. `/qrspi:next` later re-reads only the blockquote from the plugin copy.
- **Who already uses it:** all five artifact templates `00`–`04`; `05-implement.md` is prompt-only and not copied.

### Phase = numbered file with a `## Status` block

- **Where:** `bin/qrspi.mjs:357` (`isPhase` = `/^\d\d-.*\.md$/`), `:450-467`; runtime detection `commands/next.md:12-27`.
- **How it works:** every numbered reference except `05-implement.md` and `99-progress.md` must have `## Status`, `- [ ]`, and a human box ending in `<who>`. `/qrspi:next` judges phases by `0*.md` files only.
- **Who already uses it:** `00-questions.md:71` (Reviewed by a human), `01-research.md:124`, `02-design.md:119,121`, `03-structure.md:112`, `04-plan.md:149`. A non-numbered name (e.g. `reviewing.md`, `recovery.md`) is treated as a guide, not a phase.

### "Next phase … It receives:" handoff line

- **Where:** the last line of each template's Status (`00-questions.md:74`, `01-research.md:127`, `02-design.md:123`, `03-structure.md:114`, `04-plan.md:151`).
- **How it works:** a prose line naming the next phase's inputs; not parsed by code.
- **Who already uses it:** the same input list is restated in `skills/qrspi/SKILL.md:50-55` and `commands/next.md:45-47` / `skills/qrspi-next/SKILL.md:54-56`.

### Command / Codex-twin mirroring

- **Where:** `bin/qrspi.mjs:406-448` (step-title compare :440-447, `stepTitles` :413).
- **How it works:** `commands/<name>.md` and `skills/qrspi-<name>/SKILL.md` must have identical ordered step titles (`N. **Title**` or `## N. Title`); body text is not compared. Twins must not use `${CLAUDE_PLUGIN_ROOT}` (:426).
- **Who already uses it:** `new`, `next`, `review`. Contributor rule restated at `CLAUDE.md:175-176`, `AGENTS.md:106-107`.

### Regression checks keyed to issue numbers

- **Where:** `bin/qrspi.mjs:469-513` (#97, #98, #126, #122, #111, #112).
- **How it works:** string presence/absence assertions on templates and on `commands/next.md` + its twin (e.g. `**Written against:**` in `00`–`04` and in `next.md`, :501-513).
- **Who already uses it:** each block cites its issue in a comment or message.

---

## Constraints

| Constraint | Source | Impact |
|---|---|---|
| Hardcoded template list for the simulated `/qrspi:new` copy | `bin/qrspi.mjs:371` (and `:504`) | Lists `00`–`04` only; after stripping the PROMPT each must keep `## Status`, a `[ ]` and a placeholder. |
| Directory-driven phase lists | `bin/qrspi.mjs:359,452` | Any new `NN-*.md` under `skills/qrspi/references/` is treated as a phase and must carry PROMPT + Status + human box. |
| `/qrspi:new` copies an explicit file list | `commands/new.md:20-26`, `skills/qrspi-new/SKILL.md:29-34` | Not `*.md`; a file not in the brace list is not copied. |
| Copy-mode install rewrites only `${CLAUDE_PLUGIN_ROOT}/skills` | `bin/qrspi.mjs:107` (`rewritePluginRoot`), `:393-404` | Every `${CLAUDE_PLUGIN_ROOT}` in a command must be followed by `/skills`. Templates ship inside `skills/qrspi/references` (`copyInstall` :111-147); no separate template copy. |
| Phase detection reads `0*.md` | `commands/next.md:26-27` | A file outside that glob is invisible to the Status-box count. |
| Pane hardcodes phase files | `plugins/qrspi-pane/hooks/register.tsx:10-15,71-86` | Reads only `00`–`04` and `99-progress.md`; skips a dir with none of them (:82). |
| Pipeline diagram consistency | `bin/qrspi.mjs:261,530-563`; `bin/pipeline.mjs:19,23,49-67` | `README.md`, `skills/qrspi/SKILL.md`, `skills/token-efficiency/references/compaction.md` diagrams must match row by row (key = phase\|context\|output\|size); README is canonical. |
| Effort tables agree | `bin/qrspi.mjs:265-283,565-572` | `skills/qrspi/SKILL.md`, `commands/next.md`, `token-efficiency/references/effort.md` per-phase effort must match. |
| SKILL.md length cap | `bin/qrspi.mjs:333-348` | `skills/qrspi/SKILL.md` must stay ≤150 lines. |
| No absolute home paths | `bin/qrspi.mjs:515-528` | `/home/x/`, `/Users/X`, `file:///` forbidden in scanned docs/code. |
| `/qrspi:review` reads only the target | `commands/review.md:18-31` | No current step reads the ticket or any upstream artifact. |

---

## Reuse candidates

| What | Path | Note |
|---|---|---|
| String-assertion check blocks | `bin/qrspi.mjs:469-513` | Existing shape for "file X contains / does not contain Y" regressions on templates and `next.md` + twin. |
| Simulated `/qrspi:new` copy | `bin/qrspi.mjs:364-391` | Already strips the PROMPT and inspects the resulting artifact text for `00`–`04`. |
| Step-title twin compare | `bin/qrspi.mjs:413,440-447` | Covers `new`/`next`/`review` twins. |
| Phase input table | `commands/next.md:45-47`, `skills/qrspi-next/SKILL.md:54-56`, `skills/qrspi/SKILL.md:50-55` | Single places stating each phase's inputs. |
| Run measurement from transcripts | `scripts/measure-run.mjs` | Reads `~/.claude/projects` JSONL transcripts; no API key. |

---

## Existing tests

| What it covers | Path | How to run it |
|---|---|---|
| All static checks (templates, twins, manifests, pipeline, effort, paths) | `bin/qrspi.mjs:287-581` (`check`) | `npm test` (= `node bin/qrspi.mjs check`) |
| CI: check on Node 18/20/22/24, then `install --copy` / `uninstall` into `$RUNNER_TEMP/claude` | `.github/workflows/ci.yml` (check job) | GitHub Actions on push/PR |
| CI: site build, `npm pack --dry-run`, check from unpacked tarball | `.github/workflows/ci.yml` (site job) | GitHub Actions |
| Skill trigger evals | `evals/trigger/{qrspi,token-efficiency,handoff}.json` | No runner script in the repo. |
| Transcript measurement | `scripts/measure-run.mjs` | `node scripts/measure-run.mjs` |

---

## Blind spots

- Whether `site/` sources restate the phase inputs (the subagent searched for "ticket" in `site/` and reported no hits that state storage or readers; built output not checked).
- `.github/workflows/pages.yml` and `release.yml` were not read.
- Whether any user-facing doc besides `README.md:93,97,141-142`, `AGENTS.md:139`, `CLAUDE.md:137`, `skills/token-efficiency/references/{anti-patterns.md:14,compaction.md:45,51-53}`, `skills/handoff/references/load-bearing.md:33` and `plugins/qrspi-pane/hooks/register.tsx:151` mentions the ticket's location — the grep was capped at ~30 hits.
- `skills/qrspi/references/recovery.md` was only seen at :44 ("reads its normal" inputs); its full re-entry rules were not mapped.
- The exact shape of `commands/next.md`'s warning/refusal text for unusual directory layouts (e.g. extra files) was not mapped beyond :12-27 and :100-101.
- No real Research transcript was inspected (that is the run Q6 describes, not this phase's job).

---

## Facts that contradict the assumptions

- **THE "TICKET STAYS OUT OF RESEARCH" RULE IS STATED, BUT THE TICKET IS PHYSICALLY INSIDE RESEARCH'S ONLY INPUT.** `/qrspi:new` writes the ticket's ID, link, title and full body into the `## Ticket` section of `00-questions.md` (`commands/new.md:30-33`, template `skills/qrspi/references/00-questions.md:34-40`), and Research's input is `00-questions.md` (`skills/qrspi/references/01-research.md:9`, `commands/next.md:46`). The old-layout task `thoughts/141-pipeline-row-parsing/00-questions.md:10` shows the `## Ticket` section in practice.
- **`/qrspi:review` NEVER READS THE TICKET TODAY** (`commands/review.md` has no occurrence of "ticket"; it reads only the target artifact, :18-31). Q9's default presumes a ticket read for Design and later that does not exist.
- **NOTHING FETCHES A TICKET URL TODAY.** `commands/new.md:4` grants no fetch tool, and neither `new` nor its twin fetches; a URL is only written into the `**Link:**` placeholder. Q7's "Questions and Design fetch it" has no existing mechanism.
- **NO TEMPLATE CARRIES A "DONE WHEN" FROM THE TICKET.** `02-design.md` has only a `**Ticket:** <ENG-1234> · <url>` header (:38); `04-plan.md:119` has acceptance criteria with no link to the ticket. Q5's carry-forward has no existing slot.
- Observed (not read): this task's own directory already holds a separate `thoughts/148-ticket-out-of-research/ticket.md` and its `00-questions.md` has no `## Ticket` section — a layout no shipped template, command or check (`bin/qrspi.mjs:371`, `commands/new.md:20-26`, `register.tsx:10-15`) knows about.

---

## Status

- [x] Research complete
- [x] Self-contained (explicit paths, no reference to session context)
- [x] Zero solution proposals
- [x] Reviewed (2026-11-16, Allan Nava)

> **Compression ratio:** not measured in this session (four `low`-effort Explore subagents did the reading).
> Next phase: **Design**. It receives: this file + `00-questions.md` + the ticket.
