import type { Register } from 'claude-code'

import type { PhaseState, Snapshot, Task } from '../types'

// The pane reads thoughts/<task>/ the way /qrspi:next does: a phase is done when every
// box under its `## Status` heading is ticked and no `_(to be filled` placeholder is
// left; Implement is the step table of 99-progress.md. It only reads, never writes.

const PANE = 'qrspi'
const PHASES: [string, string, string][] = [
  ['Q', 'Questions', '00-questions.md'],
  ['R', 'Research', '01-research.md'],
  ['D', 'Design', '02-design.md'],
  ['S', 'Structure', '03-structure.md'],
  ['P', 'Plan', '04-plan.md'],
]
const EMPTY: Snapshot = { root: '', hasThoughts: false, tasks: [], readAt: 0 }
const SNAPSHOT = { plugin: 'qrspi-pane', key: 'snapshot' } as const
// The project the pane reads: the session's root unless /qrspi-status <path> named another.
const ROOT = { plugin: 'qrspi-pane', key: 'root' } as const

// The lines under `## Status`, up to the next `## ` heading.
export function statusBoxes(text: string): { done: boolean; label: string }[] {
  const at = text.search(/^## Status\s*$/m)
  if (at < 0) return []
  const out: { done: boolean; label: string }[] = []
  for (const line of text.slice(at).split('\n').slice(1)) {
    if (/^## /.test(line)) break
    const m = /^- \[( |x|X)\] (.*)$/.exec(line)
    if (m) out.push({ done: m[1] !== ' ', label: m[2] })
  }
  return out
}

export function phaseState(letter: string, name: string, text: string | null): PhaseState {
  if (text === null) return { letter, name, state: 'absent', open: [] }
  const boxes = statusBoxes(text)
  const open = boxes.filter(b => !b.done).map(b => b.label)
  const placeholder = text.includes('_(to be filled')
  const done = boxes.length > 0 && open.length === 0 && !placeholder
  if (placeholder && open.length === 0) open.push('placeholders left (_(to be filled …)_)')
  return { letter, name, state: done ? 'done' : 'open', open }
}

// Rows of the step table: `| S1 | ✅ done | …`. A step counts as done when its status
// cell carries the done glyph or the word.
export function stepCounts(text: string | null): { done: number; total: number } {
  if (text === null) return { done: 0, total: 0 }
  let done = 0
  let total = 0
  for (const line of text.split('\n')) {
    const m = /^\|\s*S\d+\s*\|\s*([^|]*)\|/.exec(line)
    if (!m) continue
    total++
    if (/✅|\bdone\b/i.test(m[1])) done++
  }
  return { done, total }
}

async function readOrNull($: any, path: string) {
  try {
    return (await $.fs.read(path)) as string
  } catch {
    return null
  }
}

async function scan($: any): Promise<Snapshot> {
  const { value: chosen = '' } = await $.state.get(ROOT)
  const root: string = chosen || (await $.session.root())
  const thoughts = `${root}/thoughts`
  if (!(await $.fs.exists(thoughts))) return { root, hasThoughts: false, tasks: [], readAt: Date.now() }
  const entries = await $.fs.list(thoughts)
  const tasks: Task[] = []
  for (const entry of entries) {
    if (entry.kind !== 'dir') continue
    const dir = `${thoughts}/${entry.name}`
    const phases: PhaseState[] = []
    for (const [letter, name, file] of PHASES) {
      phases.push(phaseState(letter, name, await readOrNull($, `${dir}/${file}`)))
    }
    if (phases.every(p => p.state === 'absent')) continue
    tasks.push({ dir: entry.name, phases, steps: stepCounts(await readOrNull($, `${dir}/99-progress.md`)) })
  }
  tasks.sort((a, b) => a.dir.localeCompare(b.dir))
  return { root, hasThoughts: true, tasks, readAt: Date.now() }
}

// A scan that fails leaves the last snapshot in place; the pane says when it was read.
async function scanOrNull($: any): Promise<Snapshot | null> {
  try {
    return await scan($)
  } catch {
    return null
  }
}

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const register: Register = on => {
  let stop: (() => void) | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'qrspi-status',
      description: 'Show each QRSPI task in thoughts/ — its phase, what blocks it, the next command. Optional: a project path',
    })
    const first = await scanOrNull($)
    if (first) await $.state.set(SNAPSHOT, first)
    stop?.()
    stop = $.clock.every(10_000, async () => {
      const s = await scanOrNull($)
      if (s) await $.state.set(SNAPSHOT, s)
    })
    return next(e)
  })

  on('command.run', { command: 'qrspi-status' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg) {
      const base: string = await $.session.root()
      const path = arg.startsWith('/') ? arg : `${base}/${arg}`
      if (!(await $.fs.exists(path))) return { text: `qrspi-status: no such directory: ${arg}` }
      await $.state.set(ROOT, path)
    } else {
      await $.state.set(ROOT, '')
    }
    const s = await scanOrNull($)
    if (s) await $.state.set(SNAPSHOT, s)
    await $.ui.open({ id: PANE, title: 'QRSPI' })
    const { value: { tasks, hasThoughts } = EMPTY } = await $.state.get(SNAPSHOT)
    return { text: hasThoughts ? `QRSPI pane opened — ${tasks.length} task(s) in thoughts/.` : 'QRSPI pane opened — no thoughts/ in this project.' }
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    const s = await scanOrNull($)
    if (s) await $.state.set(SNAPSHOT, s)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { value: snap = EMPTY } = await $.state.get(SNAPSHOT)
    const width = Math.max(24, (e.props?.bodyColumns ?? 60) - 2)

    if (!snap.hasThoughts) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No thoughts/ directory in {short(snap.root, width)}.</Text>
          <Text dimColor>Start a task with /qrspi:new &lt;TASK-ID&gt; &lt;ticket&gt;.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>{short(snap.root, width)}</Text>
        {snap.tasks.length === 0 && <Text dimColor>thoughts/ holds no QRSPI task yet.</Text>}
        {snap.tasks.map(task => {
          const current = task.phases.find(p => p.state !== 'done')
          const implementing = current === undefined
          const finished = implementing && task.steps.total > 0 && task.steps.done === task.steps.total
          return (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>{short(task.dir, width)}</Text>
              <Text>
                {task.phases.map(p => (
                  <Text
                    color={p.state === 'done' ? 'green' : p === current ? 'yellow' : undefined}
                    dimColor={p.state !== 'done' && p !== current}
                    bold={p === current}
                  >
                    {p.letter}{' '}
                  </Text>
                ))}
                <Text color={finished ? 'green' : implementing ? 'yellow' : undefined} dimColor={!implementing} bold={implementing && !finished}>
                  I {task.steps.total > 0 ? `${task.steps.done}/${task.steps.total}` : ''}
                </Text>
              </Text>
              {current && current.state === 'absent' && <Text dimColor>{current.name}: not started</Text>}
              {current && current.state === 'open' && (
                <Box flexDirection="column">
                  <Text>{current.name} waits on:</Text>
                  {current.open.slice(0, 3).map(label => (
                    <Text dimColor>  {short(label, width - 2)}</Text>
                  ))}
                  {current.open.length > 3 && <Text dimColor>  and {current.open.length - 3} more</Text>}
                </Box>
              )}
              {implementing && !finished && <Text dimColor>Implement: {task.steps.done} of {task.steps.total} steps done</Text>}
              {finished ? (
                <Text color="green">every step done</Text>
              ) : (
                <Text dimColor>{short(`/qrspi:next thoughts/${task.dir}`, width)}</Text>
              )}
            </Box>
          )
        })}
        <Text dimColor>read {snap.readAt ? new Date(snap.readAt).toISOString().slice(11, 19) : '—'} UTC · refreshes every 10 s and after each turn</Text>
      </Box>
    )
  })
}
