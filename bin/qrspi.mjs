#!/usr/bin/env node
// qrspi installer — zero dependencies.
//
// Claude Code has no native npm plugin source: this CLI is a thin wrapper that
// takes the plugin files shipped in this package and registers them with Claude
// Code, either through the `claude plugin` CLI (preferred) or by copying them
// into ~/.claude/ (fallback, and for setups without the plugin system).

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
const MARKETPLACE = 'allan-nava'
const PLUGIN = 'qrspi'
const SKILLS = ['qrspi', 'token-efficiency']
const COMMANDS = ['new', 'next']

const ESC = String.fromCharCode(27)
const tty = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code) => (s) => (tty ? `${ESC}[${code}m${s}${ESC}[0m` : s)
const c = { bold: paint(1), dim: paint(2), red: paint(31), green: paint(32) }
const say = (...a) => console.log(...a)
const die = (msg) => {
  console.error(`${c.red('qrspi:')} ${msg}`)
  process.exit(1)
}

// --- claude CLI discovery -------------------------------------------------

function findClaude() {
  const candidates = [
    process.env.CLAUDE_BIN,
    'claude',
    join(homedir(), '.local', 'bin', 'claude'),
    join(homedir(), '.claude', 'local', 'claude'),
  ].filter(Boolean)
  for (const bin of candidates) {
    const r = spawnSync(bin, ['--version'], { stdio: 'ignore' })
    if (!r.error && r.status === 0) return bin
  }
  return null
}

function run(bin, args) {
  say(c.dim(`  $ ${[bin, ...args].join(' ')}`))
  const r = spawnSync(bin, args, { stdio: 'inherit' })
  return !r.error && r.status === 0
}

// --- install paths --------------------------------------------------------

const skillTarget = (name) => join(CLAUDE_DIR, 'skills', name)
const commandDir = join(CLAUDE_DIR, 'commands', PLUGIN)
const commandTarget = (name) => join(commandDir, `${name}.md`)

// Copy mode replaces a skill directory wholesale, so it must be certain the
// directory is its own before deleting it. `token-efficiency` is exactly what
// someone would call a hand-written skill on the same subject, and copy mode is
// not opt-in — it is the fallback when the claude CLI is missing. Every
// directory this installer writes carries the marker; anything without one is
// someone else's work and is left alone.
const MARKER = '.qrspi-installed'
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const managed = (dir) => existsSync(join(dir, MARKER))
const copyTargets = () => [...SKILLS.map(skillTarget), commandDir]

function filesUnder(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...filesUnder(p))
    else if (e.name !== MARKER) out.push(p)
  }
  return out
}

const unmanaged = () => copyTargets().filter((d) => existsSync(d) && !managed(d))

function refuse(dirs) {
  console.error(`${c.red('x')} refusing to delete content this installer did not write:\n`)
  for (const d of dirs) {
    const n = filesUnder(d).length
    console.error(`    ${d} ${c.dim(`— ${n} file${n === 1 ? '' : 's'}`)}`)
  }
  console.error(`
  Copy mode replaces a directory wholesale, so everything above would be lost,
  not merely the files that collide by name.

  Move it aside, or re-run with --force to overwrite it.`)
  process.exit(1)
}

// Commands address plugin files as `${CLAUDE_PLUGIN_ROOT}/skills/...`. Outside
// the plugin runtime that variable is unset, so copy mode rewrites it to the
// directory the skills actually land in. The rewrite assumes every reference is
// followed by `/skills`, which `check` enforces.
function rewritePluginRoot(text) {
  return text.replaceAll('${CLAUDE_PLUGIN_ROOT}/skills', join(CLAUDE_DIR, 'skills'))
}

