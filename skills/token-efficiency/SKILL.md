---
name: token-efficiency
description: Diagnose and cut token consumption in agentic coding workflows — context rot, the 40% rule, intentional compaction, subagents as context firewalls, effort and model selection, prompt-caching invalidation, tool-output hygiene, KPIs. Use when asked why an agent is expensive or slow, when a session is drifting or re-exploring files it already read, when cache_read_input_tokens is unexpectedly 0, when choosing effort or model per phase, when a CLAUDE.md or prompt needs slimming, or when measuring tokens per completed task.
---

# Token efficiency for coding agents

Verified against the Claude API, reference model `claude-opus-5`. Every reference
closes with **In Claude Code** — the same lever as exercised from the CLI, for readers
who never call the API directly.

## The mental model

With a 1M window, "does it fit?" is almost always yes. The right question is
**how much of that context is signal?**

Quality degrades long before the window fills. The informal name is *context rot*:
instructions given 200k tokens ago get ignored, the agent re-explores files it
already read, mid-session decisions get contradicted, the loop fills with redundant
tool calls. The heuristic: **keep utilisation under ~40%**, then stop and compact.

So the metric is not tokens spent but `signal density = useful / total tokens in
context`. Cost falls as a *consequence*. An agent at 20% context costs less, errs
less and finishes sooner; one at 70% costs more and produces work you redo — and
rework is the largest, least measured cost line.

## The levers, in order

**Order matters.** Caching on a workflow that does not compact saves 10%;
intentional compaction saves 90%. Do not invert them. Before any of them:
**measure** — `references/measuring.md` (baseline, `usage` fields, instrumentation).

| # | Lever | Typical gain | Reference |
|---|---|---|---|
| 1 | Intentional compaction — artifacts on disk between phases | 10-20× | `references/compaction.md` |
| 2 | Subagents as context firewalls, programmatic tool calling | 5-10× on research | `references/subagents.md` |
| 3 | Effort calibrated per phase, model choice, task budgets | 2-3× on output tokens | `references/effort.md` |
| 4 | Prompt caching — the invariant, invalidation, gotchas | ~10× on repeated prefixes | `references/caching.md` |
| 5 | Tool definitions and output, context editing, memory | 10-30k per avoided read | `references/tool-hygiene.md` |

## The five KPIs

If you track only three, track the first three.

| # | KPI | Formula | Target |
|---|---|---|---|
| 1 | Context utilisation | peak `total_input` / window, per phase | **< 40%** |
| 2 | Compression ratio | tokens burned in phase / artifact tokens | **> 15×** |
| 3 | Tokens per completed task | sum across phases, per closed task | trend ↓ |
| 4 | Cache hit ratio | `cache_read / (cache_read + input_tokens)` | **> 70%** in Implement |
| 5 | Rework rate | phases re-run / total phases | **< 15%** |

- **KPI 5 is the canary.** High rework almost always means a badly written upstream
  artifact, not the model or the effort. Read the artifact before raising effort.
- **KPI 4 is read per phase**, never aggregated. Research is naturally low (content
  is always new); in Implement, under 70% means you have an invalidator.
- **KPI 2 under 10×** means the artifact carries material that should have stayed in
  the previous phase.

## Further references

Beyond the five above, load only what the question needs:
`references/anti-patterns.md` (the anti-pattern table) and
`references/playbook.md` (4-week rollout, model prices, beta headers).

## Related

The workflow that operationalises lever #1 is the `qrspi` skill.
