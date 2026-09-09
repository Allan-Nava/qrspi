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

### Measuring what the plugin costs

The static half of the plugin's own numbers — what it occupies in a session before
doing any work — can be settled without running a task:

```bash
ANTHROPIC_API_KEY=sk-ant-… node scripts/measure-context-cost.mjs
```

It reports the permanent cost (the two `description` lines, in context every session
whether a skill fires or not), the cost of each `SKILL.md` on trigger, each reference
on demand, and the artifact templates. Counts come from `count_tokens` and are
model-specific — pass `--model` to compare. No dependencies, and it is excluded from
the npm tarball by `package.json#files`.

The *dynamic* figures — the Research burn, the compression ratios, the per-phase
starting contexts — need a real six-phase run and the instrumentation snippet in
`skills/token-efficiency/references/measuring.md`. That is issue #10.

Try an install without touching your own configuration:

```bash
CLAUDE_CONFIG_DIR=/tmp/qrspi-scratch node bin/qrspi.mjs install --copy
CLAUDE_CONFIG_DIR=/tmp/qrspi-scratch node bin/qrspi.mjs uninstall
```

Copy mode replaces a skill directory wholesale, so it writes a `.qrspi-installed`
marker into every directory it creates and refuses to delete one that lacks it —
`~/.claude/skills/token-efficiency` is a plausible name for someone's own skill, and
copy mode is the automatic fallback when the `claude` CLI is missing. `--force`
overrides, and says what it replaced; `uninstall` applies the same rule in reverse.

## Measuring a run