function copyInstall({ dryRun, force }) {
  // A dry run reports rather than exits: it has to be able to say what would be
  // destroyed, which is the whole reason someone runs it first.
  const clashes = unmanaged()
  if (clashes.length && !force && !dryRun) refuse(clashes)

  const warn = (to) =>
    clashes.includes(to)
      ? ` ${c.red(`— deletes ${filesUnder(to).length} file(s) qrspi did not install`)}`
      : ''

  say(`Installing into ${c.bold(CLAUDE_DIR)} ${c.dim('(copy mode)')}`)
  for (const name of SKILLS) {
    const to = skillTarget(name)
    say(`  skill    ${name} -> ${to}${warn(to)}`)
    if (dryRun) continue
    rmSync(to, { recursive: true, force: true })
    mkdirSync(dirname(to), { recursive: true })
    cpSync(join(ROOT, 'skills', name), to, { recursive: true })
    writeFileSync(join(to, MARKER), `${VERSION}\n`)
  }
  const cmdWarn = warn(commandDir)
  for (const name of COMMANDS) {
    const to = commandTarget(name)
    say(`  command  /${PLUGIN}:${name} -> ${to}${name === COMMANDS[0] ? cmdWarn : ''}`)
    if (dryRun) continue
    mkdirSync(dirname(to), { recursive: true })
    writeFileSync(to, rewritePluginRoot(readFileSync(join(ROOT, 'commands', `${name}.md`), 'utf8')))
  }
  if (!dryRun) writeFileSync(join(commandDir, MARKER), `${VERSION}\n`)

  if (dryRun) {
    if (clashes.length) say(c.red('\nDry run — but note the deletions above; --force would be required.'))
    return say(c.dim('\nDry run — nothing written.'))
  }
  say(`\n${c.green('Installed.')} Restart Claude Code, then: /${PLUGIN}:new ENG-1234 <ticket>`)
}

function pluginInstall(bin) {
  say(`Registering the plugin with ${c.bold(bin)}`)
  // `marketplace add` fails when the marketplace is already registered; that is
  // an update, not an error.
  if (!run(bin, ['plugin', 'marketplace', 'add', ROOT])) {
    run(bin, ['plugin', 'marketplace', 'update', MARKETPLACE])
  }
  if (!run(bin, ['plugin', 'install', `${PLUGIN}@${MARKETPLACE}`])) return false
  say(`\n${c.green('Installed.')} Restart Claude Code, then: /${PLUGIN}:new ENG-1234 <ticket>`)
  return true
}

// --- commands -------------------------------------------------------------

function install(flags) {
  const dryRun = flags.has('--dry-run')
  const force = flags.has('--force')
  if (flags.has('--copy')) return copyInstall({ dryRun, force })

  const bin = findClaude()
  if (!bin) {
    say(c.dim('claude CLI not found — falling back to copy mode.\n'))
    return copyInstall({ dryRun, force })
  }
  if (dryRun) {
    say(`Would run, with ${c.bold(bin)}:`)
    say(c.dim(`  $ ${bin} plugin marketplace add ${ROOT}`))
    say(c.dim(`  $ ${bin} plugin install ${PLUGIN}@${MARKETPLACE}`))
    return
  }
  if (!pluginInstall(bin)) {
    say(c.dim('\nPlugin install failed — falling back to copy mode.\n'))
    copyInstall({ dryRun, force })
  }
}

function uninstall(flags) {
  const dryRun = flags.has('--dry-run')
  const force = flags.has('--force')
  let found = false
  for (const t of copyTargets()) {
    if (!existsSync(t)) continue
    // Same rule as install: without the marker it is not ours to delete. An
    // install predating the marker lands here — say so rather than guess.
    if (!managed(t) && !force) {
      say(c.dim(`  keep   ${t} — no ${MARKER}, so not removing it; --force overrides`))
      continue
    }
    found = true
    say(`  remove ${t}`)
    if (!dryRun) rmSync(t, { recursive: true, force: true })
  }
  if (!found) say(c.dim(`Nothing of ours to remove under ${CLAUDE_DIR}.`))
  const bin = findClaude()
  if (bin) {
    say('\nIf you installed through the plugin system, also run:')
    say(c.dim(`  $ ${bin} plugin uninstall ${PLUGIN}`))
    say(c.dim(`  $ ${bin} plugin marketplace remove ${MARKETPLACE}`))
  }
}

