# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

`qrspi` is a **Claude Code plugin**, not an application. There is no build step and no
dependency: every file that matters is Markdown or JSON, and the "product" is the
prompt text itself. The single piece of executable code is
[bin/qrspi.mjs](bin/qrspi.mjs), the `npx qrspi` installer — it exists only to put the
Markdown where Claude Code can see it.

It ships two things:

1. **A workflow** — QRSPI: Questions → Research → Spec (Design + Structure) → Plan →
   Implement. Each phase burns whatever context it needs, compresses what it learned
   into one Markdown artifact on disk, and the next phase starts from a *fresh
   session* reading only that artifact. This is "intentional compaction".
2. **A reference skill** — `token-efficiency`: the reasoning behind the workflow
   (measurement, compaction ratios, subagents as context firewalls, effort
   allocation, prompt-cache invalidation, tool hygiene, KPIs).

The plugin produces artifacts in the *user's* repo under `thoughts/<task-id>-<slug>/`.
Nothing in this repo is generated at runtime.

## Layout

```
bin/
  qrspi.mjs            `npx qrspi` installer (install / uninstall / path / check)
assets/
  logo.svg             the mark — single source for the favicon, the site, the README
  logo-mono.svg        same shapes in currentColor, no tile
  wordmark.svg         mark + QRSPI lockup
  social-preview.html  source of the OG card
  social-preview.png   1280x640, rendered from that HTML, committed
site/
  build.mjs            generates site/dist/index.html FROM README.md (gitignored output)
.github/workflows/
  ci.yml               npm test + site build + npm pack on every PR and push to main
  release.yml          on tag qrspi--v*: publish to npm, cut the release, close the milestone
  pages.yml            builds and deploys the site to GitHub Pages on push to main
package.json           npm distribution; `bin` → bin/qrspi.mjs, `test` → qrspi check
.claude-plugin/
  plugin.json          plugin manifest (name, version, author, keywords)
  marketplace.json     single-plugin marketplace manifest for `/plugin marketplace add`
commands/
  new.md               /qrspi:new  — bootstrap thoughts/<dir> and run phase 0
  next.md              /qrspi:next — detect current phase, gate, emit the next prompt
skills/
  qrspi/
    SKILL.md           the workflow index: 6 rules, phase table, context budgets
    references/
      00-questions.md  phase prompt + artifact skeleton
      01-research.md   idem
      02-design.md     idem
      03-structure.md  idem
      04-plan.md       idem
      05-implement.md  prompt only — the phase output is code, not an artifact
      99-progress.md   implement-phase state file skeleton
  token-efficiency/
    SKILL.md           index of the five levers and five KPIs
    references/        measuring, compaction, subagents, effort, caching,
                       tool-hygiene, anti-patterns, playbook
README.md              user-facing pitch; overlaps SKILL.md numbers — keep in sync
```

Note the dual role of `skills/qrspi/references/*.md`: they are both the **phase
prompts** (`> PROMPT` blockquote at the top) and the **artifact templates** that
`/qrspi:new` copies into the user's `thoughts/<dir>/`. Editing one edits both.

## The rules the content encodes

Do not weaken these when editing; they are the plugin's whole thesis.

1. Fresh session at every phase boundary — never continue.
2. The artifact is the only channel between phases.
3. Artifacts are self-contained: repo-root-relative paths, explicit symbols, line
   numbers. Never "the file from before".
4. The ticket does **not** enter Research (it returns in Design).
5. The 40% context rule — stop and compact, do not push through.
6. Do not outsource the thinking; every phase is a human checkpoint.

## Conventions to follow when editing

- **A `SKILL.md` is an index, not a manual.** Target ~100 lines. Detail goes to
  `references/` and is loaded on demand. A skill that preaches context economy while
  spending 9k tokens on every trigger refutes itself.
- **Skill frontmatter** is only `name` + `description`. The `description` sits in
  context permanently for every installed skill, so it must be one dense sentence of
  trigger conditions — not a summary.
