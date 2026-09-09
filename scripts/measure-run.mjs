#!/usr/bin/env node
// Measure a QRSPI run from Claude Code's own session transcripts — no API key.
//
// Every fresh session is one JSONL under ~/.claude/projects/<slug>/, and every
// assistant message in it carries `usage`. That is enough for three of the five
// KPIs in skills/token-efficiency/SKILL.md, per session and so per phase:
//
//   KPI 1  peak context      max over turns of input + cache_creation + cache_read
//   KPI 3  tokens per task   summed across the sessions you pass in
//   KPI 4  cache hit ratio   cache_read / (cache_read + uncached input), per session
//
// KPI 2 (compression ratio) also needs the artifact's own token count — that is
// scripts/measure-context-cost.mjs, and a key. KPI 5 (rework) is a count of phases
// you re-ran, which only you know.
//
// The phase is read off the session itself: /qrspi:next prints a prompt that opens
// "You are in the **Research** phase", and that text is the first user message of
// the fresh session. Sessions that did not start that way show "—".
//
//   node scripts/measure-run.mjs ~/.claude/projects/<slug>/          every session there
//   node scripts/measure-run.mjs a.jsonl b.jsonl                     just these
//   node scripts/measure-run.mjs --window 200000 <…>                 default 1,000,000
//
// Reads only. Nothing leaves the machine.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const argv = process.argv.slice(2)
const wi = argv.indexOf('--window')
const WINDOW = wi >= 0 ? Number(argv[wi + 1]) : 1_000_000
const paths = argv.filter((a, i) => !a.startsWith('--') && i !== wi + 1)
if (!paths.length) {
  console.error('usage: node scripts/measure-run.mjs [--window N] <session.jsonl | project-dir>...')
  process.exit(1)
}

const files = paths.flatMap((p) =>
  statSync(p).isDirectory()
    ? readdirSync(p).filter((f) => f.endsWith('.jsonl')).map((f) => join(p, f))
    : [p],
)

const text = (content) =>
  typeof content === 'string' ? content : (content ?? []).map((b) => b.text ?? '').join('\n')

function measure(file) {
  const s = { file, phase: '—', turns: 0, peak: 0, output: 0, input: 0, write: 0, read: 0, start: null }
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'user' && s.phase === '—') {
      const m = text(e.message?.content).match(/You are in the \*\*(\w+)\*\* phase|\/qrspi:(new)\b/)
      if (m) s.phase = m[1] ?? 'Questions'
    }
    const u = e.message?.usage
    if (e.type !== 'assistant' || !u) continue
    s.start ??= e.timestamp
    const write = u.cache_creation_input_tokens ?? 0
    const read = u.cache_read_input_tokens ?? 0
    s.turns++
    s.peak = Math.max(s.peak, u.input_tokens + write + read)
    s.input += u.input_tokens
    s.write += write
    s.read += read
    s.output += u.output_tokens ?? 0
  }
  return s
}

const rows = files.map(measure).filter((s) => s.turns).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
if (!rows.length) {
  console.error('no assistant turns with usage found')
  process.exit(1)
}

const n = (x) => x.toLocaleString('en-GB')
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—')
const cols = ['phase', 'session', 'turns', 'peak ctx', 'of window', 'output', 'uncached in', 'cache write', 'cache read', 'hit']
const data = rows.map((s) => [
  s.phase, basename(s.file).slice(0, 8), n(s.turns), n(s.peak), pct(s.peak, WINDOW),
  n(s.output), n(s.input), n(s.write), n(s.read), pct(s.read, s.read + s.input),
])
const total = rows.reduce((t, s) => ({ output: t.output + s.output, input: t.input + s.input, write: t.write + s.write, read: t.read + s.read }), { output: 0, input: 0, write: 0, read: 0 })
data.push(['total', `${rows.length} sessions`, '', '', '', n(total.output), n(total.input), n(total.write), n(total.read), pct(total.read, total.read + total.input)])

const w = cols.map((c, i) => Math.max(c.length, ...data.map((r) => r[i].length)))
const fmt = (r) => r.map((c, i) => (i < 2 ? c.padEnd(w[i]) : c.padStart(w[i]))).join('  ')
console.log(fmt(cols))
console.log(w.map((x) => '-'.repeat(x)).join('  '))
for (const r of data) console.log(fmt(r))
console.log(`\nwindow ${n(WINDOW)}. "peak ctx" is KPI 1 — the number to hold under 40%. Billable tokens per task are output + uncached in + cache write (KPI 3); cache read is what the cache saved you.`)