// --- content invariants ----------------------------------------------------
// CLAUDE.md hands a future editor three rules about content that is deliberately
// duplicated across files. Until this block existed it enforced none of them.

const PHASES = ['Questions', 'Research', 'Design', 'Structure', 'Plan', 'Implement']

// The pipeline diagram is drawn in three files, and compaction.md draws an extra
// arrow — so compare the parsed rows, not the bytes. The row shape is the one
// site/build.mjs parses; keep the two in step.
function pipelineRows(text) {
  const block = [...text.matchAll(/```\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .find((b) => b.includes('00-questions.md'))
  if (!block) return null
  const rows = []
  for (const line of block.split('\n')) {
    const m = line.match(/^(\S+)\s{2,}(.+?)\s+\u2192\s+(.+?)(?:\s{2,}\((.+)\))?\s*$/)
    if (!m) continue
    rows.push([m[1], m[2].replace(/^\u2192\s*/, ''), m[3], m[4] ?? ''].map((c) => c.trim()).join(' | '))
  }
  return rows
}

// The per-phase effort allocation is tabulated three times, in three different
// column layouts. Reduce each to phase -> set of effort levels, then compare.
function effortByPhase(text) {
  const map = new Map()
  let last = null
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    const phase = cells.find((c) => PHASES.includes(c.replace(/[`*]/g, '').trim()))
    // effort.md gives the research subagents their own row; it belongs to Research.
    const key = phase ?? (cells.some((c) => /subagent/i.test(c)) ? last : null)
    if (phase) last = phase
    if (!key) continue
    const found = [...line.matchAll(/`(low|medium|high|xhigh|max)`/g)].map((m) => m[1])
    if (!found.length) continue
    map.set(key, new Set([...(map.get(key) ?? []), ...found]))
  }
  return map
}

const efforts = (set) => [...(set ?? [])].sort().join('+') || '\u2014'