- **Do not add one skill per phase.** This was decided deliberately (README, "Two
  design notes"): six near-identical descriptions would burn the permanent budget and
  compete to trigger. Phases are sequential and user-driven, so they are *commands*.
- **Command frontmatter** carries `description`, `argument-hint`, and a tight
  `allowed-tools` list. Keep `allowed-tools` minimal; widen only with a reason.
- **Plugin paths in commands use `${CLAUDE_PLUGIN_ROOT}`**, never a relative path.
- **Template placeholders** are `<...>` and `_(to be filled …)_`, and every artifact
  ends with a `## Status` checkbox block. `/qrspi:next` greps for exactly these to
  decide whether a phase is complete — changing the markers breaks phase detection in
  [commands/next.md](commands/next.md).
- **Phase prompts live in a `> PROMPT` blockquote** at the top of the reference file.
  `/qrspi:next` prints that block verbatim with real paths substituted.
- **Numbers appear in three places** — [README.md](README.md), the budget/phase
  tables in [skills/qrspi/SKILL.md](skills/qrspi/SKILL.md), and the routing table in
  [commands/next.md](commands/next.md). Change one, change all three.
- **Versions must match** across [package.json](package.json),
  [.claude-plugin/plugin.json](.claude-plugin/plugin.json) and
  [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json). `npm test`
  fails if they drift.
- **Copy mode rewrites `${CLAUDE_PLUGIN_ROOT}/skills`** to `~/.claude/skills` — see
  `rewritePluginRoot()` in [bin/qrspi.mjs](bin/qrspi.mjs). A `${CLAUDE_PLUGIN_ROOT}`
  reference pointing anywhere *other* than `/skills` would survive unrewritten and
  break the copy install, so `npx qrspi check` rejects it. Add such a reference only
  together with its rewrite rule.
- **The installer stays dependency-free** and Node-18-compatible. No bundler, no
  TypeScript, no `postinstall` hook — installing a package must never write to
  `~/.claude` behind the user's back; that only happens on an explicit
  `qrspi install`.
- Prose style: British-leaning spelling ("utilisation"), em-dashes, no emoji, no
  marketing filler. Match it.

## Verifying a change

There is nothing to build. The one automated check is the installer's own:

```bash
npm test                  # == node bin/qrspi.mjs check
```

It validates the three manifests and their versions, skill frontmatter, SKILL.md
length, every `${CLAUDE_PLUGIN_ROOT}` reference, and the checkbox markers that
`/qrspi:next` greps for. Run it before every commit and extend it whenever you add
an invariant — [.github/workflows/ci.yml](.github/workflows/ci.yml) runs it, the site
build and `npm pack --dry-run` on every pull request.

Then, by hand:

```bash
npm pack --dry-run                       # tarball carries .claude-plugin/, skills/, commands/
CLAUDE_CONFIG_DIR=/tmp/fake node bin/qrspi.mjs install --copy   # safe end-to-end test
node bin/qrspi.mjs install --dry-run     # what the claude-CLI path would run
grep -rn '](' README.md CLAUDE.md        # links resolve
```

End-to-end check: install locally with `/plugin marketplace add .` then
`/plugin install qrspi`, and run `/qrspi:new TEST-1 <some ticket>` in a scratch repo —
it must create `thoughts/TEST-1-<slug>/` with all seven files copied and the H1s
renamed, then **stop** without entering Research.

## The site

[allan-nava.github.io/qrspi](https://allan-nava.github.io/qrspi/) is generated by
[site/build.mjs](site/build.mjs) and deployed by
[.github/workflows/pages.yml](.github/workflows/pages.yml) on every push to `main`.

**The page has no prose of its own.** Every word comes from `README.md` or is read off
the filesystem (the skills index). Design lives in `build.mjs`, content lives in the
README — do not add copy to the generator, and do not commit `site/dist/`, which is
gitignored. To change what the page says, edit [README.md](README.md) and rebuild:

```bash
npm run build:site && open site/dist/index.html
```

The generator parses the README: the H1 becomes the hero, the first fenced block is
parsed into the pipeline diagram (`Phase  context  →  artifact  (size)` — a row that
does not match is skipped, and if fewer than three match the whole block falls back to
a `<pre>`), and each `##` becomes a section. Renaming a README heading renames a nav
entry and an anchor; reshaping the pipeline block silently drops rows, so re-run the
build and look at the output. `marked` is a devDependency used only here — it never
reaches the published npm package, which stays dependency-free.

## Brand assets

[assets/logo.svg](assets/logo.svg) is the single source: four bars converging on one
solid block — the phases compacting into an artifact. Terracotta `#b7552f`, white
shapes, 64×64 grid, 14px corner radius. It has to survive 16px, so do not add detail
to it; if you restyle it, re-check it at 16px before committing.

The site inlines that file as its favicon and draws it in the header and hero, so the
mark never gets a second copy. The README points at the raw GitHub URL, not a relative
path, so it also renders on npm.

`social-preview.png` (the OG card, and what you upload under Settings → General →
Social preview) is rendered from `assets/social-preview.html` with headless Chrome —
no dependency, no CI step:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --window-size=1280,640 --screenshot=assets/social-preview.png \
  --virtual-time-budget=2500 "file://$PWD/assets/social-preview.html"
```

Regenerate it whenever the card's text goes stale. `assets/` is deliberately **not** in
`package.json#files`: the npm tarball stays small and links to the GitHub copy.

## Releasing

The runbook lives in [CONTRIBUTING.md](CONTRIBUTING.md#releasing) — one home, so it
cannot drift. In short: bump the version in all three manifests, `npm test`, then
`claude plugin tag . --push`. The tag triggers
[.github/workflows/release.yml](.github/workflows/release.yml), which publishes to npm
with provenance, cuts the GitHub release and closes the matching milestone. It needs the `NPM_TOKEN` repository secret — a granular access token with
*bypass 2FA* enabled, since CI cannot answer an OTP prompt — and fails loudly
without it.

## Things to avoid here

- Growing [bin/qrspi.mjs](bin/qrspi.mjs) into an application. It installs Markdown;
  anything beyond install/uninstall/path/check belongs elsewhere. No dependencies,
  no build, no `postinstall`.
- Executing a phase inside `/qrspi:new` or `/qrspi:next` — both commands must emit a
  prompt and stop. Continuing violates rule 1.
- Relaxing the gates in [commands/next.md](commands/next.md). Refusing to advance on
  an unfinished artifact is the feature, not friction.
- Pasting code into an artifact template. Artifacts carry paths, symbols and line
  numbers; the whole compression ratio depends on that.
