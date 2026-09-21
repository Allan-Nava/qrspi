# Intentional compaction — the 10-20× lever

The heart of QRSPI, and on its own worth more than every other optimisation combined.

## Auto-compact vs intentional compaction

| | Auto-compact | Intentional compaction |
|---|---|---|
| **When** | when the window is nearly full | at a phase boundary, decided by you |
| **What it keeps** | the model decides | you decide, in writing |
| **Where it ends up** | in context, ephemeral | on disk, versioned in git |
| **Reviewable** | no | yes, by humans and other agents |
| **Ratio** | ~2-3× | **15-30×** |

Auto-compact is *blind* and *late* compression: it fires when the context-rot damage
is already done, and it picks what to throw away.

## The pattern

**Every phase writes an artifact to disk. The next phase restarts from zero context
reading only that artifact.**

```
Questions   →  ~15k burned     →  00-questions.md   (~1k)
Research    →  150-250k        →  01-research.md    (~5k)
Design      →  starts at 6k    →  02-design.md      (~4k)
Structure   →  starts at 9k    →  03-structure.md   (~3k)
Plan        →  starts at 12k   →  04-plan.md        (~6k)
Implement   →  starts at 7k    →  code + PR
```

The point is not only cost. It is that **Implement runs steadily under 20% context**
— the zone where the model performs best. Without intentional compaction, Implement
would start from 250k tokens of Research residue and end past 50%.

## Operating rules

The six rules — fresh session per phase, the artifact as the only channel,
self-contained artifacts, the ticket kept out of Research, the 40% alarm, the human
checkpoint — are the `qrspi` skill's `SKILL.md`, with the zero-context plan test that
makes them checkable. Two of them carry the compression:

- **The 40% alarm applies *inside* a phase too.** Long Implement runs stop at ~40%,
  write `99-progress.md` (done / todo / unexpected / decisions), close, reopen from it.
- **The ticket does not enter Research.** Hand the agent "add a field to the users
  table" and it hunts for evidence that the field is needed instead of mapping the
  problem. Research returns facts; the ticket returns in Design.

Which facts survive the compression, and how to state them so a zero-context reader
can act, is the `handoff` skill.

## Why not one giant prompt

QRSPI's predecessor was RPI (Research, Plan, Implement): three monolithic prompts of
85+ instructions each. The measured problem is **instruction budget overflow**: an
LLM reliably follows on the order of 150-200 instructions. An 85-instruction prompt,
plus CLAUDE.md, plus tool schemas, plus MCP servers, saturates the budget before the
task even arrives.

Short phases are not only about compressing tokens: they are about **staying inside
the instruction budget**.

## In Claude Code

Intentional compaction is two things you already have: `/clear` and a file. Close the
phase by writing the artifact, `/clear` (or a new terminal), open the next phase from
the artifact. `/rename` the session first if you may want `/resume` later.

The harness's own compaction is the safety net, not the method — and it is tunable:

| Control | What it does |
|---|---|
| `/compact <instructions>` | summarise now, keeping what the instructions name — `/compact Focus on the deviations and the failing test` |
| `# Compact instructions` in `CLAUDE.md` | standing instructions for every compaction in that repo |
| `/autocompact 400k` · `autoCompactWindow` · `CLAUDE_CODE_AUTO_COMPACT_WINDOW` · `--autocompact` | the context size at which auto-compact fires; default is the model's limit (Sonnet 5: ~967k) |

Setting the window to 400k on a 1M model makes the harness enforce the 40% rule for
you — but it enforces it *blindly*, which is the whole objection in the table above.
Treat auto-compact firing as the alarm that you missed a phase boundary, not as the
boundary. `/usage` shows the session's tokens; a status line can show context use
continuously.
