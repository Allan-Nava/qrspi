# Tool hygiene: definitions, output, context editing, compaction, memory

Tool results are the #1 source of hidden context bloat. They are also the easiest to
fix.

## Do not read whole files

A `cat` of a 2000-line file is ~25k tokens, of which the agent will use 30 lines.

```bash
# ❌
cat src/services/payment.py

# ✅
grep -n "def process_refund" -A 40 src/services/payment.py
sed -n '120,180p' src/services/payment.py
```

If you are writing a harness: expose a `read` tool with mandatory `offset`/`limit`
above a certain file size.

## Truncate at the source

| Command | Instead of |
|---|---|
| `git diff --stat` then `git diff <file>` | `git diff` |
| `pytest -q --tb=line` | `pytest -v` |
| `npm test 2>&1 \| tail -50` | `npm test` |
| `docker logs --tail 100` | `docker logs` |
| `find . -name '*.ts' \| head -50` | `find .` |

Rule: if a command can produce more than ~200 lines, it needs an explicit limit
**before** you run it, not after.

## Structured output

Where you can, ask for JSON instead of prose. It is denser for the same information,
and `output_config: {format: {...}}` with `strict: true` on tools guarantees the
input validates exactly — no correction rounds.

> Note: top-level `output_format` is deprecated. Use `output_config: {format: {...}}`.
> Incompatible with citations (400).

## The other half: tool definitions

Everything above is about what tools *return*. What they *are* costs too, and
differently: a tool result is paid once, a schema is paid on **every request of the
session**, rendered at position 0 of the prefix.

It is the argument this plugin already makes about skills — *"every installed skill's
`description` sits in context permanently"*, *"a `SKILL.md` is an index; the detail
goes to `references/` and loads on demand"* — applied to tools, where it is usually
worth more.

**Measure it first.** Take the fixed-starting-context baseline from `measuring.md`:
the weight of the schemas is what `count_tokens` reports with `tools` minus what it
reports without. On a setup with a dozen MCP servers connected this is routinely the
largest single line in the fixed cost, and it is paid before the task arrives.

**Then defer what is not needed yet.** Mark tools `defer_loading: true` and declare a
search tool; definitions are then pulled in on demand instead of all being carried:

```python
tools=[
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {..., "defer_loading": True},   # every tool that can be looked up later
]
```

`tool_search_tool_bm25_20251119` is the alternative when you are matching prose rather
than patterns.

Two constraints, both returning 400: the search tool itself must not be deferred, and
at least one tool has to stay loaded (`All tools have defer_loading set`).

This is a decision taken **once, up front**, about what belongs in the prefix. It is
not a licence to vary the tool set per request — that rule in `caching.md` still
holds, and tools sit at position 0 where a change invalidates everything.

---

## Three mechanisms people confuse

| | What it does | When | Scope |
|---|---|---|---|
| **Context editing** | **deletes** old tool results / thinking blocks | context ages over many turns | within the session |
| **Compaction** | **summarises** history into one block | you approach the window limit | within the session |
| **Memory** | persistent files the agent reads/writes | state must outlive the session | across sessions |

Many long-running agents use all three.

### Context editing

Beta `context-management-2025-06-27`. This is **cleanup**, not summarisation.

```python
client.beta.messages.create(
    model="claude-opus-5", max_tokens=4096,
    betas=["context-management-2025-06-27"],
    context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
    tools=[...], messages=[...],
)
```

Strategies: `clear_tool_uses_20250919` (with optional `clear_tool_inputs: true` to
drop the parameters too) and `clear_thinking_20251015`.

It is the natural complement to tool hygiene: hygiene limits what enters, this
removes what is no longer needed.

### Server-side compaction

Beta `compact-2026-01-12`. Automatically summarises earlier context as you approach
the threshold (default 150k tokens).

> **Critical:** append `response.content` **in full** (not just the text) to your
> messages every turn. The compaction blocks in the response are what the API uses to
> substitute the compacted history on the next request. Extracting only the text
> string silently loses the compaction state.

**It is not a substitute for intentional compaction.** It is the safety net for when
a single phase blows up anyway. The real value is still in the on-disk artifacts.

### Memory

Tool `memory_20250818`. The agent reads and writes a `/memories` directory; you
implement the backend. In a QRSPI context the phase artifacts **already are** your
memory — versioned, reviewable, diffable. The memory tool is for state that cuts
across tasks (discovered conventions, recurring codebase gotchas).
