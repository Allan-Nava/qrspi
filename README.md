<p align="center">
  <img src="https://raw.githubusercontent.com/Allan-Nava/qrspi/main/assets/logo.svg" width="84" alt="QRSPI">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/qrspi"><img src="https://img.shields.io/npm/v/qrspi?color=b7552f&labelColor=1b1a18&label=npm" alt="npm"></a>
  <a href="https://allan-nava.github.io/qrspi/"><img src="https://img.shields.io/badge/docs-allan--nava.github.io%2Fqrspi-b7552f?labelColor=1b1a18" alt="Documentation"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-b7552f?labelColor=1b1a18" alt="MIT licence"></a>
</p>

# QRSPI

A Claude Code plugin for running coding tasks through phase-gated
**intentional compaction**: every phase writes one self-contained artifact to disk,
the next phase starts from a fresh session and reads only that artifact.

**Q**uestions → **R**esearch → **S**pec (Design + Structure) → **P**lan → **I**mplement

```
Questions   ~15k burned    →  00-questions.md   (~1k)
Research    150-250k       →  01-research.md    (~5k)
Design      starts at 6k   →  02-design.md      (~4k)
Structure   starts at 9k   →  03-structure.md   (~3k)
Plan        starts at 12k  →  04-plan.md        (~6k)
Implement   starts at 7k   →  code + PR
```

The point is not only cost. Implement runs steadily under 20% context — the zone
where models actually perform — instead of inheriting 250k tokens of Research
residue. And the artifacts are diffable, reviewable, and become the record of the
decision.

## Install

From inside Claude Code:

```
/plugin marketplace add Allan-Nava/qrspi
/plugin install qrspi
```

Or from a shell, with npm:

```
npx qrspi install
```

Claude Code has no npm plugin source, so `npx qrspi install` is a wrapper: it ships
the plugin files in the package and registers them for you — through
`claude plugin marketplace add` when the `claude` CLI is on `PATH`, otherwise by
copying the skills and commands into `~/.claude/` (`--copy` forces that mode).
Either way you end up with the same `/qrspi:new` and `/qrspi:next`.

```
npx qrspi install --dry-run   # show what it would do, change nothing
npx qrspi install --copy      # skip the plugin system, copy into ~/.claude
npx qrspi uninstall           # remove what copy mode installed
npx qrspi path                # print the plugin root
npx qrspi check               # validate the package
```

Pin a version with `npx qrspi@0.1.0 install`; `npm i -g qrspi` then `qrspi install`
works too. Copy mode is a snapshot — re-run `npx qrspi install` to update. The plugin
route updates itself through `/plugin`.

## Use

```
/qrspi:new ENG-1234 <ticket text or URL>   # bootstrap thoughts/ + run the Questions phase
/qrspi:next thoughts/ENG-1234-refund-flow  # detect the phase, emit the next prompt, gate on quality
```

`/qrspi:next` refuses to advance when the upstream artifact is not ready — unresolved
placeholders, a design with open review comments, a structure step with no
verification command, a plan that fails the zero-context test. That gate is the
feature: the whole workflow is worthless if you rubber-stamp your way through it.

## What's in it

| | |
|---|---|
| `skills/qrspi/` | the workflow: six rules, per-phase context budgets, and the seven phase templates as on-demand references |
| `skills/token-efficiency/` | the reference behind it: measurement, compaction, subagent firewalls, effort allocation, prompt-caching invalidation, tool hygiene, KPIs |
| `commands/new.md` | bootstrap a task and run phase 0 |
| `commands/next.md` | advance a task across a phase boundary |
| `bin/qrspi.mjs` | the `npx qrspi` installer — zero dependencies, no build |

## Six non-negotiable rules

1. **Fresh session at every phase boundary.** Never continue.
2. **The artifact is the only channel.** If it is not written there, it does not exist
   for the next phase.
3. **Artifacts are self-contained.** Repo-root paths, explicit symbols, line numbers.
4. **The ticket does not enter Research.** Handing the agent the ticket makes it hunt
   for evidence supporting a solution it already assumed. The ticket returns in Design.
5. **The 40% rule.** Past the threshold, stop and compact — do not push through.
6. **Do not outsource the thinking.** Every phase is a checkpoint where *you* correct.

## Two design notes

**Two skills, not six.** One skill per phase would be the obvious shape and the wrong
one: every installed skill's `description` sits in context permanently, and six
near-identical descriptions both burn that budget and compete to trigger. The phases
are sequential and user-driven, so they are slash commands. The knowledge is
reference material, so it is a skill with progressive disclosure.

**The skills practise what they document.** Each `SKILL.md` is an index of ~100
lines; the detail lives in `references/` and is loaded only when the question needs
it. A 700-line skill that documents context economy while spending 9k tokens on every
trigger would be an argument against itself.

## Prior art

HumanLayer has **not** open-sourced its own QRSPI. This is a reconstruction based on
Dexter Horthy's talks (*Advanced Context Engineering for Coding Agents*) and the
public product documentation. Its predecessor, RPI, is open source.

Other public reconstructions worth reading:
[matanshavit/qrspi](https://github.com/matanshavit/qrspi) ·
[dfrysinger/qrspi-plus](https://github.com/dfrysinger/qrspi-plus) (parallel worktrees) ·
[From RPI to QRSPI](https://alexlavaee.me/blog/from-rpi-to-qrspi/)

## License

MIT. Working on the plugin itself? See [CONTRIBUTING.md](CONTRIBUTING.md).
