# AGENTS.md

Instructions for any coding agent working in this repository — Codex CLI reads this
file. Claude Code users: see [CLAUDE.md](CLAUDE.md) for the longer version; this file
is the vendor-neutral subset and the two must agree.

## Project

`qrspi` is a **Claude Code and Codex CLI plugin** distributed as Markdown and JSON. No
build step, no dependencies. The deliverable is prompt text; the only executable file
the package ships is `bin/qrspi.mjs`, the `npx qrspi` installer.

It implements QRSPI — Questions → Research → Spec (Design + Structure) → Plan →
Implement — a phase-gated workflow where each phase writes one self-contained artifact
to disk and the next phase starts from a fresh session reading only that artifact
("intentional compaction"). It ships three skills and three commands:

- `skills/qrspi/` — the workflow index and the phase references.
- `skills/token-efficiency/` — the reasoning: measurement, compaction ratios, subagents
  as context firewalls, effort allocation, prompt caching, tool hygiene, KPIs.
- `skills/handoff/` — how to write an artifact that survives a context reset; it
  triggers outside QRSPI too.
- `commands/new.md`, `next.md`, `review.md` — `/qrspi:new`, `/qrspi:next`,
  `/qrspi:review` in Claude Code. Codex has no slash commands, so each has a twin skill
  in `skills/qrspi-new/`, `qrspi-next/`, `qrspi-review/`, invoked by name
  (`$qrspi:qrspi-new`) and hidden from Claude Code (`user-invocable: false`).

## Layout

