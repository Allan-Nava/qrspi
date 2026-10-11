# 04 · Plan — 141 A pipeline row that does not parse vanishes silently

**Written against:** `8be8a5d`

---

## References

- Structure: [`03-structure.md`](./03-structure.md)
- Design: [`02-design.md`](./02-design.md)

**Execution order** (`03-structure.md` § Recommended execution order). One session per
step, one commit per step:

1. **S1** — nothing may start before it; everything is written against its interface
2. **S2 ‖ S3** — different files, no shared read. Separate worktrees are safest; in one
   checkout their negative tests must not run at the same time (both `sed -i README.md`)
3. **S4 ‖ S5 ‖ S6**
4. **S7** — on the pushed branch

The code change is complete after step 2. Everything after it is documentation and
verification.

---

## Minimum context for the executor

`qrspi` is a Claude Code plugin: Markdown plus one dependency-free installer script. There
is **no build step, no test framework, no linter and no formatter config**. Every command
below is run from the repo root.

| Fact | Where |
|---|---|
| The only automated check is `npm test` == `node bin/qrspi.mjs check` | `package.json:23` |
| `npm run build:site` == `node site/build.mjs`, which needs `marked` (the one devDependency) — run `npm install` once before any site command | `package.json:22`, `package.json#devDependencies` |
| `bin` is listed in `package.json#files` as a **whole directory**, so a new `bin/*.mjs` ships in the tarball with no manifest edit | `package.json:9-17` |
| `check` runs with **no `npm install`** on Node 18, 20, 22 and 24 — so `bin/pipeline.mjs` may import nothing at all, and must use no syntax or API newer than Node 18 | `.github/workflows/ci.yml:20-41` |
| `check` collects strings in a local `problems` array and, if it is non-empty, prints each as `x <problem>` and exits 1 | `bin/qrspi.mjs:565-568` |
| No message in `check` carries a line number today — the established form is `` `${file}: <prose>` ``. `path:line` is the first of its kind | `bin/qrspi.mjs:304`, `:311`, `:527`, `:537` |
| `die(msg)` prints `qrspi: <msg>` to stderr in red and exits 1 | `bin/qrspi.mjs:31-34` |
| `site/build.mjs` has **no failure path of its own** today — no `throw`, no `process.exit` | `02-design.md` D6 |
| The #99 local-path scan walks `bin/` and `site/build.mjs` and rejects a `file:` URL or an absolute home path (`/Users/…`, `/home/…`), exempting only `bin/qrspi.mjs` — so neither new nor edited code may carry one. The regex is at the cited line | `bin/qrspi.mjs:526` |
| The pipeline block in `README.md` is lines **19-26**: opening fence 19, six rows 20-25, closing fence 26 | `README.md:19-26` |
| The same block is `skills/qrspi/SKILL.md:18-25` and `skills/token-efficiency/references/compaction.md:23-30`. `compaction.md` draws a **second arrow** at the head of the context column | `compaction.md:24` |
| Every fence in those three files is a bare ` ``` ` at column 0 — no info strings, no trailing whitespace, in any of the twelve fences of `README.md` | verified at `8be8a5d` |
| The first `## ` in `README.md` is `## Install` at line **37** | `README.md:37` |
| `site/dist/` is gitignored; `npm run build:site` writing there is harmless | `CLAUDE.md`, "The site" |
| Commit shape: one commit per step, message opening `141 Sn: <title>`; `thoughts/141-pipeline-row-parsing/` is committed **first** in the branch | `skills/qrspi/references/landing.md:43`, `:63` |

**Scratch directory.** Several steps need one outside the repo. Create it once per session
and keep it in `$S`:

```bash
export S="$(mktemp -d)"; echo "$S"
```

Nothing in `$S` is committed — `00-questions.md` Q10 refuses a test framework, so the
negative cases below are one-off commands, not fixtures.

**Conventions to respect** (both files already follow them; match them exactly):

- No semicolons, single quotes, 2-space indent, trailing commas in multi-line literals.
  Lines run to ~120 characters.
- Comments say **why**, and cite `path:line` when they lean on another file. `//` only.
- Prose and comments: British-leaning spelling, em-dashes, **no decorative emoji**.
- `const` arrow for small helpers, `function` declaration for the larger ones — as in both
  files today.

**Do NOT touch**, in any step:

- The text of the diagram in `README.md`, `skills/qrspi/SKILL.md` or
  `skills/token-efficiency/references/compaction.md` — redrawing `compaction.md`'s second
  arrow is explicitly out of scope (`02-design.md`, "What we are NOT doing"). The module
  absorbs the variant instead.
- `effortByPhase` (`bin/qrspi.mjs:276-292`) and its comparison (`:554-563`) — the sibling
  "same numbers in three files" check, a separate ticket.
- `package.json` — no `files` edit, no dependency, no new script.
- The CSS at `site/build.mjs:328-341` — every rule there is `.flow*`; **nothing styles
  `.fallback`**, so removing the class deletes no style (`01-research.md` § T1).

---

## S1 · `bin/pipeline.mjs` — the one definition

### Files touched

| Path | Action |
|---|---|
| `bin/pipeline.mjs` | new |

Nothing else. Nobody imports it yet; at the end of this step it is dead code and
`npm test` is green.

### Changes

#### `bin/pipeline.mjs` (new file)

**Where:** a new file, no edit to any other path. Its exact shape *is* the decision — S2
and S3 are written against this interface in parallel — so the whole file is given
verbatim. Write it as it stands.

**One transcription warning.** `ROW` and the strip contain the literal arrow **U+2192**
(`→`), as `site/build.mjs:87` writes it. `bin/qrspi.mjs:267` writes the same character as
the escape `→`; either form is correct and they compile to the same regex, so use
whichever survives your editor — but check afterwards that the character between `\s+`
and `\s+` is a right arrow and not an em-dash or a `->`. This regex is the one piece of
the change that fails silently if mistyped: a wrong arrow matches nothing, every row
lands in `refused`, and S1's verify 1 throws on the first file.

```js
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
```

**Signatures:**

```js
export function readPipeline(text: string):
  | { found: false }
  | { found: true, start: number, end: number,
      rows: Array<{ phase: string, context: string, output: string, size: string | null,
                    key: string, line: number }>,
      refused: Array<{ line: number, text: string }> }

// module-private
function readBlock(lines: string[], open: number, close: number): /* the found: true shape */
```

(The repo is plain JavaScript — the types above are documentation, not code. Do not add
TypeScript, JSDoc annotations or a `.d.ts`.)

**Expected behaviour, precisely:**

1. **Line split.** `text.split(/\r?\n/)`, so a CRLF file parses and a refused line's `text`
   carries no stray `\r`. All line numbers below are 1-based absolute lines of `text`.
2. **Block selection.** Walk the lines, treating every line that *starts with* ` ``` ` as a
   fence and toggling in/out. A fence is **bare** when the line is exactly ` ``` ` — no
   info string, no trailing whitespace. The pipeline block is the **first** bare-opened
   fence pair whose body holds a line containing `00-questions.md`. A non-bare pair, or a
   bare pair without the marker, is skipped and the walk continues. An unterminated fence
   at EOF yields no block.
3. **No block** → `{ found: false }`, and no other field. This is the signal both callers
   branch on; it is *not* `null`, and it must stay distinguishable from a block that holds
   zero rows (`{ found: true, rows: [] }`) — the check prints two different problems for
   them (S2) and so does the site (S3).
4. **Bounds.** `start` is the opening fence's line, `end` the closing fence's. For
   `README.md` at `8be8a5d` that is `19` and `26`.
5. **Legal lines inside the block** (Q2) are exactly two kinds: blank or whitespace-only
   (`!line.trim()`, skipped silently, contributing nothing), or a row matching `ROW`.
   **Anything else is pushed to `refused`** with its absolute line and its raw text —
   this is the whole fix. There is no `continue` that drops a line without recording it.
6. **Row fields.** `phase` = group 1; `context` = group 2 with a leading `→` and the
   whitespace after it stripped, then trimmed; `output` = group 3 trimmed; `size` = group 4
   trimmed, or `null` when the row has no `(…)` suffix; `line` = the row's absolute line.
7. **`key`** = `[phase, context, output, size ?? ''].join(' | ')`. This reproduces
   `bin/qrspi.mjs:269` exactly, including the leading-arrow strip — it is the string the
   check compares across the three files, and `compaction.md`'s two-arrow rows only compare
   equal to `README.md`'s because of the strip (`01-research.md`, "THE TWO PARSERS DO NOT
   CARRY THE SAME ROW SHAPE").
8. **Purity.** No `import`, no top-level statement other than the two `const`s and the two
   function declarations, no I/O, no `process`, no mutation of the argument.

**Do NOT:**

- Export anything but `readPipeline` (D4). Not `ROW`, not `MARKER`, not `readBlock`, and
  not the three-file list — a second export is the mechanism D4 exists to remove.
- Widen `ROW` to make the leading arrow optional and drop the strip. That alternative was
  reasoned and never run; D2 was reversed at review in favour of the strip, which executes
  today (`02-design.md` D2).
- Add `node:fs` and a `readPipelineFile(path)` convenience. Callers read the file.

### Tests

No framework (Q10). These are the cases, and the two commands under **Verify** execute
them. Row literals below use the real arrow `→` (U+2192).

