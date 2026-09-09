# Effort and model selection

The most underrated lever on **output** tokens — which cost 5× input.

## `output_config.effort`

```python
client.messages.create(
    model="claude-opus-5",
    output_config={"effort": "medium"},   # low | medium | high | xhigh | max
    thinking={"type": "adaptive"},
    ...
)
```

Default: `high`. Lower effort means fewer preambles, more consolidated tool calls,
terser confirmations, less thinking.

## Allocation per QRSPI phase

| Phase | Effort | Model | Why |
|---|---|---|---|
| Questions | `medium` | Opus 5 | needs judgement, not depth |
| Research | `medium` | Opus 5 | it is search, not reasoning |
| ↳ research subagents | `low` | Sonnet 5 | they read and summarise |
| Design | `xhigh` | Opus 5 | errors here cost the most downstream |
| Structure | `high` | Opus 5 | decomposition, structured work |
| Plan | `xhigh` / `max` | Opus 5 | the plan multiplies everything |
| Implement | `high` / `xhigh` | Opus 5 | quality/token sweet spot |
| Review / verification | `high` | Opus 5 | |

`effort` is **rejected on Haiku 4.5** — hence Sonnet 5 on the subagent row, which is
the cheapest current model that takes it. Haiku 4.5 is cheaper still ($1/$5 against
$2/$10) and remains a fine reading subagent, but it is configured the old way:
`thinking: {type: "enabled", budget_tokens: N}`, no `effort`.

The principle: **spend effort where errors propagate.** A Plan error multiplies
across the whole implementation; a Research error gets caught by the Design review.

## Adaptive thinking

On every current model except Haiku 4.5 use `thinking: {type: "adaptive"}` — Claude
decides how much to think. Haiku 4.5 still takes `{type: "enabled", budget_tokens: N}`
(minimum 1024, and less than `max_tokens`). `budget_tokens` is **removed** on Opus 5 / 4.8 / 4.7, Sonnet 5 and Fable 5
(returns 400). On Opus 5 thinking is **on by default**: omit the parameter and it
still runs adaptive.

Do not disable thinking to save tokens: on Opus 5 with `thinking: {type: "disabled"}`
the model can write a tool call in **visible text** instead of a `tool_use` block —
the turn succeeds, the call never fires, no error is raised. In an agent loop that
text pollutes subsequent turns. If you want to spend less, **lower the effort, do not
turn off thinking.**

## Task budget

For long agentic loops, `task_budget` gives Claude a token ceiling it is **aware
of**, so it paces itself and closes gracefully instead of being truncated (unlike
`max_tokens`, which is an imposed cut the model knows nothing about).

```python
with client.beta.messages.stream(
    model="claude-opus-5",
    max_tokens=128000,
    output_config={"effort": "high",
                   "task_budget": {"type": "tokens", "total": 64000}},
    betas=["task-budgets-2026-03-13"],
    messages=[...], tools=[...],
) as stream:
    response = stream.get_final_message()
```

Minimum `total`: 20,000. Use streaming: with large `max_tokens`, non-streaming
requests hit HTTP timeouts.

## In Claude Code

Effort is a session setting, not a request parameter, and a fresh session per phase
means it is set once at the boundary:

| Where | How |
|---|---|
| at launch | `claude --effort xhigh` |
| in the session | `/effort xhigh` — takes effect on the next request; `/effort` alone opens a slider; `/effort auto` clears the saved level |
| in the `/model` picker | left/right adjusts effort alongside the model |
| persistently | `effortLevel` in `~/.claude/settings.json`, or per model under `modelSettings.<model-id>.effortLevel` |
| everywhere, overriding the file | `CLAUDE_CODE_EFFORT_LEVEL=xhigh` |
| per subagent | `effort:` in the agent's frontmatter |

`max` is session-only unless set through the environment variable. Models that do not
support effort — Haiku 4.5 among them — ignore the setting; for those the lever is
`MAX_THINKING_TOKENS`, which adaptive-reasoning models in turn ignore. The phase
prompts state their recommended effort; `claude --effort <level>` when opening the
phase session is the cheapest way to honour it.