The context budgets in `skills/qrspi/SKILL.md` and the pipeline figures in the README
are assertions until a real task has been run through all six phases (#10). When you
run one — fresh session per phase, as the workflow requires — every session lands as a
JSONL under `~/.claude/projects/<repo-slug>/`, with `usage` on each assistant turn.
Afterwards:

```bash
node scripts/measure-run.mjs ~/.claude/projects/<repo-slug>/
```

prints, per session, the phase (read off the pasted prompt), peak context and its
share of the window (KPI 1), output and uncached input, cache writes and reads, and the
hit ratio (KPI 4); the total row is KPI 3. No API key, nothing leaves the machine. Put
the peaks next to the `Budget / alarm` column in `SKILL.md`, and if the two disagree,
the table moves — not the run. Compression ratio (KPI 2) additionally needs the
artifact's token count from `scripts/measure-context-cost.mjs`.

## Trigger evals for the skills

`evals/trigger/<skill>.json` holds twenty realistic prompts per skill — nine that should
trigger it, eleven that should not — in the format the `skill-creator` skill's
`run_eval.py` consumes: `[{"query", "should_trigger"}]`. The negatives are near-misses
on purpose: the `handoff` set's negatives include the cost-diagnosis prompts that belong
to `token-efficiency`, and vice versa, because the two descriptions border each other
and the README's bar for a third skill was that they must not compete. This is the
executable form of #25's done-when.

To run one:

```bash
cd <skill-creator dir> && python -m scripts.run_eval \
  --eval-set <repo>/evals/trigger/handoff.json --skill-path <repo>/skills/handoff \
  --model claude-opus-5 --runs-per-query 3 --verbose
```

Two things will otherwise produce a clean-looking zero and mean nothing:

- **Disable the installed plugin first** (`claude plugin disable qrspi@allan-nava`, and
  re-enable after). The harness injects a stub with a hashed name and counts a trigger
  only when *that* stub is invoked; with the real plugin present the model invokes
  `qrspi:handoff` instead, and every run is scored as a miss.
- **The CLI has to be one the model accepts.** `claude -p` under an outdated Claude Code
  answers a 400 for a model it does not know, and the harness scores the error as "did
  not trigger". Check `claude --version` against the error text before believing 0/27.

Both bit on 2026-09-09. Even with the plugin disabled and a supported model, Claude
Code 2.1.128 fired the stub 2 times in 81 positive runs across the three skills —
including on "run ENG-4410 through qrspi", which is as explicit as a prompt gets — so on
that CLI version the harness measures nothing. The sets are the deliverable; the number
needs a current CLI.

## Releasing

Releases run from GitHub Actions. Pushing the tag is the whole manual part — and the
part that gets forgotten, so
[release-drift.yml](.github/workflows/release-drift.yml) watches for it: once `main`
has carried a version with no matching tag for two hours it fails, and it runs daily,
so a quiet repo still hears about it. `0.1.1` is the precedent — merged in #40, never
tagged, never published. It stays a gap in the version line, superseded by 0.1.2;
tagging it now would publish a tarball nobody asked for.

**One-time setup — npm Trusted Publishing.** There is no npm token anywhere in this
repository: the release job authenticates to npm over OIDC. On npmjs.com, the package
page → Settings → Trusted Publisher → GitHub Actions:

| Field | Value |
|---|---|
| Organization or user | `Allan-Nava` — this case, exactly |
| Repository | `qrspi` |
| Workflow filename | `release.yml` |
| Environment | *(leave empty)* |

**`release.yml` is part of that configuration.** The trusted publisher matches on the
literal workflow filename, so renaming or moving the file breaks publishing, and the
error npm returns does not mention the filename. Rename it only together with the
npm-side config.

**The owner's case has to match GitHub's.** An entry saying `allan-nava` never
matches, because the `repository` claim GitHub signs carries the account's real case,
`Allan-Nava/qrspi`, and npm compares the two literally. The rejection arrives from the
token exchange as

```
POST https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/qrspi   404
npm verbose oidc … OIDC token exchange error - package not found
```

which says nothing about case, and "package not found" is untrue on its face — the
package is published — so it reads as a missing configuration rather than a
mismatched one. 0.1.2 published the moment an entry with the right case existed.

**Environment stays empty, and Label is not it.** npm's form has both, and the
publisher row on the package page displays the *Label* — so a label reading `release`
looks exactly like an environment named `release`. If you ever do fill Environment in,
the job needs a matching `environment:` key; today it has none, so the field is empty.

**Nothing in the job may carry an npm credential.** In particular `actions/setup-node`
must **not** be given `registry-url`: it then writes an .npmrc holding
`_authToken=${NODE_AUTH_TOKEN}` and exports a placeholder token, npm sees a credential
configured for the registry and skips the OIDC exchange entirely, and the publish goes
out with the placeholder. npm answers `404 Not Found - PUT
https://registry.npmjs.org/qrspi` — not 401, because it will not reveal whether a
package exists to a request it cannot authenticate — so it reads like a permissions
problem on the package and sends you to check the trusted publisher, which is fine.
Unsetting the variable does not help: an .npmrc naming it counts as a configured
credential even when it expands to nothing.

The equivalent from the CLI, with npm ≥ 11.15.0 and an interactively logged-in
account:

```bash
npm trust github qrspi --repo Allan-Nava/qrspi --file release.yml --allow-publish
npm trust list qrspi
```

**The bootstrap exception.** npm will not let you configure a trusted publisher for a
package that does not exist yet — `npm trust` says so outright: *"The package you're
configuring must already exist on the npm registry."* Unlike PyPI, there is no
pre-registration. So the **first** version of a new package is published by hand:

```bash
npm login                    # interactive 2FA is fine; it is CI that cannot answer an OTP
npm publish --access public
```

then you configure the trusted publisher, and every release after that runs from CI
with no credentials. A version published this way carries no provenance attestation —
provenance comes from publishing through OIDC — so the first version is the only one
without it.

The release workflow tolerates this: its publish step skips a version that is already
on the registry, so you can still run it against the bootstrap tag to get the GitHub
release and the milestone closed.

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

**A note on the npm version.** The release job installs an exact npm
(`npm install -g npm@11.19.0`) rather than `npm@latest`: trusted publishing needs
≥ 11.5.1, and a moving version in the publishing path means a release can break
because npm shipped something last night. Bump that pin deliberately, like any other
dependency.

**When something fails.** Re-run with the `workflow_dispatch` trigger and the existing
tag — no need to delete and re-push it:

```bash
gh workflow run Release -f tag=qrspi--v<version>
```
 The publish step itself is the exception: npm
refuses to overwrite a version that already exists, so a rerun that got past it needs
a version bump. Nothing else in the workflow is destructive, and the release is only
created after npm confirms the version.

## Pull requests

- Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`), imperative subject.
- Keep `npm test` green; add a check to `bin/qrspi.mjs check` when you add an invariant.
- If you change `README.md`, run `npm run build:site` and look at the result — the
  site is generated from it, and the hero reads the first prose paragraph.
