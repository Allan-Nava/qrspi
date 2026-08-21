# AGENTS.md

Instructions for any coding agent working in this repository.
Claude Code users: see [CLAUDE.md](CLAUDE.md) for the longer version — this file is
the vendor-neutral subset and the two must agree.

## Project

`qrspi` is a **Claude Code plugin** distributed as Markdown and JSON. No source code,
no build step, no tests, no dependencies. The deliverable is prompt text.

It implements QRSPI — Questions → Research → Spec (Design + Structure) → Plan →
Implement — a phase-gated workflow where each phase writes one self-contained
artifact to disk and the next phase starts from a fresh session reading only that
artifact ("intentional compaction"). A second skill, `token-efficiency`, documents
the reasoning: measurement, compaction ratios, subagents as context firewalls, effort
allocation, prompt caching, tool hygiene, KPIs.

## Layout

| Path | Role |
|---|---|
| `.claude-plugin/plugin.json` | plugin manifest |
| `.claude-plugin/marketplace.json` | marketplace manifest (`source: "./"`) |
| `commands/new.md` | `/qrspi:new` — bootstrap `thoughts/<dir>`, run phase 0, stop |
| `commands/next.md` | `/qrspi:next` — detect phase, gate on quality, emit next prompt |
| `skills/qrspi/SKILL.md` | workflow index: 6 rules, phase table, context budgets |
| `skills/qrspi/references/0*.md` | per-phase prompt **and** artifact template |
| `skills/qrspi/references/99-progress.md` | implement-phase state file template |
| `skills/token-efficiency/` | reference skill, index + 8 reference files |
| `README.md` | user-facing pitch; shares numbers with `skills/qrspi/SKILL.md` |

`skills/qrspi/references/*.md` serve double duty: `/qrspi:new` copies them into the
user's `thoughts/<task-id>-<slug>/` as artifact skeletons, and their top `> PROMPT`
blockquote is the prompt for that phase.

## Build, test, run

None. Validation is manual:

```bash
python3 -m json.tool .claude-plugin/plugin.json     >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
wc -l skills/*/SKILL.md      # indexes stay ~100 lines
```

## Editing rules

- `SKILL.md` is an **index** (~100 lines); detail belongs in `references/`, loaded on
  demand. The skills must practise the context economy they document.
- Skill frontmatter is `name` + `description` only. The description is permanently in
  context, so write trigger conditions, not a summary.
- Do not split the phases into one skill each — this was a deliberate decision; the
  phases are slash commands precisely to keep descriptions out of permanent context.
- Commands reference plugin files via `${CLAUDE_PLUGIN_ROOT}`, never relative paths.
- Keep `allowed-tools` in command frontmatter minimal.
- Artifact templates use `<...>` / `_(to be filled …)_` placeholders and end in a
  `## Status` checkbox block; `commands/next.md` greps for these markers to detect
  phase completion. Do not change the markers in isolation.
- Numbers (context budgets, phase/effort table) appear in `README.md`,
  `skills/qrspi/SKILL.md` and `commands/next.md` — update all three together.
- Keep the version in sync between the two `.claude-plugin/*.json` manifests.
- Style: no emoji, no marketing filler, British-leaning spelling, em-dashes.

## Invariants — do not break

1. Fresh session at every phase boundary; commands emit a prompt and **stop**.
2. The artifact is the only channel between phases.
3. Artifacts are self-contained: repo-root paths, symbols, line numbers.
4. The ticket does not enter Research; it returns in Design.
5. The 40% context rule: stop and compact.
6. Every phase is a human checkpoint — never auto-advance past a gate.

`/qrspi:next` must keep refusing to advance on unresolved placeholders, an open
"More research needed" list, a structure step without a verification command, or a
plan that fails the zero-context test.

## Commit conventions

Conventional Commits (`feat:`, `fix:`, `docs:`), imperative subject, scope optional.
