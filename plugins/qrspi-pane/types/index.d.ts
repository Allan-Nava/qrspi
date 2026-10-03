// One artifact phase as read off its file: absent, every Status box ticked and no
// placeholder left (done), or still open, with the Status lines that are not ticked.
export type PhaseState = {
  letter: string
  name: string
  state: 'absent' | 'done' | 'open'
  open: string[]
}

export type Task = {
  dir: string
  phases: PhaseState[]
  steps: { done: number; total: number }
}

export type Snapshot = {
  root: string
  hasThoughts: boolean
  tasks: Task[]
  readAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'qrspi-pane': { snapshot: Snapshot; root: string }
  }
}
