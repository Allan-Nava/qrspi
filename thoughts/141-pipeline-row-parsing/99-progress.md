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
| S2 | ⬜ todo | — | — | unblocked — the interface it is written against now exists |
| S3 | ⬜ todo | — | — | unblocked; runs in parallel with S2, ideally in a separate worktree |
| S4 | ⬜ todo | — | — | blocked on S2 ‖ S3 |
| S5 | ⬜ todo | — | — | blocked on S2 ‖ S3 |
| S6 | ⬜ todo | — | — | blocked on S2 ‖ S3 |
| S7 | ⬜ todo | — | — | last, on the pushed branch |

Legend: ⬜ todo · 🔄 in progress · ✅ done · ⏸️ blocked · ❌ failed

---

## Where I left off

**Current step:** S1 — complete and committed. Next is **S2 ‖ S3**.

**Done so far:**
- `bin/pipeline.mjs` — new file, 64 lines, exactly the text given in `04-plan.md` § S1
  → Changes. Exports `readPipeline` and nothing else; contains no `import` statement and
  no top-level statement other than `const ROW`, `const MARKER` and the two function
  declarations. Both arrows (the `ROW` regex and the strip in `readBlock`) verified to be
  U+2192 by `od -c`: `342 206 222`.
- Branch `fix/141-pipeline-rows`, two commits on top of `8be8a5d`:
  - `5d5e0d7` `141: QRSPI artifacts for the pipeline row parsing fix` — `thoughts/` first
    in the branch, per `skills/qrspi/references/landing.md` § "Does thoughts/ ship in the
    same PR"
  - `ef94760` `141 S1: bin/pipeline.mjs — one definition of the pipeline grammar`

**Next concrete action:**
- Start S2 (`04-plan.md` § S2 — `bin/qrspi.mjs` calls the module and names each refused
  line) and S3 (§ S3 — the site calls the module) in fresh sessions. They touch different
  files; in one checkout their negative tests must not run at the same time, because both
  `sed -i README.md`.

**Modified but uncommitted files:**
- none — `git status --porcelain` is empty.

---

## Discoveries

Things found along the way that were not in the plan. **Do not fix them here** — they
go to a follow-up or a replanning round.

| # | Discovery | Path | Action |
|---|---|---|---|
| 1 | The plan's Verify-2 command writes its case script with a `cat > "$S/cases.mjs" <<'EOF'` heredoc. The Claude Code Bash sandbox refuses that heredoc — it holds `${A}` inside backticks ("brace with quote character") — and also refuses `node … ; echo "exit=$?"` as multiple operations. Write the script with the Write tool instead and run `node <abs path to script> "$PWD/bin/pipeline.mjs"` on its own; the exit status is the tool's own success. The test content ran unchanged, so this is an executor-environment note, not a plan error. S2's T-cases and S3's U-cases use the same heredoc shape and will hit it too | `04-plan.md` § S1/S2/S3 → Verify | ignore (note for the S2/S3 executors) |
| 2 | `npx qrspi check`'s #99 local-path scan does **not** walk `thoughts/` — `scanDirs` at `bin/qrspi.mjs:518` lists `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `assets`, `commands`, `skills`, `evals`, `scripts`, `site/build.mjs`, `bin`, `.github`. So committing `thoughts/` cannot trip it, and the plan's "neither new nor edited code may carry one" applies to `bin/pipeline.mjs` (it carries none) | `bin/qrspi.mjs:518` | ignore |

---

## Deviations from the plan

None. S1 was executed literally: the module is the plan's text verbatim, and all three
Verify commands were run as written apart from Discovery 1's mechanical substitution for
the blocked heredoc.

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

---

## Context budget

| Session | Step | Peak context | Note |
|---|---|---|---|
| 2026-10-11 | S1 | ~10% | Read `04-plan.md` § S1 and § Minimum context only, plus `99-progress.md`; `grep -n`/`sed -n` for the two `bin/qrspi.mjs` regions consulted (`:510-540`). No upstream artifact read, no whole file `cat`-ed. Well under the 40% rule |
