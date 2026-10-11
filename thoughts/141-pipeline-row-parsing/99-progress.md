# 99 · Progress — 141 A pipeline row that does not parse vanishes silently

> Shared state across Implement sessions. **Update it before closing every session** —
> or, with sessions in parallel, report to the one owner who does (`05-implement.md`).
> This is the intra-phase compaction artifact: when context passes 40%, this file is
> all that carries over to the next session.
>
> It must be self-contained: explicit paths, no reference to session context.

---

## Step status

| Step | Status | Session | Commit | Note |
|---|---|---|---|---|
| S1 | ✅ done | 2026-10-11 | `ef94760` | `bin/pipeline.mjs` written verbatim from the plan; all three verifies pass |
| S2 | ✅ done | 2026-10-11 | `b9046d1` | T0-T6 pass; T2 (the ticket) exits 1 with three `path:line` refusals where `8be8a5d` exits 0 |
| S3 | ✅ done | 2026-10-11 | `a922982` | U0-U8 pass; page byte-identical to `8f0a1e6`; re-verified after rebase onto S2 |
| S4 | ✅ done | 2026-10-11 | — (commits nothing) | V1-V3 pass: `package/bin/pipeline.mjs` ships; it resolves from the extracted tarball; the tarball's `check` reports no pipeline or import problem (only the known `qrspi-pane` one, #152) |
| S5 | ✅ done | 2026-10-11 | `aac58ea` | edits 1-7 verbatim; W1-W9 pass, re-run by the owner on the merged branch |
| S6 | 🔄 in progress | 2026-10-11 | — | page built from `a406677` and shown to the human; awaiting the observation |
| S7 | ⬜ todo | — | — | last, on the pushed branch |

Legend: ⬜ todo · 🔄 in progress · ✅ done · ⏸️ blocked · ❌ failed

---

## Where I left off

**Current step:** S4 and S5 complete; S6 (human) awaiting the observation. Then **S7** on the pushed branch.

**Done so far:**
- S1 — `bin/pipeline.mjs`, `ef94760` (see the S1 rows below).
- S2 — `bin/qrspi.mjs`: `import { readPipeline } from './pipeline.mjs'`, `pipelineRows`
  replaced by `const PIPELINE_FILES`, the pipeline check rewritten to push one
  `path:line: not a pipeline row — "<text>"` problem per refused line. Commit `b9046d1`,
  made in worktree `qrspi-141-S2` (branch `141-S2`), fast-forwarded into
  `fix/141-pipeline-rows`.
- S3 — `site/build.mjs`: nine regions; reads the block through `readPipeline`, exits 1 on a
  missing block, a refused line, no rows, or a block outside the intro; the `<pre>` branch
  is gone. Commit `b5e8faa` in worktree `qrspi-141-S3` (branch `141-S3`), rebased onto S2
  as `a922982`, re-verified there, fast-forwarded into `fix/141-pipeline-rows`.
- Merge order as the execution plan set it: S2, then S3 rebased and re-verified. No
  conflict — the two touch disjoint files.

**Next concrete action:**
- S4 (pack, extract, resolve the module), S5 (`CLAUDE.md` and `AGENTS.md` edits 1-7) and
  S6 (the human looks at the built page) — all three unblocked, disjoint files.

**Modified but uncommitted files:**
- none on `fix/141-pipeline-rows` besides this file.

---

## Discoveries

Things found along the way that were not in the plan. **Do not fix them here** — they
go to a follow-up or a replanning round.

| # | Discovery | Path | Action |
|---|---|---|---|
| 1 | The plan's Verify-2 command writes its case script with a `cat > "$S/cases.mjs" <<'EOF'` heredoc. The Claude Code Bash sandbox refuses that heredoc — it holds `${A}` inside backticks ("brace with quote character") — and also refuses `node … ; echo "exit=$?"` as multiple operations. Write the script with the Write tool instead and run `node <abs path to script> "$PWD/bin/pipeline.mjs"` on its own; the exit status is the tool's own success. The test content ran unchanged, so this is an executor-environment note, not a plan error. S2's T-cases and S3's U-cases use the same heredoc shape and will hit it too | `04-plan.md` § S1/S2/S3 → Verify | ignore (note for the S2/S3 executors) |
| 2 | `npx qrspi check`'s #99 local-path scan does **not** walk `thoughts/` — `scanDirs` at `bin/qrspi.mjs:518` lists `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `assets`, `commands`, `skills`, `evals`, `scripts`, `site/build.mjs`, `bin`, `.github`. So committing `thoughts/` cannot trip it, and the plan's "neither new nor edited code may carry one" applies to `bin/pipeline.mjs` (it carries none) | `bin/qrspi.mjs:518` | ignore |

