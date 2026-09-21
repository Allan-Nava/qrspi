# Prompt caching in your own agent loop

The invariant and the design rules are in `caching.md`; this file is what you meet
only when you build the loop yourself.

## Mid-conversation operating instructions

If you need to inject an instruction mid-session (mode change, dynamic state), **do
not edit the top-level `system`** — that invalidates the entire cached history.
Append a message with `role: "system"` inside `messages[]` instead:

```python
system=[{"type": "text", "text": CORE, "cache_control": {"type": "ephemeral"}}],
messages=[
    *history,
    {"role": "user", "content": "..."},
    {"role": "system", "content": "Terse mode: answers under 40 words."},
]
```

It sits **after** the history, so the cached prefix stays intact. It is also the
unforgeable operator channel (unlike a `<system-reminder>` inside a user turn, which
anyone writing to user input can forge).

Available on Opus 5, Opus 4.8, Fable 5, Fable 5.1, Mythos 5, Mythos 5.1. **Not on
Sonnet 5** — there it returns 400 (`role 'system' is not supported on this model`);
catch it and fall back to a text block in the user turn.

Constraints: it must follow a `user` message, cannot be `messages[0]`, and must be
the last element or be followed by an `assistant` turn.

## Two agent-loop-specific gotchas

**The 20-position lookback window.** Each breakpoint walks backwards **at most 20
positions** to find a previous cache entry; past that the next breakpoint finds no
cache and **silently misses**. Positions, not blocks: a run of consecutive `tool_use`
blocks counts as one, and so does a run of consecutive `tool_result` blocks — so a
turn with many *parallel* tool calls does **not** push the previous entry out. What
does is a turn adding more than 20 positions of other content: long *sequential* tool
loops, or many text and image blocks.
→ Fix: an intermediate breakpoint inside long sequential turns.

**Concurrent requests.** A cache entry becomes readable only once the first response
**starts streaming**. N parallel requests with the same prefix all pay full price.
→ Fix: make one serial warm-up request before fanning out.

## Invalidation hierarchy

Not everything invalidates everything:

Read each cell as *what happens to that tier's cache*.

| Change | tools cache | system cache | messages cache |
|---|:---:|:---:|:---:|
| Tool definitions (add/remove/reorder) | lost | lost | lost |
| Model change | lost | lost | lost |
| `speed`, web-search, citations | kept | lost | lost |
| System prompt content | kept | lost | lost |
| `tool_choice`, images | kept | kept | lost |
| `thinking` or `effort` change | model-specific | model-specific | lost |
| Message content | kept | kept | lost |

Useful implication: `tool_choice` and images survive the tools+system cache, and only
tool changes and model changes force a full rebuild. **Thinking and effort do not
belong in that sentence:** whether toggling them invalidates the upper tiers is
model-specific, so do not assume a free per-request switch — measure it on the model
you are on. On Opus 5, Fable 5.1 and Mythos 5.1 a `role: "system"` message carrying
`output_config: {effort: …}` and an empty `content` changes effort from that point
without the messages-cache invalidation a top-level change causes (beta
`mid-conversation-output-config-2026-07-01`).

## Cache diagnostics

If `cache_read_input_tokens` is **0** on repeated requests with a theoretically
identical prefix, ask the API before you diff by hand:

```python
response = client.beta.messages.create(
    betas=["cache-diagnosis-2026-04-07"],
    diagnostics={"previous_message_id": prev_id},   # None on the first turn
    ...
)
response.diagnostics
```

Pass `previous_message_id: None` on the first turn and the previous response's `id`
on each one after — and send the beta header on **every** request, not just the one
you are diagnosing: fingerprints are only stored for requests that carried it, so
retrofitting it to a single call fails with `previous_message_not_found`. When the
diagnostic is not available to you, fall back to diffing the rendered prompt bytes
between two requests — the suspects table in `caching.md`.