// Package sanity check — also `npm test`. Verifies the invariants the installer
// and the plugin runtime both depend on.
function check() {
  const problems = []
  const versions = new Set()
  for (const f of ['package.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) {
      problems.push(`missing ${f}`)
      continue
    }
    let json
    try {
      json = JSON.parse(readFileSync(p, 'utf8'))
    } catch (e) {
      problems.push(`${f}: invalid JSON — ${e.message}`)
      continue
    }
    versions.add(json.version ?? json.metadata?.version)
  }
  if (versions.size > 1) problems.push(`version mismatch across manifests: ${[...versions].join(', ')}`)

  for (const name of SKILLS) {
    const p = join(ROOT, 'skills', name, 'SKILL.md')
    if (!existsSync(p)) {
      problems.push(`missing skills/${name}/SKILL.md`)
      continue
    }
    const body = readFileSync(p, 'utf8')
    if (!/^name:\s*\S+/m.test(body.split('---')[1] ?? '')) {
      problems.push(`skills/${name}/SKILL.md: no name in frontmatter`)
    }
    const lines = body.split('\n').length
    if (lines > 150) {
      problems.push(`skills/${name}/SKILL.md is ${lines} lines — a SKILL.md is an index, keep it near 100`)
    }
  }

  for (const name of COMMANDS) {
    const p = join(ROOT, 'commands', `${name}.md`)
    if (!existsSync(p)) {
      problems.push(`missing commands/${name}.md`)
      continue
    }
    const body = readFileSync(p, 'utf8')
    for (const m of body.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}(\/[\w.-]*)?/g)) {
      if (m[1] !== '/skills') {
        problems.push(`commands/${name}.md: \${CLAUDE_PLUGIN_ROOT}${m[1] ?? ''} is not rewritten by copy mode — see rewritePluginRoot()`)
      }
    }
  }

  const refDir = join(ROOT, 'skills', 'qrspi', 'references')
  const refs = existsSync(refDir) ? readdirSync(refDir).filter((f) => f.endsWith('.md')) : []
  if (!refs.length) problems.push('skills/qrspi/references/ is empty — /qrspi:new has nothing to copy')
  for (const f of refs) {
    // 05 is a prompt, not an artifact; 99 is mutable state.
    if (f === '05-implement.md' || f === '99-progress.md') continue
    const body = readFileSync(join(refDir, f), 'utf8')
    if (!body.includes('- [ ]')) {
      problems.push(`skills/qrspi/references/${f}: no unticked checkbox — /qrspi:next detects phase completion by grepping for them`)
    }
    if (!/^## Status$/m.test(body)) {
      problems.push(`skills/qrspi/references/${f}: no '## Status' section — CLAUDE.md requires every artifact to end with one, and commands/next.md describes phase detection in those terms`)
    }
  }

  // The pipeline diagram, duplicated in three files.
  const drawn = ['README.md', 'skills/qrspi/SKILL.md', 'skills/token-efficiency/references/compaction.md'].map(
    (f) => ({ f, rows: existsSync(join(ROOT, f)) ? pipelineRows(readFileSync(join(ROOT, f), 'utf8')) : null }),
  )
  const [canonical, ...copies] = drawn
  if (!canonical.rows?.length) {
    problems.push(`${canonical.f}: no pipeline block found — site/build.mjs reads it too`)
  } else {
    for (const copy of copies) {
      if (!copy.rows?.length) {
        problems.push(`${copy.f}: no pipeline block found`)
        continue
      }
      for (let i = 0; i < Math.max(canonical.rows.length, copy.rows.length); i++) {
        if (canonical.rows[i] !== copy.rows[i]) {
          problems.push(
            `pipeline row ${i + 1} disagrees\n      ${canonical.f}: ${canonical.rows[i] ?? '(missing)'}\n      ${copy.f}: ${copy.rows[i] ?? '(missing)'}`,
          )
        }
      }
    }
  }

  // The per-phase effort allocation, tabulated three times.
  const allocations = ['skills/qrspi/SKILL.md', 'commands/next.md', 'skills/token-efficiency/references/effort.md'].map(
    (f) => ({ f, map: existsSync(join(ROOT, f)) ? effortByPhase(readFileSync(join(ROOT, f), 'utf8')) : new Map() }),
  )
  for (const phase of PHASES) {
    const said = allocations.map((a) => efforts(a.map.get(phase)))
    if (new Set(said).size > 1) {
      problems.push(`effort for ${phase} disagrees — ${allocations.map((a, i) => `${a.f}: ${said[i]}`).join(', ')}`)
    }
  }

  if (problems.length) {
    for (const p of problems) console.error(`${c.red('x')} ${p}`)
    process.exit(1)
  }
  say(`${c.green('ok')} — ${SKILLS.length} skills, ${COMMANDS.length} commands, ${refs.length} references, manifests in sync`)
}

function help() {
  say(`${c.bold('qrspi')} — install the QRSPI plugin for Claude Code

  npx qrspi install            register the plugin (claude CLI, or copy fallback)
  npx qrspi install --copy     force copy into ${CLAUDE_DIR}
  npx qrspi install --dry-run  show what would happen, change nothing
  npx qrspi install --force    overwrite directories qrspi did not install
  npx qrspi uninstall          remove the copied skills and commands
  npx qrspi path               print the plugin root (for /plugin marketplace add)
  npx qrspi check              validate this package

Manual alternative, no npm involved:
  /plugin marketplace add Allan-Nava/qrspi
  /plugin install qrspi`)
}

const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('-')))
switch (cmd) {
  case 'install':
    install(flags)
    break
  case 'uninstall':
    uninstall(flags)
    break
  case 'path':
    say(ROOT)
    break
  case 'check':
    check()
    break
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    help()
    break
  default:
    die(`unknown command "${cmd}" — try \`npx qrspi help\``)
}
