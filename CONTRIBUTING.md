# Contributing

QRSPI is a Claude Code plugin made of Markdown and JSON. There is no application to
build: the prompt text *is* the product. The only executable file is
[bin/qrspi.mjs](bin/qrspi.mjs), the installer, and [site/build.mjs](site/build.mjs),
which generates the documentation site from `README.md`.

The conventions — what belongs in a `SKILL.md` versus a reference, why the phases are
slash commands instead of skills, which invariants the commands depend on — live in
[CLAUDE.md](CLAUDE.md). Read that before changing anything under `skills/` or
`commands/`.

## Local loop

```bash
npm install          # marked, used only by the site generator
npm test             # == node bin/qrspi.mjs check
npm run build:site   # writes site/dist/index.html, gitignored
```

`npm test` validates what the plugin runtime and the installer both depend on: the
three manifests agree on a version, skill frontmatter is present, each `SKILL.md`
stays index-sized, every `${CLAUDE_PLUGIN_ROOT}` reference is one copy mode can
rewrite, and each phase reference still carries the checkboxes `/qrspi:next` greps
for. CI runs it, the site build and `npm pack --dry-run` on every pull request.

Try an install without touching your own configuration:

```bash
CLAUDE_CONFIG_DIR=/tmp/qrspi-scratch node bin/qrspi.mjs install --copy
CLAUDE_CONFIG_DIR=/tmp/qrspi-scratch node bin/qrspi.mjs uninstall
```

## Releasing

Releases run from GitHub Actions. Pushing the tag is the whole manual part.

**One-time setup** (already done for this repository): a repository secret
`NPM_TOKEN`, holding an npm **automation** token — the kind that bypasses 2FA, since
CI cannot answer an OTP prompt. Settings → Secrets and variables → Actions.

**Per release:**

```bash
# 1. bump the version in all three manifests — they must agree
#    package.json · .claude-plugin/plugin.json · .claude-plugin/marketplace.json
npm test                       # fails if they disagree
npm pack --dry-run             # inspect what would ship

# 2. commit the bump on main, then look before you leap
claude plugin tag . --dry-run  # prints the tag it would create, changes nothing

# 3. release
claude plugin tag . --push     # creates and pushes qrspi--v{version}
```

That tag is the trigger. [.github/workflows/release.yml](.github/workflows/release.yml)
then re-checks the tag against `package.json`, runs the tests and the site build,
publishes with `npm publish --provenance --access public`, polls the registry until
the version is actually served, creates the GitHub release with install instructions
above the generated notes, and closes the milestone named `v{version}` — but only if
that milestone has no open issues; otherwise it logs a warning and leaves it open.

Watch it:

```bash
gh run watch "$(gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId')"
```

**After it goes green**, three checks that take a minute:

```bash
npm view qrspi version                        # the registry agrees
npx qrspi@<version> install --dry-run         # run this OUTSIDE the repo
```

plus a look at the npm page: the logo must load (it is linked by absolute raw URL for
exactly this reason) and the version badge in the README stops reading *invalid*.

**When something fails.** Re-run with the `workflow_dispatch` trigger and the existing
tag — no need to delete and re-push it. The publish step itself is the exception: npm
refuses to overwrite a version that already exists, so a rerun that got past it needs
a version bump. Nothing else in the workflow is destructive, and the release is only
created after npm confirms the version.

## Pull requests

- Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`), imperative subject.
- Keep `npm test` green; add a check to `bin/qrspi.mjs check` when you add an invariant.
- If you change `README.md`, run `npm run build:site` and look at the result — the
  site is generated from it, and the hero reads the first prose paragraph.
