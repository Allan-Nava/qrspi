# Prompt caching

## The single invariant

> **Caching is a prefix match. One byte changing at position N invalidates
> everything from N onward.**

Render order: **`tools` → `system` → `messages`**.

Everything else follows from this. Get the ordering right and caching works almost by
itself. Get it wrong and no amount of `cache_control` markers saves you.

## Design rules

- **Stable content first, volatile content last.** Always.
- **Never** `datetime.now()`, session IDs, user IDs, or conditional sections in the
  system prompt. They sit at the head of the prefix and invalidate everything below.
- **Serialise tools in deterministic order** (sort by name). A `json.dumps()` without
  `sort_keys=True`, or iterating a `set`, is enough to break everything.
- **Do not change the tool set mid-session.** Tools render at position 0. If you need
  a "mode", pass it as message content, not by swapping tools. The one sanctioned way
  to add a tool without a rebuild is the mid-conversation tool changes beta
  (`mid-conversation-tool-changes-2026-07-01`, Opus 5 onward): the tool is declared
  up front with `defer_loading: true` and enabled later by a `tool_addition` block, so
  the prefix never moves; with `inline-tools-2026-09-15` as well, the block may carry
  the full definition instead of a reference.
- Max **4** breakpoints per request.

Writing the agent loop yourself? The invalidation matrix, the 20-position lookback,
concurrent warm-up, mid-conversation `role: "system"` messages and cache diagnostics
are in `caching-api.md`. This file is the part everyone needs.

## Minimum cacheable length (not monotonic!)

| Model | Minimum |
|---|---:|
| Opus 5.5, Opus 5, Fable 5, Fable 5.1, Mythos 5, Mythos 5.1 | **512** |
| Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5 | 1024 |
| Opus 4.7 | 2048 |
| Opus 4.6, Opus 4.5, Haiku 4.5 | **4096** |

A 3k-token prompt caches on Opus 5 and **silently does not cache** on Opus 4.6 or
Haiku 4.5. No error — just `cache_creation_input_tokens: 0`.

## Economics

- Cache read: **0.1×** — except Fable 5.1 and Mythos 5.1, where it is **0.025×**
  ($0.25/MTok on a $10 input price), and Opus 5.5, where it is **0.05×** ($0.20/MTok
  on $4).
- Cache write: **1.25×** (5 min TTL) / **2×** (1h TTL)
- Break-even: 5-min TTL pays off from **2 requests** (1.25 + 0.1 = 1.35 vs 2);
  1h TTL from **3** (2 + 0.2 = 2.2 vs 3). On Fable 5.1 the read is nearly free, so the
  whole question is whether the write gets read at all.

The 1-hour TTL keeps entries alive across gaps in bursty traffic, but the doubled
write needs more reads to pay for itself. For continuous agentic sessions the default
TTL is fine; for a team resuming a task after an hour-long meeting, use 1h.

## Verification

If `cache_read_input_tokens` is **0** on repeated requests with a theoretically
identical prefix, there is a silent invalidator.

**Ask the API before you diff by hand** — cache diagnostics (beta) reports where the
prefix diverged; the call is in `caching-api.md`. Without it, diff the rendered prompt
bytes between two requests. The usual suspects, by frequency:

| Pattern | Why it breaks |
|---|---|
| `datetime.now()` in the system prompt | different prefix every request |
| `uuid4()` / request ID at the head | same |
| `json.dumps(d)` without `sort_keys=True` | non-deterministic serialisation |
| session/user ID interpolated into system | per-user prefix, zero sharing |
| `if flag: system += ...` | every flag combination is a distinct prefix |
| `tools=build_tools(user)` | tools are at position 0 |

## In Claude Code

Caching is automatic; what you control is whether the prefix stays stable, and the
harness now tells you when it did not. After the first response, `/usage` carries a
`Prompt cache (main)` line: the session's hit ratio, its miss count and whether the
cache is warm right now (v2.1.251+), **with the last miss's likely cause** when the
harness can name one (`tool definitions changed`, for instance; v2.1.260+). The KPI 4 target — over
70% in Implement — is read off that line; a status-line script gets the same numbers
from the `prompt_cache` object.

What breaks the prefix from inside a session, in the harness's terms:

- **An MCP server connecting or disconnecting, or a tool being denied outright** —
  but only when its definitions sit in the prefix. With tool search on (the default on
  supported models) MCP tools are deferred and a server change appends rather than
  rebuilds; a server marked `alwaysLoad`, or a gateway that rejects tool search, puts
  them back in the prefix, and the line will say `tool definitions changed`.
- **`/model`.** Caches are model-scoped. Switching mid-phase rebuilds everything.
- **`/effort`.** Each level has its own cache on most models; the harness asks before
  applying it while the cache is warm. On Fable 5.1 (v2.1.260+) and Opus 5.5 with an
  API key or a subscription the level changes in place and the cache survives — not
  through Bedrock, Vertex or a Claude apps gateway.
- **Fast mode.** Turning it on adds a header that is part of the cache key: one full
  miss, billed at fast-mode rates, then cached again.
- **A long idle gap.** The TTL is one hour on a subscription within plan usage, five
  minutes on an API key or once usage credits are being drawn; the first message after
  that misses. `promptCacheTtl: "1h"` in settings (or `CLAUDE_CODE_PROMPT_CACHE_TTL`)
  buys the hour on an API key — worth it for a phase that pauses for review, not for
  one that never idles past five minutes.
- **`/compact`.** By design: the history is replaced, so the conversation layer
  rebuilds. Warm, the summarisation request itself reads the old prefix from cache;
  after a break longer than the TTL it reprocesses the whole history uncached, which is
  why compacting a resumed old session is the expensive case. A phase boundary in QRSPI
  is a `/clear`, not a `/compact`, and pays neither.

Editing `CLAUDE.md` mid-session does **not** break the cache — and does not apply
either. It is read once at session start; the edit lands on the next `/clear`,
`/compact` or restart. Skills, commands and plan mode append their instructions as
messages, so they are cache-safe too.

None of these are reasons not to do the thing — they are reasons to do it at a phase
boundary, where the cache is being rebuilt anyway. Subagents have their own entry and
their own bucket: five minutes even on a subscription, unless `subagentPromptCacheTtl`
or `cacheTtl` under `experimental` in the agent's frontmatter says `1h`.