| # | Input | Expected |
|---|---|---|
| C0a | `README.md`'s text | `found: true`, `start: 19`, `end: 26`, `rows.length: 6`, `refused: []` |
| C0b | `skills/qrspi/SKILL.md`'s text | `found: true`, `start: 18`, `end: 25`, `rows.length: 6`, `refused: []` |
| C0c | `compaction.md`'s text | `found: true`, `start: 23`, `end: 30`, `rows.length: 6`, `refused: []` |
| C0d | the three `rows.map(r => r.key)` lists | all three **identical** — the load-bearing assertion; it is D2's strip working on `compaction.md`'s two-arrow rows |
| C1 | `"# x\n\nno fence here\n"` | `{ found: false }` |
| C2 | a bare row inside a ` ```text ` fence | `{ found: false }` — selection requires a bare fence (D3, Q5) |
| C3 | `"# x\n\n```\n<row>\n"` (fence never closed) | `{ found: false }` |
| C4 | `"# x\n\n```bash\nnpm test\n```\n\n```\n<row>\n```\n"` | `start: 7`, `end: 9`, `rows[0].line: 8`, `refused: []` — **the ticket's second failure**: a code block above the diagram no longer changes which block is read |
| C5 | same as C4 but the block above is a **bare** fence holding `npm test` | `start: 7`, `end: 9`, `refused: []` — the marker, not the position, selects |
| C6 | a block of `<row>`, then an empty line, then `"   "`, then a sizeless row | `rows.length: 2`, `refused.length: 0` — blank and whitespace-only lines are legal |
| C7 | `Implement   starts at 7k   →  code + PR` as the 2nd line of a block | `{ phase: 'Implement', context: 'starts at 7k', output: 'code + PR', size: null, key: 'Implement \| starts at 7k \| code + PR \| ', line: 3 }` — note the trailing `\| ` from the empty size |
| C8 | `Questions   →  ~20k burned     →  00-questions.md   (~3k)` | `rows[0].key` equal to the key of `Questions   ~20k burned    →  00-questions.md   (~3k)` |
| C9 | `"# x\n\n```\n<row>\nnonsense line\n```\n"` | `refused` deep-equals `[{ line: 5, text: 'nonsense line' }]` |
| C10 | `"```\nsee 00-questions.md\n```\n"` | `found: true`, `rows.length: 0`, `refused.length: 1` — a found block with no rows is **not** the no-block case |

### Verify

Three commands from Structure, plus the case table as a script. All must pass.

**1 · The module agrees with the three drawn blocks and reports a refusal at its absolute
line** (C0a-C0d, C1, C9):

```bash
node --input-type=module -e '
import { readPipeline } from "./bin/pipeline.mjs"
import { readFileSync } from "node:fs"
const files = ["README.md", "skills/qrspi/SKILL.md", "skills/token-efficiency/references/compaction.md"]
const got = files.map((f) => readPipeline(readFileSync(f, "utf8")))
got.forEach((r, i) => {
  if (!r.found) throw new Error(files[i] + ": no block found")
  if (r.refused.length) throw new Error(files[i] + ": refused " + JSON.stringify(r.refused))
  if (!r.rows.length) throw new Error(files[i] + ": no rows")
})
const keys = got.map((r) => r.rows.map((x) => x.key).join("\n"))
if (new Set(keys).size !== 1) throw new Error("keys differ:\n" + keys.join("\n--\n"))
if (got[0].start !== 19 || got[0].end !== 26 || got[0].rows.length !== 6) throw new Error("README bounds/rows: " + JSON.stringify([got[0].start, got[0].end, got[0].rows.length]))
const bad = readPipeline("# x\n\n```\nQuestions  ~20k burned  → 00-questions.md  (~3k)\nnonsense line\n```\n")
if (bad.refused.length !== 1 || bad.refused[0].line !== 5) throw new Error("refusal not at its absolute line: " + JSON.stringify(bad.refused))
if (readPipeline("# x\n\nno fence here\n").found !== false) throw new Error("no-block signal wrong")
console.log("ok — 3 files agree,", got[0].rows.length, "rows")
'
```

Expected output: `ok — 3 files agree, 6 rows`, exit 0.

**2 · The rest of the case table.** Write the script into `$S` and run it, passing the
module's absolute path (a module in `$S` cannot resolve `./bin/...`):

```bash
cat > "$S/cases.mjs" <<'EOF'
const { readPipeline } = await import(process.argv[2])

const A = '→'
const row = `Questions   ~20k burned    ${A}  00-questions.md   (~3k)`
const two = `Questions   ${A}  ~20k burned     ${A}  00-questions.md   (~3k)`
const bare = `Implement   starts at 7k   ${A}  code + PR`

let fails = 0
const eq = (name, got, want) => {
  const g = JSON.stringify(got)
  const w = JSON.stringify(want)
  if (g === w) return console.log(`ok   ${name}`)
  fails++
  console.error(`FAIL ${name}\n  got  ${g}\n  want ${w}`)
}

eq('C1 no fence', readPipeline('# x\n\nno fence here\n'), { found: false })
eq('C2 info-string fence ignored', readPipeline('# x\n\n```text\n' + row + '\n```\n'), { found: false })
eq('C3 unterminated fence', readPipeline('# x\n\n```\n' + row + '\n'), { found: false })

const above = '# x\n\n```bash\nnpm test\n```\n\n```\n' + row + '\n```\n'
eq('C4 fenced block above', [readPipeline(above).start, readPipeline(above).end, readPipeline(above).refused.length], [7, 9, 0])
eq('C4 row line', readPipeline(above).rows.map((r) => r.line), [8])

const above2 = '# x\n\n```\nnpm test\n```\n\n```\n' + row + '\n```\n'
eq('C5 bare block above', [readPipeline(above2).start, readPipeline(above2).end, readPipeline(above2).refused.length], [7, 9, 0])

const blanks = '```\n' + row + '\n\n   \n' + bare + '\n```\n'
eq('C6 blanks legal', [readPipeline(blanks).rows.length, readPipeline(blanks).refused.length], [2, 0])

eq('C7 sizeless row', readPipeline('```\n' + row + '\n' + bare + '\n```\n').rows[1], {
  phase: 'Implement', context: 'starts at 7k', output: 'code + PR', size: null,
  key: 'Implement | starts at 7k | code + PR | ', line: 3,
})

eq('C8 two-arrow key', readPipeline('```\n' + two + '\n```\n').rows[0].key, readPipeline('```\n' + row + '\n```\n').rows[0].key)
eq('C9 refused line', readPipeline('# x\n\n```\n' + row + '\nnonsense line\n```\n').refused, [{ line: 5, text: 'nonsense line' }])

const only = readPipeline('```\nsee 00-questions.md\n```\n')
eq('C10 block, no rows', [only.found, only.rows.length, only.refused.length], [true, 0, 1])

process.exit(fails ? 1 : 0)
EOF
node "$S/cases.mjs" "$PWD/bin/pipeline.mjs"; echo "exit=$?"
```

Expected: eleven `ok` lines and `exit=0`.

**3 · Nothing existing broke, and it ships:**

```bash
npm test                                            # green — the module is dead code, but the #99 scan walks bin/
npm pack --dry-run 2>&1 | grep -c 'bin/pipeline\.mjs'   # prints 1, with no edit to package.json#files
```

`grep -c` prints `0` and **exits 1** when there is no match — read the printed number, not
`$?`.

### Acceptance criteria

- [ ] `bin/pipeline.mjs` exists, exports `readPipeline` and nothing else, and contains no
      `import` statement
- [ ] Verify 1 prints `ok — 3 files agree, 6 rows`
- [ ] Verify 2 prints eleven `ok` lines, `exit=0`
- [ ] `npm test` green; `npm pack --dry-run` lists `bin/pipeline.mjs` once
- [ ] No other tracked file changed: `git status --porcelain` shows only
      `?? bin/pipeline.mjs` (plus `thoughts/`)
- [ ] Commit: `141 S1: bin/pipeline.mjs — one definition of the pipeline grammar`

---

## S2 · `check` calls the module and names each refused line

**Depends on S1.** Touches `bin/qrspi.mjs` only, and never reads `site/build.mjs` — it may
run in parallel with S3 (see the caveat under **Verify**).

### Files touched

| Path | Action |
|---|---|
| `bin/qrspi.mjs` | modify — three regions |

### Changes

#### `bin/qrspi.mjs` — region 1 of 3: the import

**Where:** immediately after `bin/qrspi.mjs:13` (`import { fileURLToPath } from 'node:url'`),
keeping the blank line that follows. A repo-local relative import goes last, after the
`node:*` ones.

**What to add:**

```js
import { readPipeline } from './pipeline.mjs'
```

`./pipeline.mjs` resolves against this module's own URL, not the working directory, so it
works from a checkout, from `npm i -g` and from an extracted tarball (S4 proves the last).

#### `bin/qrspi.mjs` — region 2 of 3: `pipelineRows` out, the file list in

**Where:** `bin/qrspi.mjs:257-272` — the three-line `// The pipeline diagram is drawn in
three files…keep the two in step.` comment plus the whole `function pipelineRows(text)`.
Leave `const PHASES` at `:255` and the `// --- content invariants ---` banner at `:251-253`
untouched; leave `effortByPhase` at `:274-292` untouched.

**Delete** those sixteen lines and **put in their place**:

```js
// The pipeline diagram is drawn in three files. Which files is check's policy; the
// grammar — which block, what a row is, what else a line inside it may be — lives in
// bin/pipeline.mjs, which site/build.mjs imports too (#141).
const PIPELINE_FILES = ['README.md', 'skills/qrspi/SKILL.md', 'skills/token-efficiency/references/compaction.md']
```