| Path | Role |
|---|---|
| `package.json` | npm distribution: `bin` → `bin/qrspi.mjs`, `test` → `qrspi check` |
| `bin/qrspi.mjs` | installer CLI: `install` / `uninstall` / `path` / `check`; copy mode guards unmarked directories |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.claude-plugin/marketplace.json` | marketplace manifest (`source: "./"`); Codex reads it as a legacy marketplace |
| `.codex-plugin/plugin.json` | Codex CLI plugin manifest (`skills: ./skills/`) |
| `commands/*.md` | the three Claude Code commands; each command emits a prompt or a report and stops |
| `skills/qrspi/SKILL.md` | workflow index: rules, phase table, context budgets |
| `skills/qrspi/references/0*.md` | per-phase prompt **and** artifact template (05 is a prompt only) |
| `skills/qrspi/references/99-progress.md` | Implement-phase state file template |
| `skills/qrspi/references/{recovery,reviewing,landing}.md` | guides: re-entry, the review rubric, landing a PR |
| `skills/token-efficiency/` | reference skill: index + 9 reference files |
| `skills/handoff/` | craft skill: index + 3 reference files |
| `skills/qrspi-{new,next,review}/SKILL.md` | the commands in Codex skill form; paths relative to their own directory |
| `evals/trigger/` | should/should-not-trigger prompts per skill; not shipped |
| `scripts/measure-context-cost.mjs` | `count_tokens` over the plugin's own text (needs a key); not shipped |
| `scripts/measure-run.mjs` | KPIs 1, 3, 4 of a real run from session transcripts; not shipped |
| `site/build.mjs` | generates the GitHub Pages site from `README.md`, plus `sitemap.xml` and JSON-LD |
| `assets/` | the logo (single source) and the social card (`.html` source, `.png` render); not shipped |
| `.github/workflows/ci.yml` | `npm test` on Node 18/20/22/24, a copy-mode round trip, site build, `npm pack` |
| `.github/workflows/release.yml` | on tag `qrspi--v*`: npm publish over OIDC, GitHub release, close milestone |
| `.github/workflows/release-drift.yml` | fails when `main` carries a version with no tag for two hours |
| `.github/workflows/pages.yml` | builds and deploys the site on push to `main` |

`skills/qrspi/references/0*.md` serve double duty: their top `> **PROMPT` blockquote is
the prompt for that phase, and `/qrspi:new` copies the rest into the user's
`thoughts/<task-id>-<slug>/` as the artifact skeleton, prompt block deleted.

## Build, test, run

No build. One automated check — CI runs it on every pull request; run it locally
before every commit, and read its exit code rather than the tail of its output:

```bash
npm test        # == node bin/qrspi.mjs check
```

It validates the four manifests and their versions, skill frontmatter and length,
every `${CLAUDE_PLUGIN_ROOT}` reference, the prompt blocks and the markers the phase
gates read, the command/twin step parity, and the content rules the repository states
(CLAUDE.md, "Verifying a change", has the full list). Manual end-to-end, safe because
it writes to a throwaway config dir:

```bash
npm pack --dry-run
CLAUDE_CONFIG_DIR=/tmp/fake node bin/qrspi.mjs install --copy
```

## The site

`npm run build:site` writes `site/dist/index.html` (gitignored) from `README.md` plus
the skills read off disk (the Codex twins left out). The page carries no prose of its
own: to change its text, edit the README. `marked` is a devDependency used only by the
generator — the published package stays dependency-free.

## Brand

`assets/logo.svg` is the only copy of the mark: the site inlines it as favicon and
draws it in header and hero, the README links the raw GitHub URL. Terracotta `#b7552f`,
64×64 grid, must stay readable at 16px. `assets/social-preview.png` is a headless-Chrome
render of `assets/social-preview.html` (CLAUDE.md has the exact command).

## Editing rules

- `SKILL.md` is an **index** (~100 lines); detail belongs in `references/`, loaded on
  demand. The skills must practise the context economy they document.
- Skill frontmatter is `name` + `description` (the twins add `disable-model-invocation`
  and `user-invocable`). The description is permanently in context, so write trigger
  conditions, not a summary.
- Do not split the phases into one skill each — a deliberate decision; the phases are
  commands precisely to keep their descriptions out of permanent context.
- **Edit a command, then mirror it into its twin** in `skills/qrspi-<name>/SKILL.md`;
  `npm test` compares the two step lists. The twins address the phase references as
  `../qrspi/references/`, never `${CLAUDE_PLUGIN_ROOT}`, which Codex does not set.
- Commands reference plugin files via `${CLAUDE_PLUGIN_ROOT}`, never relative paths, and
  keep `allowed-tools` minimal.
- Artifact templates use `<...>` / `_(to be filled …)_` placeholders and end in a
  `## Status` checkbox block; `/qrspi:next` reads those to detect phase completion, and
  counts only the boxes under `## Status`. Do not change the markers in isolation.
- The duplicated numbers: the pipeline diagram (README, `skills/qrspi/SKILL.md`,
  `compaction.md`) and the effort table (SKILL.md, `commands/next.md`, `effort.md`).
  Change a row in all three of its files; `npm test` compares them.
- Keep the version in sync across the four manifests (`npm test` enforces it).
- Copy mode rewrites `${CLAUDE_PLUGIN_ROOT}/skills` to `~/.claude/skills`
  (`rewritePluginRoot()` in `bin/qrspi.mjs`); a `${CLAUDE_PLUGIN_ROOT}` reference to
  anything else breaks it and is rejected by `npx qrspi check`.
- The installer stays dependency-free, Node >= 18, and has no `postinstall`: nothing
  touches `~/.claude` unless the user runs `qrspi install`.
- Nothing public names a machine: no file URL, no absolute home path (`npm test`).
- Style: British-leaning spelling, em-dashes, no marketing filler, no decorative emoji —
  the status glyphs in `99-progress.md` and the ❌ / ✅ above do/don't examples are the
  functional exceptions.

## Invariants — do not break

1. Fresh session at every phase boundary; commands emit a prompt and **stop**.
2. The artifact is the only channel between phases.
3. Artifacts are self-contained: repo-root paths, symbols, line numbers.
4. The ticket does not enter Research; it returns in Design.
5. The 40% context rule: stop and compact.
6. Every phase is a human checkpoint — never auto-advance past a gate.

`/qrspi:next` must keep refusing to advance on unresolved placeholders, an open
"More research needed" list, a structure step without a verification command, or a
plan that fails the zero-context test. `/qrspi:review` reports and stops.

## Releasing

See [CONTRIBUTING.md](CONTRIBUTING.md#releasing). Bump the version in all four
manifests and the lockfile, `npm test`, `claude plugin tag . --push`; the tag triggers
the release workflow, which publishes to npm over OIDC (Trusted Publishing — no token
in this repository), creates the release and closes the milestone.

## Commit conventions

A plain imperative subject that says what changed and, where it helps, why — "Scope the
phase gate to the Status block" — with the issue number in the pull request title or
body. Squash merges keep one commit per pull request on `main`.
