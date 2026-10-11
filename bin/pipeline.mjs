// The pipeline diagram — `Phase  context  →  artifact  (size)` — is drawn in three
// Markdown files and is the site's hero. This module is the one definition of which
// fenced block is the diagram, what a row looks like, and what else a line inside the
// block may be. Both readers import it: bin/qrspi.mjs (`npx qrspi check`) and
// site/build.mjs. Keeping two copies in step used to be a comment, and the comment
// lost — a row malformed the same way in all three files parsed to three equal shorter
// lists and left the site silently (#141).
//
// No imports, not even node:*, and nothing runs at load: `bin` ships whole in
// package.json#files and `check` runs with no `npm install` on Node 18-24.

// `Questions   ~20k burned    →  00-questions.md   (~3k)`
//    1 phase     2 context       3 output           4 size
//
// The arrow is U+2192, as site/build.mjs:87 writes it. compaction.md draws a second one
// at the head of the context column (`Questions   →  ~20k burned   →  …`); the strip in
// readBlock removes it. Without that strip those rows do not compare equal to README's
// and `npm test` fails on an untouched diagram.
const ROW = /^(\S+)\s{2,}(.+?)\s+→\s+(.+?)(?:\s{2,}\((.+)\))?\s*$/

// The block is chosen by content, never by position: a fenced block added above the
// diagram must not change which block either reader sees.
const MARKER = '00-questions.md'

// Read a whole file's text. Returns { found: false } when it holds no pipeline block, or
// { found: true, start, end, rows, refused } where start/end are the 1-based lines of the
// opening and closing fence, rows[i] is { phase, context, output, size, key, line } (size
// null when the row has none, key the normalised comparison string, line 1-based) and
// refused[i] is { line, text } for every line inside the block that is neither blank nor
// a row.
export function readPipeline(text) {
  const lines = text.split(/\r?\n/)
  let open = -1
  let bare = false
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('```')) continue
    if (open === -1) {
      open = i
      bare = lines[i] === '```'
      continue
    }
    if (bare && lines.slice(open + 1, i).some((l) => l.includes(MARKER))) return readBlock(lines, open, i)
    open = -1
    bare = false
  }
  return { found: false }
}

function readBlock(lines, open, close) {
  const rows = []
  const refused = []
  for (let i = open + 1; i < close; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const m = line.match(ROW)
    if (!m) {
      refused.push({ line: i + 1, text: line })
      continue
    }
    const phase = m[1].trim()
    const context = m[2].replace(/^→\s*/, '').trim()
    const output = m[3].trim()
    const size = m[4]?.trim() ?? null
    rows.push({ phase, context, output, size, key: [phase, context, output, size ?? ''].join(' | '), line: i + 1 })
  }
  return { found: true, start: open + 1, end: close + 1, rows, refused }
}