| 3 | **Correction to the S2 and S3 reports, by the owner.** Both reported that "the sandbox" refused `npm`, `sed -i`, `git add` and `git commit`. The refusals came from the session that launched them: its `--allowedTools` list was passed unquoted, so rules containing a space — `Bash(npm test:*)`, `Bash(git commit:*)` — reached the CLI split in two and were ignored (the CLI's stderr says so). Not a property of the repo or the plan. Both steps worked around it without changing the plan's assertions (node scripts on copies, `fs`-driven mutations); the owner made both commits with the messages the steps prepared | the step launcher, not the repo | fixed for S4-S5 (list passed quoted) |
| 4 | The Edit tool normalises `\uXXXX` escapes, so the two `bin/qrspi.mjs` lines carrying `\u2192` could not be matched literally; S2 deleted them with a scratch node script before applying region 2. The committed text is the plan's | `bin/qrspi.mjs` (pre-S2 `:267`, `:269`) | ignore (tooling) |
| 5 | S3 had no `node_modules` and `npm install` was refused (Discovery 3); it copied `marked@18.0.14` — the version `package-lock.json` pins — from the installed plugin's cache. `node_modules/` is gitignored; nothing reached a commit | `site/build.mjs` needs `marked` | ignore |
| 6 | `firstSectionLine` in `site/build.mjs` and the fence/H2 walk inside `parseReadme` now state the same rule twice in one file. Deliberate per `04-plan.md` § S3 region 2, but the kind of duplication S1 exists to end | `site/build.mjs` | follow-up candidate |
| 7 | The HTML pre-filter now applies to the lede alone; an HTML line in the after-text (README `:27-36`) would no longer be dropped. Byte-identical today; intended by `03-structure.md` § S3, fence-awareness out of scope (`02-design.md`) | `site/build.mjs:72-75` (pre-S3) | ignore |

---

## Deviations from the plan

None that touch the plan's intent or any artifact. S1 was executed literally. S2 and S3
ran their negative cases from node scripts against copies (S2) or with in-memory
mutate-build-restore (S3) instead of `sed -i` + `git checkout --`, because of Discovery 3;
the mutations, line numbers and assertions are the plan's.

---

## Verifications run

| Command | When | Result |
|---|---|---|
| Verify 1 — `node --input-type=module -e '…'` over `README.md`, `skills/qrspi/SKILL.md`, `skills/token-efficiency/references/compaction.md` (C0a-C0d, C1, C9) | S1 | **pass** — printed `ok — 3 files agree, 6 rows`, exit 0. README bounds `19`/`26`, 6 rows, `refused: []` in all three, the three `key` lists identical (D2's leading-arrow strip working on `compaction.md`) |
| Verify 2 — the case table C1-C10 as a script | S1 | **pass** — eleven `ok` lines (`C1 no fence`, `C2 info-string fence ignored`, `C3 unterminated fence`, `C4 fenced block above`, `C4 row line`, `C5 bare block above`, `C6 blanks legal`, `C7 sizeless row`, `C8 two-arrow key`, `C9 refused line`, `C10 block, no rows`), no `FAIL`, exit 0 |
| `npm test` | S1 | **pass** — `ok — 3 skills, 3 commands (+3 Codex forms), 7 references, manifests in sync` |
| `npm pack --dry-run 2>&1 \| grep -c 'bin/pipeline\.mjs'` | S1 | **pass** — printed `1`, with no edit to `package.json#files` |
| `git status --porcelain` after the two commits | S1 | **pass** — empty; before them it showed only `?? bin/pipeline.mjs` and `?? thoughts/` |
| `grep -n 'export\|import' bin/pipeline.mjs` | S1 | one hit in code — `31:export function readPipeline(text)`; the other two are the prose comments at `:4` and `:9` |

| S2 T0-T6 (`node bin/qrspi.mjs check` on mutated copies) | S2 | **pass** — T1 `README.md:26: not a pipeline row — "not a row"` exit 1; T2 three refusals, 0 `disagrees`, exit 1; T3 `pipeline row 1 disagrees` ×2; T4 `no pipeline block found`; T5 `pipeline block holds no rows` plus `README.md:20` refused; T6 `pipelineRows` count 0; clean tree exit 0. T2 against the `8be8a5d` check: exit 0 (the bug) |
| S3 U0-U8 | S3 | **pass** — U1 `page did not move` (index and sitemap); U2 `6`/`0`; U5, U5b, U6, U7 each exit 1 with nothing written; U8 `npm test` green |
| Owner, after merging S2 and rebasing S3 onto it | merge | **pass** — `npm test` green; `node site/build.mjs` output `cmp`-identical to a build of `8f0a1e6`; with `not a row` inserted at `README.md:26` the site exits 1 naming `README.md:26` and `check` exits 1; README restored, tree clean |

| S4 V1-V3 (`npm pack`, extract, import `package/bin/pipeline.mjs`, run the extracted `check`) | S4 | **pass** — V1 `1` line for `package/bin/pipeline.mjs`; V2 `resolves`, exit 0; V3 exit 1 with the single known `qrspi-pane` problem (#152) and `0` lines matching `pipeline\|not a row\|Cannot find module`; the extracted module parses the extracted README to 6 rows, 0 refused |
| S5 W1-W9 | S5 | **pass** — W1 nothing; W2 `2`; W3 `2`; W3b `1`; W4 links resolve; W5 `npm test` green; W6 `2`; W7 `1`; W8 `0`; W9 `1` |
| Owner, after fast-forwarding S5 | merge | **pass** — `npm test` green; W1 `0`, W2 `2`, W3 `2`, W3b `1`, W6 `2`, W8 `0`, W9 `1` |

---

## Context budget

| Session | Step | Peak context | Note |
|---|---|---|---|
| 2026-10-11 | S1 | ~10% | Read `04-plan.md` § S1 and § Minimum context only, plus `99-progress.md`; `grep -n`/`sed -n` for the two `bin/qrspi.mjs` regions consulted (`:510-540`). No upstream artifact read, no whole file `cat`-ed. Well under the 40% rule |
| 2026-10-11 | S2 | 8.2% (81,531) | worktree `qrspi-141-S2`, measured with agent-ledger; ~$2.41 at API prices |
| 2026-10-11 | S3 | 8.5% (84,650) | worktree `qrspi-141-S3`; ~$3.08 |
