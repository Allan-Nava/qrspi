# AGENTS.md

Instructions for any coding agent working in this repository.
Claude Code users: see [CLAUDE.md](CLAUDE.md) for the longer version — this file is
the vendor-neutral subset and the two must agree.

## Project

`qrspi` is a **Claude Code plugin** distributed as Markdown and JSON. No build step,
no dependencies. The deliverable is prompt text; the only executable file is
`bin/qrspi.mjs`, the `npx qrspi` installer that puts that text where Claude Code
finds it.

It implements QRSPI — Questions → Research → Spec (Design + Structure) → Plan →
Implement — a phase-gated workflow where each phase writes one self-contained
artifact to disk and the next phase starts from a fresh session reading only that
artifact ("intentional compaction"). A second skill, `token-efficiency`, documents
the reasoning: measurement, compaction ratios, subagents as context firewalls, effort
allocation, prompt caching, tool hygiene, KPIs.

## Layout

| Path | Role |
|---|---|
| `package.json` | npm distribution: `bin` → `bin/qrspi.mjs`, `test` → `qrspi check` |
| `assets/logo.svg` | the mark — single source for favicon, site, README |
| `assets/social-preview.*` | OG card: `.html` is the source, `.png` is rendered from it |
| `site/build.mjs` | generates the GitHub Pages site from `README.md` |
| `.github/workflows/ci.yml` | `npm test` + site build + `npm pack` on PRs and `main` |
| `.github/workflows/release.yml` | on tag `qrspi--v*`: npm publish, GitHub release, close milestone |
| `.github/workflows/pages.yml` | builds and deploys that site on push to `main` |
| `bin/qrspi.mjs` | installer CLI: `install` / `uninstall` / `path` / `check` |
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

No build. One automated check — CI runs it on every pull request, run it locally
before every commit:

```bash
npm test        # == node bin/qrspi.mjs check
```

It validates the three manifests and their versions, skill frontmatter and length,
every `${CLAUDE_PLUGIN_ROOT}` reference, the checkbox markers `/qrspi:next` greps
for, the `## Status` block in every artifact template, and the two tables that are
duplicated across files — the pipeline diagram and the per-phase effort allocation. Manual end-to-end, safe because it writes to a throwaway config dir:

```bash
npm pack --dry-run
CLAUDE_CONFIG_DIR=/tmp/fake node bin/qrspi.mjs install --copy
```

## The site

`npm run build:site` writes `site/dist/index.html` (gitignored) from `README.md` plus
the skills read off disk. The page carries no prose of its own: to change its text,
edit the README. `marked` is a devDependency used only by the generator — the
published package stays dependency-free.

## Brand

`assets/logo.svg` is the only copy of the mark: the site inlines it as favicon and
draws it in header and hero, the README links the raw GitHub URL. Terracotta
`#b7552f`, 64×64 grid, must stay readable at 16px. `assets/social-preview.png` is a
headless-Chrome render of `assets/social-preview.html` (see CLAUDE.md for the exact
command); `assets/` is not shipped in the npm tarball.

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
- Keep the version in sync across `package.json` and the two `.claude-plugin/*.json`
  manifests (`npm test` enforces it).
- Copy mode rewrites `${CLAUDE_PLUGIN_ROOT}/skills` to `~/.claude/skills`
  (`rewritePluginRoot()` in `bin/qrspi.mjs`); a `${CLAUDE_PLUGIN_ROOT}` reference to
  anything else breaks it and is rejected by `npx qrspi check`.
- The installer stays dependency-free, Node >= 18, and has no `postinstall`: nothing
  touches `~/.claude` unless the user runs `qrspi install`.
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

## Releasing

See [CONTRIBUTING.md](CONTRIBUTING.md#releasing). Bump the version in all three
manifests, `npm test`, `claude plugin tag . --push`; the tag triggers the release
workflow, which publishes to npm over OIDC (Trusted Publishing — no token in this
repo), creates the release and closes the milestone.

## Commit conventions

Conventional Commits (`feat:`, `fix:`, `docs:`), imperative subject, scope optional.
