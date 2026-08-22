#!/usr/bin/env node
// Measure what this plugin costs a session, in real tokens.
//
// Everything here is static — it counts files, not runs. The figures that need an
// actual six-phase run (the Research burn, the compression ratios, the per-phase
// starting contexts) are issue #10; this covers the part that can be settled without
// one, so the fixed cost at least stops being an assertion.
//
//   ANTHROPIC_API_KEY=sk-ant-… node scripts/measure-context-cost.mjs
//   node scripts/measure-context-cost.mjs --model claude-sonnet-5
//
// No dependencies, like everything else here: count_tokens is one POST, and Node has
// had fetch since 18. `tiktoken` is not an option — it is an OpenAI tokenizer and
// underestimates Claude by 15-20% on prose and more on code, which is precisely the
// mistake skills/token-efficiency/references/measuring.md tells you not to make.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS = ['qrspi', 'token-efficiency']
const ENDPOINT = 'https://api.anthropic.com/v1/messages/count_tokens'

const argv = process.argv.slice(2)
const model = argv[argv.indexOf('--model') + 1] || 'claude-opus-5'
const KEY = process.env.ANTHROPIC_API_KEY

if (!KEY) {
  console.error(`ANTHROPIC_API_KEY is not set.

Counts are model-specific and come from the API, so this needs a key:

  ANTHROPIC_API_KEY=sk-ant-… node scripts/measure-context-cost.mjs

Nothing is sent anywhere except the files' own text, to count_tokens.`)
  process.exit(1)
}

async function count(text) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: text }] }),
  })
  if (!r.ok) {
    console.error(`count_tokens failed: ${r.status} ${await r.text()}`)
    process.exit(1)
  }
  return (await r.json()).input_tokens
}

const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const num = (n) => n.toLocaleString('en-GB').padStart(7)
const row = (label, n, extra = '') => console.log(`  ${label.padEnd(30)}${num(n)}  ${extra}`)

// The description frontmatter is the whole permanent cost: it is in context in every
// session, whether or not the skill ever fires. This is the number the README's
// "two skills, not six" decision trades against.
console.log(`\nmodel: ${model}\n`)
console.log('PERMANENT — in context every session, fired or not')
let permanent = 0
for (const s of SKILLS) {
  const body = read(`skills/${s}/SKILL.md`)
  const desc = body.match(/^description:\s*([\s\S]*?)\n(?=\w+:|---)/m)?.[1].trim()
  if (!desc) {
    console.error(`skills/${s}/SKILL.md: no description in frontmatter`)
    process.exit(1)
  }
  const n = await count(desc)
  permanent += n
  row(s, n)
}
row('TOTAL', permanent)
console.log(`  ${''.padEnd(30)}${''.padStart(7)}  six phase-skills would cost ~${(permanent / 2) * 6 | 0}`)

// Trigger cost against deferred cost is the progressive-disclosure claim: a SKILL.md
// is an index, and the references are only paid one at a time, if at all.
console.log('\nON TRIGGER — the whole SKILL.md, once the skill fires')
const trigger = {}
for (const s of SKILLS) {
  trigger[s] = await count(read(`skills/${s}/SKILL.md`))
  row(s, trigger[s])
}

console.log('\nON DEMAND — one reference at a time')
let corpus = Object.values(trigger).reduce((a, b) => a + b, 0)
for (const s of SKILLS) {
  const dir = join(ROOT, 'skills', s, 'references')
  const refs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []
  let sub = 0
  for (const f of refs) {
    const n = await count(readFileSync(join(dir, f), 'utf8'))
    sub += n
    row(`${s.slice(0, 2)}/${f}`, n)
  }
  corpus += sub
  row(`  subtotal ${s}`, sub, `${(sub / trigger[s]).toFixed(1)}x deferred behind the index`)
}

console.log('\nARTIFACT TEMPLATES — the floor of each phase artifact')
const dir = join(ROOT, 'skills', 'qrspi', 'references')
for (const f of readdirSync(dir).filter((f) => /^0\d/.test(f)).sort()) {
  row(basename(f), await count(readFileSync(join(dir, f), 'utf8')))
}

const pct = ((100 * permanent) / corpus).toFixed(2)
console.log(`\ncorpus ${corpus.toLocaleString('en-GB')} tokens · permanent ${permanent.toLocaleString('en-GB')} (${pct}%) · deferred ${(100 - pct).toFixed(2)}%\n`)