**Why the constant lives here and is not a second export** (`03-structure.md`, "The
three-file list stays in `bin/qrspi.mjs`"): which files are compared is `check`'s policy,
not the grammar — the site reads `README.md` alone and would never import the list — and
`readPipeline` is the only export (D4).

No identifier in region 3 collides — but not because the names are unused. `drawn`
(`bin/qrspi.mjs:532`), `canonical` and `copies` (`bin/qrspi.mjs:535`) **all exist in
`check()` today**, and all three are safe only because region 3 replaces `:531-552`, the
block that declares them: the new code re-declares them in their place, it does not add a
second binding. If you keep any part of the old block, they collide. The names that are
genuinely new are `pipe`, `why`, `problem` and `keys`, and none of those four appears
anywhere in `bin/qrspi.mjs` at `8be8a5d` (`grep -nE '\b(pipe|why|problem|keys)\b'` — no
match; note `problems`, the array at `:565`, is a different identifier and stays).

#### `bin/qrspi.mjs` — region 3 of 3: the pipeline check

**Where:** `bin/qrspi.mjs:531-552`, the block that begins
`// The pipeline diagram, duplicated in three files.` and ends with the closing `}` of the
`else`. It sits between the #99 local-path scan (`:516-529`) and the effort-allocation
check (`:554-563`), both of which stay exactly as they are. Line numbers here are the
pre-edit ones; region 2 removes twelve net lines above, so the block will have moved up by
the time you reach it — find it by its comment, not by its line number.

**Replace the whole block with:**

```js
  // The pipeline diagram, duplicated in three files. bin/pipeline.mjs holds the one
  // grammar, so what `check` reads and what the site draws cannot differ (#141) — and a
  // line inside the block that is neither blank nor a row is named, not skipped.
  const drawn = PIPELINE_FILES.map((f) => {
    const pipe = existsSync(join(ROOT, f)) ? readPipeline(readFileSync(join(ROOT, f), 'utf8')) : { found: false }
    return { f, found: pipe.found, keys: (pipe.rows ?? []).map((r) => r.key), refused: pipe.refused ?? [] }
  })
  for (const d of drawn) {
    for (const r of d.refused) problems.push(`${d.f}:${r.line}: not a pipeline row — "${r.text}"`)
  }
  const why = (d) => {
    if (!d.found) return 'no pipeline block found'
    if (!d.keys.length) return 'pipeline block holds no rows'
    return null
  }
  const [canonical, ...copies] = drawn
  if (why(canonical)) {
    problems.push(`${canonical.f}: ${why(canonical)} — site/build.mjs reads it too`)
  } else {
    for (const copy of copies) {
      const problem = why(copy)
      if (problem) {
        problems.push(`${copy.f}: ${problem}`)
        continue
      }
      for (let i = 0; i < Math.max(canonical.keys.length, copy.keys.length); i++) {
        if (canonical.keys[i] !== copy.keys[i]) {
          problems.push(
            `pipeline row ${i + 1} disagrees\n      ${canonical.f}: ${canonical.keys[i] ?? '(missing)'}\n      ${copy.f}: ${copy.keys[i] ?? '(missing)'}`,
          )
        }
      }
    }
  }
```

**Expected behaviour:**

1. Each of the three files is read once and reduced to `{ f, found, keys, refused }`. A
   **missing** file becomes `{ found: false }`, which reports the same problem it reports
   today.
2. **Every** refused line in **every** one of the three files becomes its own problem,
   before any comparison: `` `${f}:${r.line}: not a pipeline row — "${r.text}"` ``. This is
   the new invariant and the fix for the ticket — a line malformed the same way in all
   three files now produces three problems where it produced none.
3. The canonical file (`README.md`, first in `PIPELINE_FILES`) keeps two distinct problems,
   both with the existing `— site/build.mjs reads it too` suffix: `no pipeline block found`
   and `pipeline block holds no rows`. Collapsing them is the failure mode
   `03-structure.md` names in S2's risk row; they are two different states of the file.
4. A copy with no block, or a block with no rows, gets the same two messages without the
   suffix, and is skipped for comparison.
5. Row comparison is unchanged in shape and in wording: index by index up to
   `Math.max(a, b)`, `(missing)` for the short side, the same two-space-indented
   continuation lines. Only the compared string moved — from `pipelineRows`' join to
   `row.key`, which is the same string (S1, behaviour 7).
6. `check`'s success line (`bin/qrspi.mjs:569`) and its counts are untouched.

**Message format, settled here** (D5 left the wording to Plan): `path:line: ` prefix, then
`not a pipeline row — ` and the raw line in double quotes. The raw text, not a trimmed
copy: the point is to show the line as it is. This is the **first** message in `check` to
carry a line number (`01-research.md`, "`check` has no `path:line` precedent") — deliberate,
so it is clickable in a terminal and parseable as a CI annotation.

**Do NOT:**

- Keep a `pipelineRows` wrapper for compatibility. Nothing else calls it; `grep -c` must
  return 0.
- Change `effortByPhase` or the effort comparison, even though it is the same pattern —
  separate ticket.
- Move the three paths into `bin/pipeline.mjs`.

### Tests

GNU `sed` assumed (Linux, and CI). On macOS install `gsed` and substitute it, or make the
edits by hand — BSD `sed` needs `-i ''` and a different `i\` syntax.

| # | Input | Expected |
|---|---|---|
| T0 | clean tree | exit 0, the `ok — 3 skills, 3 commands …` line prints |
| T1 | `sed -i '26i not a row' README.md` (junk becomes `README.md:26`, inside the block) | exit 1, exactly one problem: `README.md:26: not a pipeline row — "not a row"` |
| T2 | the **same junk in all three files**: `README.md:26`, `skills/qrspi/SKILL.md:25`, `compaction.md:30` | exit 1, three refusal problems and **no** row-disagreement problem — this is the ticket. Pre-change it exits 0 and prints nothing |
| T3 | `sed -i '20s/~20k/~21k/' README.md` | exit 1, two `pipeline row 1 disagrees` problems (one per copy) — the old behaviour is not lost |
| T4 | `sed -i '19,26d' README.md` (the whole block gone) | exit 1, `README.md: no pipeline block found — site/build.mjs reads it too` |
| T5 | the six rows replaced by one non-row line carrying the marker (block kept, rows gone) | exit 1, **both** `README.md:20: not a pipeline row — "see 00-questions.md"` and `README.md: pipeline block holds no rows — site/build.mjs reads it too` — the two states stay distinguishable |
| T6 | `grep -c 'pipelineRows' bin/qrspi.mjs` | prints `0` |

### Verify

**Caveat, from `03-structure.md`:** T1-T5 and S3's negative test both `sed -i README.md`
and then `git checkout -- README.md`. On **separate worktrees** that is safe. In **one
checkout** S2 and S3 must not run their negative tests at the same time, or one restores
the other's README mid-run.

```bash
# T0
npm test; echo "exit=$?"                       # expect the ok line and exit=0

# T6
grep -c 'pipelineRows' bin/qrspi.mjs           # prints 0 (grep exits 1 on no match — read the number)

# T1 — the bug the ticket is about, now named
sed -i '26i not a row' README.md
node bin/qrspi.mjs check; echo "exit=$?"       # expect exit=1
node bin/qrspi.mjs check 2>&1 | grep -F 'README.md:26: not a pipeline row — "not a row"'
git checkout -- README.md && git diff --quiet README.md && echo restored

# T2 — the same malformation in all three files
sed -i '26i not a row' README.md
sed -i '25i not a row' skills/qrspi/SKILL.md
sed -i '30i not a row' skills/token-efficiency/references/compaction.md
node bin/qrspi.mjs check; echo "exit=$?"       # expect exit=1, three refusal lines, no "disagrees"
node bin/qrspi.mjs check 2>&1 | grep -cF 'not a pipeline row'   # prints 3
node bin/qrspi.mjs check 2>&1 | grep -cF 'disagrees'            # prints 0
git checkout -- README.md skills/qrspi/SKILL.md skills/token-efficiency/references/compaction.md
git diff --quiet README.md skills/qrspi/SKILL.md skills/token-efficiency/references/compaction.md && echo restored

# T3 — a row inconsistent in one file only
sed -i '20s/~20k/~21k/' README.md
node bin/qrspi.mjs check; echo "exit=$?"       # expect exit=1
node bin/qrspi.mjs check 2>&1 | grep -cF 'pipeline row 1 disagrees'   # prints 2
git checkout -- README.md && git diff --quiet README.md && echo restored

# T4 — no block at all
sed -i '19,26d' README.md
node bin/qrspi.mjs check 2>&1 | grep -F 'README.md: no pipeline block found — site/build.mjs reads it too'
git checkout -- README.md && git diff --quiet README.md && echo restored

# T5 — a block with the marker and no rows (two sed calls: `c\` one-liners are not portable)
sed -i '21,25d' README.md
sed -i '20s/.*/see 00-questions.md/' README.md
node bin/qrspi.mjs check 2>&1 | grep -F 'README.md: pipeline block holds no rows'
node bin/qrspi.mjs check 2>&1 | grep -F 'README.md:20: not a pipeline row'
git checkout -- README.md && git diff --quiet README.md && echo restored

# final
npm test; echo "exit=$?"                       # expect exit=0
git diff --quiet README.md skills/qrspi/SKILL.md skills/token-efficiency/references/compaction.md && echo "diagrams untouched"
```

The last line matters: no step may leave a diagram edited.

### Acceptance criteria

- [ ] T0-T6 all behave as tabulated
- [ ] `npm test` green on the clean tree, and strictly stricter than at `8be8a5d`
- [ ] `git diff --stat` touches `bin/qrspi.mjs` only
- [ ] No diagram text changed in any of the three files
- [ ] Commit: `141 S2: check calls bin/pipeline.mjs and names each refused line`

---

## S3 · the site calls the module, validates at read time, loses the `<pre>` branch

**Depends on S1 only.** Touches `site/build.mjs` only, and never reads `bin/qrspi.mjs` — it
may run in parallel with S2, subject to the one-checkout caveat in S2's **Verify**.

### Do this first, before editing anything

The whole step is verified by the built page not moving. Capture the baseline on the
**clean tree**:

```bash
npm install --no-audit --no-fund        # site/build.mjs needs marked; check still needs nothing
node site/build.mjs --out "$S/dist-before"
```

Expected: `built …/dist-before/index.html — NN.N kB, N sections, pipeline: 6 rows, + sitemap.xml`.
If `$S/dist-before/index.html` does not exist, stop — the step's only real check is
unavailable and the H1 trap in the lede slice (`03-structure.md`, S3 risk row 1) goes
undetected.

### Files touched

| Path | Action |
|---|---|
| `site/build.mjs` | modify — nine regions |

`03-structure.md` estimated five regions; it is nine, because `parseReadme`'s now-unused
`intro` field, the call site and the log line are each their own hunk. Same file, same
~60 lines.

### Changes

**Every line number below is the pre-edit one, at `8be8a5d` — and this step edits one file
nine times in one session, so each region moves the ones below it. Find each region by the
text quoted here, not by its line number**, the same rule S2's region 3 carries. The shift
is not a constant you can add: region 1 inserts 1 line, region 2 inserts 35, region 5
deletes 11 and region 6 deletes 1, so by regions 7-9 the numbers are tens of lines stale in
a direction that depends on how far down you are. Work top to bottom and search for these
anchors, each of which is present verbatim at `8be8a5d`:

| Region | Pre-edit line | Find it by |
|---|---|---|
| 1 | `:13` | `import { fileURLToPath } from 'node:url'` |
| 2 | after `:22` | `const md = readFileSync(join(ROOT, 'README.md'), 'utf8')` |
| 3 | `:63-64` | `const intro = sections.shift()` |
| 4 | `:67-80` | `function parseIntro(raw) {`, with the three-line `// The intro carries three things:` comment above it |
| 5 | `:82-92` | `function parsePipeline(block) {` |
| 6 | `:96-97` | `function renderPipeline(rows, fallback) {` |
| 7 | `:172-174` | `const { lede, pipeline, after } = parseIntro(intro)` |
| 8 | `:419` | `${renderPipeline(rows, pipeline)}` |
| 9 | `:496` | `pipeline: ${rows ? ` … `: 'fallback <pre>'}` inside the `console.log` |

The last three are the ones a line number alone gets wrong: each replaces a single line, so
there is no surrounding block to recognise it by. Note that `renderPipeline(` occurs twice —
`:96`, the declaration (region 6), and `:419`, the call in the hero template (region 8) —
and that the two words U3 greps for are spread across four regions — `parsePipeline` at
`:83` (region 5) and `:174` (region 7), `fallback` at `:96`, `:97` (region 6) and `:496`
(region 9). That is why U3's `grep -cE 'parsePipeline|fallback'` returning 0 is the check
that none of those four regions was missed.

#### Region 1 · the import

**Where:** immediately after `site/build.mjs:13` (`import { fileURLToPath } from 'node:url'`).

```js
import { readPipeline } from '../bin/pipeline.mjs'
```

#### Region 2 · `die`, `firstSectionLine` and the read-time validation

**Where:** inserted between `site/build.mjs:22`
(`const md = readFileSync(join(ROOT, 'README.md'), 'utf8')`) and the blank line at `:23`, so
the `// One logo, three consumers:` comment at `:24` still has a blank line above it. The
block below opens with a blank line of its own, which is the separator from `:22`.

No identifier here collides: `site/build.mjs` has no `die`, `pipe`, `mdLines`,
`sectionLine` or `firstSectionLine` at `8be8a5d` (`die` exists only in `bin/qrspi.mjs:31`).

```js

// The generator's one failure path, mirroring die() in bin/qrspi.mjs:31-34. There was
// none before: a pipeline row that did not parse was skipped and the hero shipped short
// (#141).
const die = (msg) => {
  console.error(`site/build.mjs: ${msg}`)
  process.exit(1)
}

// The first H2 outside a fence, 1-based — the rule parseReadme uses below, recomputed on
// the README's own lines because the intro is sliced from them by line number. Returns
// lines.length + 1 when the file has no H2.
function firstSectionLine(lines) {
  let fenced = false
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) fenced = !fenced
    else if (!fenced && lines[i].startsWith('## ')) return i + 1
  }
  return lines.length + 1
}

// The pipeline diagram is the hero, so it is validated before a byte of HTML exists (D6):
// no block, a line inside it that is neither blank nor a row, no rows at all, or a block
// outside the intro, and the build says which and exits 1 instead of quietly drawing
// fewer rows. bin/pipeline.mjs is the same module `npx qrspi check` reads it with.
const mdLines = md.split('\n')
const pipe = readPipeline(md)
const sectionLine = firstSectionLine(mdLines)
if (!pipe.found) die('README.md: no pipeline block — the hero draws it')
for (const r of pipe.refused) console.error(`site/build.mjs: README.md:${r.line}: not a pipeline row — "${r.text}"`)
if (pipe.refused.length) process.exit(1)
if (!pipe.rows.length) die('README.md: the pipeline block holds no rows')
if (pipe.end >= sectionLine) {
  die(`README.md: the pipeline block (lines ${pipe.start}-${pipe.end}) is not in the intro — the first "## " is line ${sectionLine}`)
}
```

Notes the executor must not "fix":

- `die` is a `const` arrow, so it is **not** hoisted — it has to be declared above the
  validation, which is why the whole block sits here rather than down in the assembly.
  Keeping it here is also what D6 asks for: validate straight after `readFileSync`.
- The four checks are in dependency order and must stay in it. `!pipe.found` comes first
  because `die` exits — on a `{ found: false }` result there is no `refused`, `rows`, `end`
  or `start` to read, and the three checks below would throw on `undefined` instead of
  printing the reason.
- The refused lines are printed in a loop and the exit comes after it, so a README with
  three bad lines names all three rather than only the first.
- `md.split('\n')` (not `/\r?\n/`) matches `parseReadme`'s own split; both split on every
  `\n`, so the line numbers `readPipeline` returns index `mdLines` correctly either way.
- The bounds assertion replaces the old implicit rule "the diagram is whatever fence comes
  first in the intro" with one explicit statement (D3). `firstSectionLine` returning
  `lines.length + 1` for an H2-less file makes it pass, not fail.

#### Region 3 · `parseReadme` stops returning `intro`

**Where:** `site/build.mjs:63-64`.

```js
  sections.shift()
  return { title, sections: sections.map((s) => ({ ...s, body: s.lines.join('\n').trim() })) }
```

`sections.shift()` is still load-bearing — it drops the pre-H2 content out of `sections` —
but its value is no longer used, because the intro is now sliced from the README's own
lines (D3). Leave the rest of `parseReadme` (`:41-62`) and the banner comment at `:39`
exactly as they are.

#### Region 4 · `parseIntro` slices from the block's bounds

**Where:** `site/build.mjs:67-80` — the three-line comment and the whole function.
**Replace all of it with:**

```js
// The intro carries three things: the lede, the pipeline diagram, and the paragraph that
// explains why the pipeline matters. The diagram's bounds come from bin/pipeline.mjs, so
// the lede is everything above the opening fence and the after-text everything between the
// closing fence and the first H2 — this function no longer looks for a fence itself.
function parseIntro(lines, pipe, sectionLine) {
  const lede = lines
    .slice(0, pipe.start - 1)
    // The README opens with an HTML logo block for GitHub; the page draws its own. The H1
    // goes with it — it becomes the hero, exactly as parseReadme drops it.
    .filter((l) => !l.startsWith('# ') && !/^\s*<\/?(p|img|div|a|picture|source)\b/i.test(l))
    .join('\n')
    .trim()
  return { lede, after: lines.slice(pipe.end, sectionLine - 1).join('\n').trim() }
}
```

**Signature:** `function parseIntro(lines: string[], pipe: PipelineResult, sectionLine: number): { lede: string, after: string }` — it no longer returns `pipeline`.

**Expected behaviour, and why the output cannot move:**

- `lines.slice(0, pipe.start - 1)` is README lines 1…18 (`pipe.start` is 19). The filter
  drops the H1 at line 11 — **this is the trap**: `parseReadme` dropped it before
  (`site/build.mjs:50-52`) and this slice does not get it for free. Keeping it would add a
  line to the hero lede and change `<meta name="description">` (`:175-179`, `:412-413`).
  The surviving lines are 4, 10, 12-18; `join('\n').trim()` yields exactly the string
  `parseIntro` produced at `8be8a5d`.
- `lines.slice(pipe.end, sectionLine - 1)` is README lines 27…36 (`pipe.end` is 26, the
  first `## ` is line 37). `trim()` yields lines 28-35 — the same `after` as before.
- The HTML pre-filter now applies to the **lede alone**, per `03-structure.md` S3. It is
  byte-identical today because no line in 27-36 opens one of those tags; the consequence
  is that an HTML line in the after-text is no longer silently dropped. Making the filter
  fence-aware remains out of scope (`02-design.md`, "What we are NOT doing").

#### Region 5 · `parsePipeline` deleted

**Where:** `site/build.mjs:82-92` — the `` // `Questions   ~20k burned   →  00-questions.md   (~3k)` ``
sample-row comment and the whole `function parsePipeline(block)`. **Delete all eleven
lines.** The grammar now lives in `bin/pipeline.mjs`, including the `rows.length >= 3`
guard at `:91`, which D6 removes rather than relocates.

#### Region 6 · `renderPipeline` loses its second parameter and its branch

**Where:** `site/build.mjs:96-97`.

```js
function renderPipeline(rows) {
  const items = rows
```

Delete `, fallback` from the signature and delete the whole
`if (!rows) return \`<pre class="fallback">…\`` line. The body from `const items = rows`
(`:98`) to the closing `}` (`:111`) is unchanged — it already reads only `phase`,
`context`, `output` and `size`, which is why `pipe.rows` carrying two extra fields changes
no HTML. Nothing styles `.fallback` (`01-research.md` § T1), so no CSS is touched.

#### Region 7 · the assembly

**Where:** `site/build.mjs:172-174`. **Three lines become two:**

```js
const { title, sections } = parseReadme(md)
const { lede, after } = parseIntro(mdLines, pipe, sectionLine)
```

`const rows = parsePipeline(pipeline)` goes. `description` (`:175-179`) and everything
below it are untouched.

#### Region 8 · the call site

**Where:** `site/build.mjs:419`.

```js
    ${renderPipeline(pipe.rows)}
```

#### Region 9 · the build log

**Where:** `site/build.mjs:496`.

```js
console.log(`built ${join(OUT, 'index.html')} — ${(html.length / 1024).toFixed(1)} kB, ${rendered.length} sections, pipeline: ${pipe.rows.length} rows, + sitemap.xml`)
```

The `rows ? … : 'fallback <pre>'` ternary goes; the printed text is unchanged on a good
README, because `rows` was truthy there.

**Do NOT** use the word `fallback` anywhere in the new code or its comments — the step is
verified by `grep -cE 'parsePipeline|fallback' site/build.mjs` returning 0.

### Tests

| # | Input | Expected |
|---|---|---|
| U0 | clean tree, **before** the edit | `$S/dist-before/index.html` exists; log says `pipeline: 6 rows` |
| U1 | clean tree, after the edit | `diff -q $S/dist-before/index.html $S/dist-after/index.html` — **identical**. The README did not change and its rows parse today, so any difference is a regression |
| U2 | `$S/dist-after/index.html` | `grep -c 'class="flow-row"'` prints `6`; `grep -c 'class="fallback"'` prints `0` |
| U3 | `site/build.mjs` | `grep -cE 'parsePipeline\|fallback'` prints `0` |
| U4 | the build log | one hit for `pipeline: 6 rows`, and no `fallback` branch left in the line |
| U5 | `sed -i '26i not a row' README.md`, then build | exit 1; stderr carries `site/build.mjs: README.md:26: not a pipeline row — "not a row"`; **no `index.html` written**. Pre-change this exits 0 and ships the six-row hero as if the README were clean — the bad line leaves no trace anywhere |
| U5b | `sed -i '25s/.*/not a row/' README.md` — a row **replaced** by junk, which is the ticket's own symptom | exit 1, `site/build.mjs: README.md:25: not a pipeline row — "not a row"`. Pre-change this exits 0 and ships a **five**-row hero whose only trace is `pipeline: 5 rows` in a log line |
| U6 | `sed -i '19,26d' README.md`, then build | exit 1, `site/build.mjs: README.md: no pipeline block — the hero draws it` |
| U7 | `sed -i '18i ## Scratch' README.md`, then build | exit 1, `site/build.mjs: README.md: the pipeline block (lines 20-27) is not in the intro — the first "## " is line 18` — the D3 bounds assertion |
| U8 | clean tree | `npm test` green (S2's `check` reads the same README) |

### Verify

```bash
# U1 — the whole point of the step
node site/build.mjs --out "$S/dist-after"
diff -q "$S/dist-before/index.html" "$S/dist-after/index.html" && echo "page did not move"

# U2
grep -c 'class="flow-row"' "$S/dist-after/index.html"     # prints 6
grep -c 'class="fallback"' "$S/dist-after/index.html"     # prints 0

# U3
grep -cE 'parsePipeline|fallback' site/build.mjs          # prints 0

# U4
node site/build.mjs | grep -F 'pipeline: 6 rows'          # one hit

# U5 — the build now hard-fails, at read time
sed -i '26i not a row' README.md
node site/build.mjs --out "$S/dist-bad"; echo "exit=$?"   # expect exit=1
test ! -e "$S/dist-bad/index.html" && echo "nothing written"
git checkout -- README.md && git diff --quiet README.md && echo restored

# U5b — a row replaced by junk: the ticket's own symptom
sed -i '25s/.*/not a row/' README.md
node site/build.mjs --out "$S/dist-bad2"; echo "exit=$?"  # expect exit=1
node site/build.mjs --out "$S/dist-bad2" 2>&1 | grep -F 'README.md:25: not a pipeline row'
git checkout -- README.md && git diff --quiet README.md && echo restored

# U6
sed -i '19,26d' README.md
node site/build.mjs --out "$S/dist-noblock" 2>&1 | grep -F 'no pipeline block'
git checkout -- README.md && git diff --quiet README.md && echo restored

# U7 — the block pushed out of the intro
sed -i '18i ## Scratch' README.md
node site/build.mjs --out "$S/dist-moved" 2>&1 | grep -F 'is not in the intro'
git checkout -- README.md && git diff --quiet README.md && echo restored

# U8
npm test; echo "exit=$?"                                  # expect exit=0
git diff --quiet README.md && echo "README untouched"
```

### Acceptance criteria

- [ ] U0 captured before any edit; U1 reports the page did not move
- [ ] U2-U4 as tabulated; no `parsePipeline`, no `fallback`, no `.fallback` in the output
- [ ] U5, U5b, U6 and U7 each exit 1 with the stated message, and U5 writes no `index.html`
- [ ] `npm test` green; `git diff --stat` touches `site/build.mjs` only
- [ ] Commit: `141 S3: the site reads the diagram through bin/pipeline.mjs and fails loudly`
- [ ] **The code change is complete at the end of this step.** Everything after it is
      documentation and verification

---

## S4 · the module resolves from a packed tarball

**Depends on S1, S2.** Closes the backward-compat risk in `02-design.md` § Impact: a
published tarball in which `bin/pipeline.mjs` is missing or unresolvable would make
`npx qrspi check` throw on import instead of reporting problems.

### Files touched

None. Commands only; **this step commits nothing**.

### Verify

Pack, extract into its own empty directory, and run it **by path** from the repo root — an
extracted archive is untrusted input, even our own, so do not `cd` into it and keep the
helper script outside it.

```bash
rm -rf "$S/tar" && mkdir -p "$S/tar/x"
npm pack --pack-destination "$S/tar"
tar -xzf "$S"/tar/qrspi-*.tgz -C "$S/tar/x"

# 1 · it is in the tarball
tar -tzf "$S"/tar/qrspi-*.tgz | grep -F 'package/bin/pipeline.mjs'   # one hit

# 2 · it resolves, and exports what the callers import
cat > "$S/resolves.mjs" <<'EOF'
const m = await import(process.argv[2])
if (typeof m.readPipeline !== 'function') {
  console.error('no readPipeline export')
  process.exit(1)
}
console.log('resolves')
EOF
node "$S/resolves.mjs" "$S/tar/x/package/bin/pipeline.mjs"            # prints: resolves

# 3 · check, run from inside the tarball, reports no pipeline and no import problem
node "$S/tar/x/package/bin/qrspi.mjs" check 2>&1 | grep -En 'pipeline|not a row|Cannot find module'
```

**The exit code is not the oracle here.** `check` already exits 1 inside an extracted
tarball because `plugins/qrspi-pane` is not shipped (`01-research.md` § T3,
`02-design.md` § "More research needed", T3). The assertion is that command 3 prints
**nothing**: no pipeline problem, no `Cannot find module`. A tarball-only resolution
failure would surface there as
`Cannot find module '…/package/bin/pipeline.mjs'`.

### Tests

| # | Input | Expected |
|---|---|---|
| V1 | `tar -tzf` on the packed tarball | one line matching `package/bin/pipeline.mjs` |
| V2 | dynamic import of the extracted module | prints `resolves`, exit 0 |
| V3 | `check` run from the extracted package | **no** output matching `pipeline`, `not a row` or `Cannot find module`; the other problems (`qrspi-pane`) are expected and ignored |

### Acceptance criteria

- [ ] V1-V3 as tabulated
- [ ] `git status --porcelain` unchanged by this step (nothing but `thoughts/`)
- [ ] No commit

---

## S5 · `CLAUDE.md` and `AGENTS.md`: the stale site prose and the invariant list

**Depends on S2 and S3** — the prose asserts their behaviour, so it must not land first.
This is the last step that changes a tracked file.

### Files touched

| Path | Action |
|---|---|
| `CLAUDE.md` | modify — four passages (edits 1-4) |
| `AGENTS.md` | modify — three passages (edits 5-7) |

Four passages in `CLAUDE.md`, not the two `03-structure.md` names. Edits 1 and 2 are the
same job — `CLAUDE.md` stops being wrong about this change — and both are introduced *by*
it: `:9-11` says the installer is the repo's only executable file, and the `## Layout` block
maps every source file in the repo. A new tracked `bin/*.mjs` absent from both is a
documentation defect a reviewer would flag.

**`AGENTS.md` is in scope for the same reason, and `03-structure.md` names it nowhere.**
`AGENTS.md:3-5` states that it is `CLAUDE.md`'s vendor-neutral subset and that **"the two
must agree"**, so every edit above that changes a fact `AGENTS.md` also states has to be
mirrored. Two of the four are:

- `AGENTS.md:10-11` — "the only executable file the package ships is `bin/qrspi.mjs`" —
  is the same claim as `CLAUDE.md:9-11`, and S1 makes it false. Mirrored by edit 5.
- `AGENTS.md:28-54` is a `## Layout` **table** with a `` | `bin/qrspi.mjs` | … | `` row
  (`:33`) and no `bin/pipeline.mjs` row, the same gap edit 2 closes in `CLAUDE.md`'s
  `## Layout` block. Mirrored by edit 6.

The other two need no mirror, and the executor should not go looking for one:

- Edit 3 (what `check` validates). `AGENTS.md:70-72` lists the checks and then delegates:
  "and the content rules the repository states (CLAUDE.md, 'Verifying a change', has the
  full list)". It stays true the moment edit 3 lands. Edit 7 does add the new rule to
  `AGENTS.md`'s own **editing rules**, where an agent editing a diagram will meet it —
  `:116-118` tells it to change a row in all three files and says nothing about what else a
  line in the block may be.
- Edit 4 (the generator's behaviour). `AGENTS.md:80-85` says only that the page is built
  from the README and carries no prose of its own. It makes **no** claim about how the
  diagram is parsed — no `<pre>` degrade, no dropped rows:
  `grep -nE 'falls back to|silently drops|is skipped|first fenced block|<pre>' AGENTS.md`
  has no match at `8be8a5d`. Nothing there to correct.

Seven passages, two files. Both are documentation; nothing in this step changes behaviour.

### Changes

#### Edit 1 · `CLAUDE.md:9-11` — there are now two shipped scripts

**Replace:**

```
prompt text itself. The single piece of executable code is
[bin/qrspi.mjs](bin/qrspi.mjs), the `npx qrspi` installer — it exists only to put the
Markdown where Claude Code can see it.
```

**with:**

```
prompt text itself. The executable code that ships is the `npx qrspi` installer,
[bin/qrspi.mjs](bin/qrspi.mjs), which exists only to put the Markdown where Claude Code
can see it, plus the one module it imports — [bin/pipeline.mjs](bin/pipeline.mjs), the
pipeline diagram's grammar, which the site reads too.
```

#### Edit 2 · `CLAUDE.md:33-34` — the `## Layout` block

**Replace:**

```
bin/
  qrspi.mjs            `npx qrspi` installer (install / uninstall / path / check)
```

**with** (descriptions start at column 24, as every other entry in the block does; the
continuation lines are indented to the same column):

```
bin/
  qrspi.mjs            `npx qrspi` installer (install / uninstall / path / check)
  pipeline.mjs         the pipeline diagram's one grammar — which fenced block, what a
                       row is, what else a line inside it may be. `readPipeline(text)`
                       is the only export; bin/qrspi.mjs and site/build.mjs both import
                       it, so they cannot read the block differently (#141)
```

#### Edit 3 · `CLAUDE.md:274-276` — what `check` validates

**Replace:**

```
nothing else used to check: the `## Status` block in every artifact template, the
pipeline diagram across the three files that draw it, the per-phase effort
allocation across the three that tabulate it, and what `/qrspi:new` would leave in
```

**with:**

```
nothing else used to check: the `## Status` block in every artifact template, the
pipeline diagram across the three files that draw it — every line inside each block is
blank or a row, and a line that is neither is reported as `path:line` with the line
quoted (#141) — the per-phase effort allocation across the three that tabulate it, and
what `/qrspi:new` would leave in
```

This is the half `CONTRIBUTING.md:329` requires: a new invariant in `check` gets stated
here.

#### Edit 4 · `CLAUDE.md:327-333` — the generator's behaviour

**Replace the whole paragraph:**

```
The generator parses the README: the H1 becomes the hero, the first fenced block is
parsed into the pipeline diagram (`Phase  context  →  artifact  (size)` — a row that
does not match is skipped, and if fewer than three match the whole block falls back to
a `<pre>`), and each `##` becomes a section. Renaming a README heading renames a nav
entry and an anchor; reshaping the pipeline block silently drops rows, so re-run the
build and look at the output. `marked` is a devDependency used only here — it never
reaches the published npm package, which stays dependency-free.
```

**with:**

```
The generator parses the README: the H1 becomes the hero and each `##` becomes a section.
The pipeline diagram in the intro is read by [bin/pipeline.mjs](bin/pipeline.mjs), the one
grammar `npx qrspi check` reads it with too (#141): the block is the first bare fence whose
body names `00-questions.md`, so a fenced block added above it changes nothing, and every
line inside that block must be blank or a row (`Phase  context  →  artifact  (size)`). A
line that is neither stops the build, named as `README.md:<line>` and quoted; so does a
missing block, an empty one, or one whose bounds fall outside the intro. No row is dropped
and there is no `<pre>` to degrade to — the hero draws every row, or the build writes
nothing and exits 1. `pages.yml` runs `npm test` before the build, so in CI the check names
the line first. Renaming a README heading renames a nav entry and an anchor; reshaping the
pipeline block now fails loudly — but still re-run the build and look at the output,
because a byte-identical `diff` says the page did not move, not that it is right. `marked`
is a devDependency used only here — it never reaches the published npm package, which
stays dependency-free.
```

#### Edit 5 · `AGENTS.md:9-11` — the vendor-neutral copy of edit 1

**Replace:**

```
`qrspi` is a **Claude Code and Codex CLI plugin** distributed as Markdown and JSON. No
build step, no dependencies. The deliverable is prompt text; the only executable file
the package ships is `bin/qrspi.mjs`, the `npx qrspi` installer.
```

**with:**

```
`qrspi` is a **Claude Code and Codex CLI plugin** distributed as Markdown and JSON. No
build step, no dependencies. The deliverable is prompt text; the executable files the
package ships are `bin/qrspi.mjs`, the `npx qrspi` installer, and `bin/pipeline.mjs`,
the pipeline diagram's grammar, which `qrspi check` and the site generator both import.
```

Same fact as edit 1, in `AGENTS.md`'s shorter register. Keep the line width (~88 columns,
as the file does) and do not add a Markdown link — `AGENTS.md` names paths in backticks in
this section, and `[…](…)` appears only for `CLAUDE.md` and `CONTRIBUTING.md` (`:4`, `:145`).

#### Edit 6 · `AGENTS.md:33` — the `## Layout` table

**Insert one row immediately after** the `bin/qrspi.mjs` row, which is:

```
| `bin/qrspi.mjs` | installer CLI: `install` / `uninstall` / `path` / `check`; copy mode guards unmarked directories |
```

**The new row:**

```
| `bin/pipeline.mjs` | the pipeline diagram's one grammar: which fenced block, what a row is, what else a line inside it may be. `readPipeline(text)` is the only export; `bin/qrspi.mjs` and `site/build.mjs` both import it (#141) |
```

One physical line, no wrapping — every row in that table is one line, however long
(`:35`, `:45`). It goes **after** `bin/qrspi.mjs` and **before**
`.claude-plugin/plugin.json`: the table is ordered by role, not alphabetically, and the two
`bin/` entries belong together.

#### Edit 7 · `AGENTS.md:116-118` — the duplicated-numbers editing rule

**Replace:**

```
- The duplicated numbers: the pipeline diagram (README, `skills/qrspi/SKILL.md`,
  `compaction.md`) and the effort table (SKILL.md, `commands/next.md`, `effort.md`).
  Change a row in all three of its files; `npm test` compares them.
```

**with:**

```
- The duplicated numbers: the pipeline diagram (README, `skills/qrspi/SKILL.md`,
  `compaction.md`) and the effort table (SKILL.md, `commands/next.md`, `effort.md`).
  Change a row in all three of its files; `npm test` compares them. Inside a pipeline
  block every line must be blank or a row: a line that is neither now fails `npm test`,
  named as `path:line` and quoted, and fails the site build (#141).
```

This is the one place in `AGENTS.md` an agent editing a diagram will actually read, and it
is the vendor-neutral half of edits 3 and 4 — the invariant, without `CLAUDE.md`'s
paragraph on the generator's internals. "blank or a row" is the same phrase edits 3 and 4
use, which is what W2 counts.

**Do NOT** touch `CLAUDE.md`'s other claims — the audit dates in the API-claims bullet, the
release runbook, the brand-asset section — or `AGENTS.md`'s `## Invariants`, `## Releasing`
or `## Commit conventions`. None of them is about this change.

### Tests

| # | Input | Expected |
|---|---|---|
| W1 | `grep -nE 'falls back to\|silently drops rows\|is skipped\|first fenced block' CLAUDE.md` | prints nothing. **Note:** `03-structure.md` S5 verify 1 greps `falls back to a\|silently drops rows`. Its first alternative is dead — at `8be8a5d` "falls back to" ends line 329 and "a `<pre>`" begins line 330, so `falls back to a` matches nothing even unedited, and only the `silently drops rows` half does any work. The four-alternative pattern above matches `CLAUDE.md:327`, `:329` and `:331` today, so it covers all three stale lines |
| W2 | `grep -c 'blank or a row' CLAUDE.md` | prints `2` (edits 3 and 4); `03-structure.md` requires at least `1` |
| W3 | `grep -c 'bin/pipeline\.mjs' CLAUDE.md` | prints exactly `2` — the two `[bin/pipeline.mjs](bin/pipeline.mjs)` links, from edits 1 and 4. **`grep -c` counts matching lines, not matches**, and only those two edits put the literal `bin/pipeline.mjs` on a line: edit 2's `## Layout` entry names the file as `pipeline.mjs` indented under `bin/`, and the one absolute path in its prose is `bin/qrspi.mjs`. `03-structure.md` S5 asks for "at least 3", which correct work cannot reach — hence W3b. Before S5, `0` |
| W3b | `grep -cE '^  pipeline\.mjs +' CLAUDE.md` | prints `1` — edit 2's `## Layout` entry, which W3 cannot see. Before S5, `0`. Together, W3 and W3b fail if any one of edits 1, 2 or 4 is missing |
| W4 | `grep -rn '](' README.md CLAUDE.md` | every link still resolves; the two new `[bin/pipeline.mjs](bin/pipeline.mjs)` targets exist after S1 |
| W5 | `npm test` | green |
| W6 | `grep -c 'bin/pipeline\.mjs' AGENTS.md` | prints exactly `2` — edit 5's prose sentence and edit 6's table row, one line each. Before S5, `0`. Same counting caveat as W3 |
| W7 | `grep -cE '^\| \`bin/pipeline\.mjs\` \|' AGENTS.md` | prints `1` — edit 6's `## Layout` row specifically, so a prose-only mirror fails |
| W8 | `grep -c 'only executable file' AGENTS.md` | prints `0` — the claim S1 falsifies is gone. Before S5, `1` (`AGENTS.md:10`) |
| W9 | `grep -c 'blank or a row' AGENTS.md` | prints `1` — edit 7, the vendor-neutral half of the new invariant |

### Verify

```bash
# CLAUDE.md — edits 1-4
grep -nE 'falls back to|silently drops rows|is skipped|first fenced block' CLAUDE.md   # nothing
grep -c 'blank or a row' CLAUDE.md          # 2
grep -c 'bin/pipeline\.mjs' CLAUDE.md       # 2  — edits 1 and 4 (one line each)
grep -cE '^  pipeline\.mjs +' CLAUDE.md     # 1  — edit 2, the Layout entry
grep -rn '](' README.md CLAUDE.md | grep -F 'bin/pipeline.mjs'   # the new links
test -f bin/pipeline.mjs && echo "link target exists"

# AGENTS.md — edits 5-7, the same checks in the same shape
grep -c 'bin/pipeline\.mjs' AGENTS.md                 # 2  — edits 5 and 6
grep -cE '^\| `bin/pipeline\.mjs` \|' AGENTS.md       # 1  — edit 6, the Layout row
grep -c 'only executable file' AGENTS.md              # 0  — edit 5 removed the false claim
grep -c 'blank or a row' AGENTS.md                    # 1  — edit 7
grep -nE 'falls back to|silently drops|is skipped|first fenced block|<pre>' AGENTS.md   # nothing, before and after

npm test; echo "exit=$?"                    # expect exit=0
git diff --stat                             # CLAUDE.md and AGENTS.md only
```

Every `grep -c` above prints `0` and **exits 1** when there is no match — read the printed
number, not `$?`. Three of them (`grep -c 'only executable file' AGENTS.md`, and the two
`grep -nE` stale-prose patterns) expect no match, so they are expected to exit 1.

### Acceptance criteria

- [ ] W1-W9 as tabulated
- [ ] Both halves done — the stale claims removed **and** the new invariant stated; the S5
      risk row in `03-structure.md` is exactly the half-fix
- [ ] `CLAUDE.md` and `AGENTS.md` agree, as `AGENTS.md:3-5` requires: no claim that
      `bin/qrspi.mjs` is the only shipped executable, and a `bin/pipeline.mjs` entry in both
      `## Layout` blocks
- [ ] `git diff --stat` touches `CLAUDE.md` and `AGENTS.md` only
- [ ] Commit: `141 S5: CLAUDE.md and AGENTS.md — the generator's behaviour and the new check invariant`

---

## S6 · the built page, looked at

**Depends on S3. Who: the human.** D6 removed the only thing that stood between a parse
change and the hero. `diff -q` in S3 proves the bytes did not move; it cannot say the page
was ever right. Only this step looks. Do not substitute "the diff was empty" for it — that
is the failure `03-structure.md` names in S6's risk row.

### Files touched

| Path | Action |
|---|---|
| `thoughts/141-pipeline-row-parsing/99-progress.md` | modify — one row in `## Verifications run` |

`99-progress.md` is shared state. With sessions in parallel, this observation goes to the
single owner `05-implement.md` names, not through a concurrent edit.

### Verify

```bash
npm install --no-audit --no-fund      # marked, if this is a fresh session
npm run build:site
open site/dist/index.html             # or: xdg-open / explorer.exe, per platform
```

Then look, and check all four of these on the page:

1. The hero shows **six** phase rows — Questions, Research, Design, Structure, Plan,
   Implement — each with its number, its context figure, the arrow, the artifact in
   monospace, and its size. `Implement` has no size and its size cell is empty, not `null`.
2. **No `<pre>` block anywhere in the hero**, and no raw diagram text.
3. The lede above it is the two paragraphs it was — the three-line pitch, then the
   `Q → R → S → P → I` letters line — with **no stray `QRSPI` heading line** inside the
   lede (that is the H1 trap from S3; the hero's own `<h1>` is separate).
4. The paragraph below the diagram ("These are the phase's own context…") is there and
   intact.

Then write the observation into `## Verifications run` of
`thoughts/141-pipeline-row-parsing/99-progress.md`, replacing the `| <command> | <step> | <result> |`
placeholder row (or appending beside earlier real rows):

```
| `npm run build:site && open site/dist/index.html` | S6 | observed: the six phase rows draw with their context, arrow, artifact and size; no `<pre>` in the hero; the lede carries no stray heading line |
```

Proof it was recorded:

```bash
grep -nE '\|\s*S6\s*\|\s*observed:' thoughts/141-pipeline-row-parsing/99-progress.md
```

### Acceptance criteria

- [ ] All four observations above made by a human on the rendered page
- [ ] The row is in `99-progress.md` § Verifications run, result cell beginning `observed:`
- [ ] The grep above returns a hit
- [ ] Commit (artifact only): `141 S6: record the built page observation`

---

## S7 · CI on Node 18/20/22/24, on the real PR

**Depends on S1-S6, all landed on the branch and pushed. Who: live** — it needs a real
harness, GitHub Actions. This is the one claim no local run can make: D1 chose a repo-local
relative import because `check` runs with **no `npm install`** on four Node versions
(`.github/workflows/ci.yml:20-41`), and one developer machine runs one of them.

### Files touched

| Path | Action |
|---|---|
| `thoughts/141-pipeline-row-parsing/99-progress.md` | modify — one row in `## Verifications run` |

### Verify

The working branch is `fix/141-pipeline-rows`. Push it and open the PR — the description
contract is in `skills/qrspi/references/landing.md`, and `thoughts/141-pipeline-row-parsing/`
ships in the same PR as its own first commit:

```bash
git log --oneline main..HEAD              # one commit per step, in order, `141 Sn:` messages
git push -u origin fix/141-pipeline-rows
gh pr create --fill                       # or open it in the browser
gh pr checks --watch
```

Then confirm, on the run:

1. Job `check` green on Node **18, 20, 22 and 24** — four matrix legs, each running
   `node bin/qrspi.mjs check` with **no install step** (`ci.yml:20-41`). Node 18 is the
   one that matters: it is the floor, and a post-18 syntax or API in `bin/pipeline.mjs`
   fails only there.
2. The copy-mode install/uninstall round trip in the same job (`ci.yml:39-41`).
3. Job `site` green: `npm install`, `npm run build:site`, `npm pack --dry-run`
   (`ci.yml:45-57`) — the first time the new site code and the tarball are exercised
   together in CI.

Then a row in `## Verifications run` of
`thoughts/141-pipeline-row-parsing/99-progress.md`, result cell beginning `observed:` and
carrying the run URL:

```
| GitHub Actions `ci.yml` on the PR | S7 | observed: green — check on Node 18/20/22/24 with no install, copy-mode round trip, site + npm pack — https://github.com/Allan-Nava/qrspi/actions/runs/<id> |
```

Proof:

```bash
grep -nE '\|\s*S7\s*\|\s*observed:.*actions/runs/[0-9]+' thoughts/141-pipeline-row-parsing/99-progress.md
```

**Not in scope for this step** (`03-structure.md`): exercising the Pages hard-fail in CI.
That would mean pushing a deliberately malformed README. S2 and S3 prove the exit code
locally; `pages.yml:32-33` with `deploy` gated on `needs: build` (`:39-48`) is read, not
run.

**If CI disagrees:** the fault is in S1 — no other step changes. Re-open S1, keep the
module import-free and inside Node 18's syntax, and re-run S1's verify before pushing
again. The failure is cheap and early: `check` is the first job.

### Acceptance criteria

- [ ] `ci.yml` green on the PR, all four Node legs plus the `site` job
- [ ] The row with the run URL is in `99-progress.md`; the grep above returns a hit
- [ ] Commit (artifact only): `141 S7: record the CI observation`

---

## Rollback

There is nothing to roll back in production: no database, no migration, no runtime state,
no feature flag, no network call, no new dependency (`02-design.md` § Impact). Two things
are outward-facing, and both back out by revert.

**One commit per step** (`landing.md:43`), so each step is one `git revert`. Reverse
dependency order:

```bash
git revert <S5>     # CLAUDE.md + AGENTS.md
git revert <S3>     # site/build.mjs
git revert <S2>     # bin/qrspi.mjs
git revert <S1>     # bin/pipeline.mjs
npm test
```

S4, S6 and S7 have nothing to revert but their `99-progress.md` rows.

Partial states that are coherent, if only part of the change has to go:

| Reverted | Result |
|---|---|
| S3 alone | The site is back to the `<pre>` degrade and its own parser; `check` keeps the strict invariant from S2. Green, and still stricter than `8be8a5d`. |
| S2 alone | `check` is back to `pipelineRows`; `bin/pipeline.mjs` stays, imported by the site only. Green. |
| S2 and S3 | `bin/pipeline.mjs` is dead code again, as at the end of S1. Green. |
| S1 alone | **Not possible** while S2 or S3 is in. Revert them first, or the import fails at load. |
| Stopping early instead | Stopping after S3 leaves the repo correct, green and strictly stricter than `8be8a5d` — only `CLAUDE.md` and `AGENTS.md` lie, and `CLAUDE.md` lies today too (`03-structure.md` § Recommended execution order). `AGENTS.md` would be newly wrong, about `bin/pipeline.mjs` rather than about the generator. |

**The one irreversible path** is a release. If a tag is cut and published with a broken
`bin/pipeline.mjs`, npm versions are immutable: the remedy is a patch release, not an
unpublish. S4 exists to make that impossible — run it before any tag
(`CONTRIBUTING.md#releasing`).

**The accepted, deliberate regression** (Q4, D6, and `03-structure.md`'s S3 risk row): a
sloppy README edit now fails the Pages deploy where it used to degrade to a `<pre>`. That
is the trade the design chose — a loud nothing over a quiet wrong hero — and reverting S3
is how to take it back if it proves wrong in practice.

---

## Known weaknesses in this plan

Stated rather than hidden, so the reviewer can price them:

1. **The verify commands were not executed while this plan was written** — this session
   could not run `node` or `npm`. The module in S1 is traced against the real bytes of the
   three diagrams at `8be8a5d` (every fence is a bare ` ``` ` at column 0; `key`
   reproduces `bin/qrspi.mjs:269` character for character, which is why the three key
   lists must still compare equal), but the first thing S1 does is run its own verify, and
   that is the gate.
2. **`03-structure.md` S5 verify 1 is weaker than it reads.** Half its pattern is dead:
   `falls back to a` matches nothing even on the unedited `CLAUDE.md`, because the phrase
   spans a line break ("falls back to" ends `:329`, "a `<pre>`" begins `:330`). Only
   `silently drops rows` does any work. S5 replaces it with a four-alternative pattern
   that matches `CLAUDE.md:327`, `:329` and `:331` today, so all three stale lines are
   covered.
3. **S5 edits seven passages in two files, not the two `CLAUDE.md` ones Structure names.**
   The two extra `CLAUDE.md` passages (`:9-11`, the `## Layout` block) are defects this
   change introduces. `AGENTS.md` is in scope because it declares itself `CLAUDE.md`'s
   subset and that "the two must agree" (`AGENTS.md:3-5`), and it repeats two of the four
   facts being corrected; the reasons, and why the other two need no mirror, are stated in
   the step. `03-structure.md` names `AGENTS.md` nowhere — this is a Plan-phase addition,
   not a Structure requirement.
4. **S3 touches nine regions, not the five Structure estimated.** Same file, same size;
   the extra three are `parseReadme`'s now-unused `intro` field, the call site and the log
   line.
5. **One claim in `03-structure.md` is corrected here.** S3's verify 7 says the pre-change
   build "silently ships a five-row hero" when a junk line is *inserted* at
   `README.md:26`. It does not: the six rows still parse and the junk is dropped without a
   trace, so the hero is unchanged and the log still says `pipeline: 6 rows`. The five-row
   hero needs a row *replaced*, which is U5b. Both cases are now in S3's table; nothing
   about the fix changes.
6. **The HTML pre-filter now applies to the lede alone.** Byte-identical on today's README
   — no line between the closing fence and the first `##` opens one of those tags — and
   it is what `03-structure.md` S3 specifies, but it is a latent behaviour change to the
   after-text, not a pure refactor. `02-design.md` reads slightly differently ("in the rest
   of the intro it still corrupts such a line"); Structure's wording governs.

---

## Review — 2026-10-11

Three comments from `/qrspi:review`, accepted by the reviewer in chat. Nothing else was
reopened.

1. **S5 forgot `AGENTS.md`.** `AGENTS.md:3-5` declares itself `CLAUDE.md`'s vendor-neutral
   subset and that "the two must agree", and it repeats two of the four facts S5 corrects:
   `:10-11` says "the only executable file the package ships is `bin/qrspi.mjs`", and the
   `## Layout` table (`:28-54`) has a `` `bin/qrspi.mjs` `` row at `:33` and no
   `bin/pipeline.mjs` row. S5 now carries **edits 5-7** with old and new text quoted as
   edits 1-4 already are — the Project paragraph, the Layout row, and the
   duplicated-numbers editing rule at `:116-118` (the vendor-neutral half of edits 3 and 4)
   — plus W6-W9, the Verify commands, the `AGENTS.md` row in **Files touched**, and an
   acceptance criterion that the two files agree. The step states why edits 3 and 4 need no
   mirror: `AGENTS.md:70-72` delegates the full invariant list to `CLAUDE.md`, and
   `AGENTS.md:80-85` makes no claim about how the diagram is parsed
   (`grep -nE 'falls back to|silently drops|is skipped|first fenced block|<pre>' AGENTS.md`
   has no match at `8be8a5d`). Consequential edits: the S5 heading, the Rollback revert
   comment and its "stopping early" row, and known weakness 3.
2. **S5's W3 could not pass on correct work.** It expected `grep -c 'bin/pipeline.mjs'
   CLAUDE.md` to print "at least 3" for edits 1, 2 and 4, but `grep -c` counts matching
   **lines**, and only edits 1 and 4 put that literal on a line — edit 2's `## Layout` entry
   writes the file as `pipeline.mjs` indented under `bin/`, and the only absolute path in
   its prose is `bin/qrspi.mjs`. Correct work yields `2`. W3 now expects exactly `2` and
   says why; **W3b** (`grep -cE '^  pipeline\.mjs +' CLAUDE.md` → `1`) covers edit 2, so the
   pair fails if any one of the three edits is missing. The `AGENTS.md` edits get the same
   kind of check: W6 (literal, `2`), W7 (the Layout row specifically, `1`), W8 (the false
   claim gone, `0`), W9 (the new invariant stated, `1`), each with its pre-S5 value stated.
3. **S2's claim about identifiers was wrong, and S3 lacked S2's warning.** `canonical` and
   `copies` do exist in `check()` — `bin/qrspi.mjs:535`, inside the very block region 3
   replaces. The sentence under region 2 now says so: the three existing names (`drawn` at
   `:532`, `canonical` and `copies` at `:535`) are safe only because region 3 replaces
   `:531-552`, which declares them, and the genuinely new names are `pipe`, `why`, `problem`
   and `keys` — none of which appears anywhere in `bin/qrspi.mjs` at `8be8a5d`. S3's
   **Changes** now opens with the same "find it by the quoted text, not the line number"
   warning plus a nine-row anchor table, because S3 edits one file nine times in one session
   and the shift is not constant (region 1 inserts 1 line, region 2 inserts 35, region 5
   deletes 11, region 6 deletes 1). Regions 7-9 (`site/build.mjs:172-174`, `:419`, `:496`)
   are each a single line with no block to recognise, and `renderPipeline(` occurs at both
   `:96` and `:419`.

---

## Status

- [x] Every step has exact paths — S1-S7, with the regions named by `path:line` and by the
      comment that identifies them once the line numbers shift
- [x] Every new function has a complete signature — `readPipeline`, `readBlock`,
      `firstSectionLine`, `parseIntro`, `renderPipeline`, plus `PIPELINE_FILES` and the
      `die` helper. `bin/pipeline.mjs` is given verbatim, because its exact shape *is* the
      decision S2 and S3 run against in parallel
- [x] Every test case has inputs and expected outputs — C0-C10 (S1), T0-T6 (S2), U0-U8
      plus U5b (S3), V1-V3 (S4), W1-W9 (S5); no framework, per Q10. S6 and S7 carry
      observations instead, each with the grep that proves it was recorded
- [x] Every verification command is copy-pasteable — `$S` is defined once under Minimum
      context; GNU `sed` is stated as an assumption; `grep -c` printing `0` while exiting
      `1` is called out where it matters
- [x] **Zero-context test:** an agent reading only this file can execute it — the file
      numbers, cites or quotes every region it touches, and pastes no existing code it only
      needs to locate
- [x] Rollback plan present — per-step revert in reverse dependency order, the four
      coherent partial states, and the one irreversible path (a published tag)
- [x] Approved (2026-10-11, Allan Nava, in chat — "si approvo", after the three review comments were resolved)

> Next phase: **Implement**. It receives: this file + `99-progress.md`.
> One session per step.
