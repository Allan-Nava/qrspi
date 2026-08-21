#!/usr/bin/env node
// Builds site/dist/index.html from README.md.
//
// The page has no content of its own: every word on it comes from README.md or
// from the filesystem. Design lives here, prose lives there — the repo does not
// get a second copy of itself to keep in sync.
//
//   node site/build.mjs [--out site/dist]

import { marked } from 'marked'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'site/dist')
const REPO = 'https://github.com/Allan-Nava/qrspi'
const BLOB = `${REPO}/blob/main`
const SITE = 'https://allan-nava.github.io/qrspi/'

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const md = readFileSync(join(ROOT, 'README.md'), 'utf8')

marked.setOptions({ mangle: false, headerIds: false })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

// --- split README into an intro and one entry per H2, fence-aware -----------

function parseReadme(source) {
  const lines = source.split('\n')
  const sections = []
  let title = 'QRSPI'
  let current = { heading: null, lines: [] }
  let fenced = false

  for (const line of lines) {
    if (line.startsWith('```')) fenced = !fenced
    if (!fenced && line.startsWith('# ')) {
      title = line.slice(2).trim()
      continue
    }
    if (!fenced && line.startsWith('## ')) {
      sections.push(current)
      current = { heading: line.slice(3).trim(), lines: [] }
      continue
    }
    current.lines.push(line)
  }
  sections.push(current)

  const intro = sections.shift()
  return { title, intro: intro.lines.join('\n').trim(), sections: sections.map((s) => ({ ...s, body: s.lines.join('\n').trim() })) }
}

// The intro carries three things: the lede, the pipeline diagram, and the
// paragraph that explains why the pipeline matters. Pull them apart so the hero
// can lay them out instead of dumping one blob of prose.
function parseIntro(intro) {
  const m = intro.match(/^([\s\S]*?)```\n([\s\S]*?)```([\s\S]*)$/)
  if (!m) return { lede: intro, pipeline: null, after: '' }
  return { lede: m[1].trim(), pipeline: m[2].replace(/\n$/, ''), after: m[3].trim() }
}

// `Questions   ~15k burned   →  00-questions.md   (~1k)`
function parsePipeline(block) {
  if (!block) return null
  const rows = []
  for (const line of block.split('\n')) {
    const m = line.match(/^(\S+)\s{2,}(.+?)\s+→\s+(.+?)(?:\s{2,}\((.+)\))?\s*$/)
    if (!m) continue
    rows.push({ phase: m[1], context: m[2].trim(), output: m[3].trim(), size: m[4]?.trim() ?? null })
  }
  return rows.length >= 3 ? rows : null
}

// --- html fragments ---------------------------------------------------------

function renderPipeline(rows, fallback) {
  if (!rows) return `<pre class="fallback">${esc(fallback ?? '')}</pre>`
  const items = rows
    .map(
      (r, i) => `      <li class="flow-row">
        <span class="flow-n">${String(i).padStart(2, '0')}</span>
        <span class="flow-phase">${esc(r.phase)}</span>
        <span class="flow-ctx">${esc(r.context)}</span>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <code class="flow-out">${esc(r.output)}</code>
        <span class="flow-size">${r.size ? esc(r.size) : ''}</span>
      </li>`,
    )
    .join('\n')
  return `<ol class="flow">\n${items}\n    </ol>`
}

// A table whose header row is empty renders as a strip of blank cells.
function dropEmptyHead(html) {
  return html.replace(/<thead>[\s\S]*?<\/thead>/g, (thead) => (/>[^<\s][\s\S]*?<\/th>/.test(thead) ? thead : ''))
}

// Bare `path/` and `file.md` references in the README become links to the repo.
function linkifyPaths(html) {
  return html.replace(/<code>([\w./-]+\.(?:md|json|mjs)|(?:skills|commands|bin)\/[\w./-]*)<\/code>/g, (full, path) => {
    const clean = path.replace(/\/$/, '')
    if (!existsSync(join(ROOT, clean))) return full
    return `<a class="pathlink" href="${BLOB}/${clean}"><code>${path}</code></a>`
  })
}

const renderSection = (s) => {
  const id = slug(s.heading)
  return `  <section id="${id}">
    <h2><a class="anchor" href="#${id}">${esc(s.heading)}</a></h2>
${linkifyPaths(dropEmptyHead(marked.parse(s.body)))}
  </section>`
}

// The one thing the page adds to the README: an index of what actually ships,
// read off the filesystem so it cannot go stale.
function renderInventory() {
  const groups = []
  for (const skill of readdirSync(join(ROOT, 'skills'))) {
    const refDir = join(ROOT, 'skills', skill, 'references')
    const refs = existsSync(refDir) ? readdirSync(refDir).filter((f) => f.endsWith('.md')) : []
    const desc = (readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8').match(/^description:\s*([\s\S]*?)\n(?=\w+:|---)/m)?.[1] ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    groups.push({ skill, refs, desc })
  }
  return groups
    .map(
      (g) => `      <article class="card">
        <h3><a href="${BLOB}/skills/${g.skill}/SKILL.md"><code>${g.skill}</code></a></h3>
        <p>${esc(g.desc.length > 240 ? `${g.desc.slice(0, 237)}…` : g.desc)}</p>
        <ul class="refs">
${g.refs.map((r) => `          <li><a href="${BLOB}/skills/${g.skill}/references/${r}"><code>${r}</code></a></li>`).join('\n')}
        </ul>
      </article>`,
    )
    .join('\n')
}

// --- assemble ---------------------------------------------------------------

const { title, intro, sections } = parseReadme(md)
const { lede, pipeline, after } = parseIntro(intro)
const rows = parsePipeline(pipeline)
const description = lede
  .replace(/\*\*/g, '')
  .replace(/\n/g, ' ')
  .split(/\.\s/)[0]
  .concat('.')
// License is one word — the footer already carries it. The generated skills
// index goes before Prior art, so the page ends on credits, not on an appendix.
const body = sections.filter((s) => !/^license$/i.test(s.heading))
const nav = body.filter((s) => !/^prior art$/i.test(s.heading))
const priorArtAt = body.findIndex((s) => /^prior art$/i.test(s.heading))
const inventorySection = `  <section id="what-ships">
    <h2><a class="anchor" href="#what-ships">Read the skills</a></h2>
    <p>Straight from the repository. Each <code>SKILL.md</code> is an index of about a hundred lines; the references below it load only when a question needs them.</p>
    <div class="cards">
${renderInventory()}
    </div>
  </section>`
const rendered = body.map(renderSection)
rendered.splice(priorArtAt === -1 ? rendered.length : priorArtAt, 0, inventorySection)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — phase-gated context engineering for coding agents</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}">
<meta property="og:title" content="${esc(title)} — phase-gated context engineering for coding agents">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#c2653d"/><path d="M8 9h16M8 16h11M8 23h6" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
)}">
<style>
:root {
  --bg: #fbfaf8; --panel: #fff; --line: #e6e1d9; --ink: #1b1a18; --muted: #6b665e;
  --accent: #b7552f; --accent-soft: #f6e9e2; --code-bg: #f4f1ec;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #100f0e; --panel: #171614; --line: #2c2925; --ink: #ece8e1; --muted: #9b948a;
    --accent: #e0895d; --accent-soft: #2a1d16; --code-bg: #1c1a17;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 400 17px/1.65 var(--sans); -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 62rem; margin: 0 auto; padding: 0 1.5rem; }
a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
code { font-family: var(--mono); font-size: .88em; }
:not(pre) > code { background: var(--code-bg); padding: .12em .38em; border-radius: 4px; }
pre {
  background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
  padding: 1rem 1.1rem; overflow-x: auto; font-size: .86rem; line-height: 1.6;
}
pre code { background: none; padding: 0; }

/* header */
header.top {
  position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);
  background: var(--bg); background: color-mix(in srgb, var(--bg) 86%, transparent);
  border-bottom: 1px solid var(--line);
}
header.top .wrap { display: flex; align-items: center; gap: 1.5rem; height: 3.75rem; }
.brand { font-weight: 650; letter-spacing: .06em; color: var(--ink); text-decoration: none; }
.brand span { color: var(--accent); }
header.top nav { margin-left: auto; display: flex; gap: 1.15rem; flex-wrap: wrap; }
header.top nav a { color: var(--muted); text-decoration: none; font-size: .88rem; }
header.top nav a:hover { color: var(--ink); }

/* hero */
.hero { padding: 4.5rem 0 2.5rem; }
.eyebrow {
  display: inline-block; font: 600 .72rem/1 var(--mono); letter-spacing: .14em; text-transform: uppercase;
  color: var(--accent); background: var(--accent-soft); border-radius: 99px; padding: .45rem .8rem; margin-bottom: 1.5rem;
}
.hero h1 { font-size: clamp(2.6rem, 7vw, 4.2rem); line-height: 1; margin: 0 0 1.25rem; letter-spacing: -.03em; }
.lede { font-size: clamp(1.05rem, 2.2vw, 1.28rem); color: var(--muted); max-width: 46rem; margin: 0 0 1.75rem; }
.lede strong { color: var(--ink); font-weight: 600; }
.letters { font: 500 1rem/1.6 var(--mono); margin: 0 0 2.25rem; color: var(--muted); }
.letters strong { color: var(--accent); font-weight: 700; }
.cta { display: flex; gap: .7rem; flex-wrap: wrap; margin-bottom: 3rem; }
.cta a {
  display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; font-size: .93rem; font-weight: 550;
  padding: .62rem 1.1rem; border-radius: 8px; border: 1px solid var(--line); color: var(--ink); background: var(--panel);
}
.cta a.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.cta a:hover { border-color: var(--accent); }

/* pipeline */
.flow { list-style: none; margin: 0; padding: .5rem; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; }
.flow-row {
  display: grid; grid-template-columns: 2.2rem 7.5rem minmax(8rem, 1fr) 1.5rem minmax(10rem, 1.1fr) 3.5rem;
  align-items: center; gap: .5rem; padding: .62rem .75rem; border-radius: 8px; min-width: 40rem;
}
.flow-row + .flow-row { border-top: 1px solid var(--line); border-radius: 0; }
.flow-row:hover { background: var(--code-bg); }
.flow-n { font: 500 .78rem var(--mono); color: var(--muted); opacity: .6; }
.flow-phase { font-weight: 600; }
.flow-ctx, .flow-size { font: 400 .82rem var(--mono); color: var(--muted); }
.flow-arrow { color: var(--accent); text-align: center; }
.flow-out { justify-self: start; background: var(--accent-soft) !important; color: var(--accent); padding: .2em .55em !important; border-radius: 5px; }
.flow-size { text-align: right; }
.note { color: var(--muted); max-width: 46rem; margin: 1.5rem 0 0; font-size: .98rem; }

/* sections */
section { padding: 3.25rem 0; border-top: 1px solid var(--line); }
section h2 { font-size: 1.55rem; letter-spacing: -.02em; margin: 0 0 1.25rem; }
section h2 .anchor { color: inherit; text-decoration: none; }
section h2 .anchor:hover::after { content: " #"; color: var(--accent); }
section h3 { font-size: 1.05rem; margin: 2rem 0 .5rem; }
section p, section li { max-width: 48rem; }
table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; font-size: .93rem; display: block; overflow-x: auto; }
th, td { text-align: left; padding: .62rem .8rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
blockquote { margin: 1.25rem 0; padding: .1rem 0 .1rem 1.1rem; border-left: 3px solid var(--accent); color: var(--muted); }

/* the six rules, as cards */
#six-non-negotiable-rules ol { list-style: none; counter-reset: rule; display: grid; gap: .9rem; padding: 0; margin: 0; grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr)); }
#six-non-negotiable-rules li {
  counter-increment: rule; position: relative; background: var(--panel); border: 1px solid var(--line);
  border-radius: 12px; padding: 1.1rem 1.2rem 1.1rem 3.2rem; max-width: none; font-size: .95rem; color: var(--muted);
}
#six-non-negotiable-rules li::before {
  content: counter(rule); position: absolute; left: 1.1rem; top: 1rem;
  font: 700 .8rem/1.35rem var(--mono); width: 1.35rem; height: 1.35rem; text-align: center;
  border-radius: 6px; background: var(--accent-soft); color: var(--accent);
}
#six-non-negotiable-rules li strong { display: block; color: var(--ink); font-size: 1rem; margin-bottom: .15rem; }

/* inventory */
.cards { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 1.25rem; }
.card h3 { margin: 0 0 .5rem; font-size: 1rem; }
.card p { color: var(--muted); font-size: .9rem; margin: 0 0 .9rem; }
.refs { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
.refs a { display: inline-block; font-size: .78rem; text-decoration: none; background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: .2rem .5rem; }
.refs a:hover { border-color: var(--accent); }

/* copy button */
.codeblock { position: relative; }
.copy {
  position: absolute; top: .55rem; right: .55rem; font: 500 .72rem var(--sans); cursor: pointer;
  background: var(--panel); color: var(--muted); border: 1px solid var(--line); border-radius: 6px; padding: .25rem .55rem;
  opacity: 0; transition: opacity .15s;
}
.codeblock:hover .copy, .copy:focus { opacity: 1; }
.copy:hover { color: var(--accent); border-color: var(--accent); }

footer { border-top: 1px solid var(--line); padding: 2.5rem 0 4rem; color: var(--muted); font-size: .88rem; }
footer a { color: var(--muted); }
footer .row { display: flex; gap: 1.25rem; flex-wrap: wrap; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
@media (max-width: 640px) { .hero { padding-top: 3rem; } header.top nav a:not(.gh) { display: none; } }
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="brand" href="#top">QR<span>SPI</span></a>
    <nav>
${nav.map((s) => `      <a href="#${slug(s.heading)}">${esc(s.heading)}</a>`).join('\n')}
      <a class="gh" href="${REPO}">GitHub</a>
    </nav>
  </div>
</header>

<main class="wrap" id="top">
  <div class="hero">
    <span class="eyebrow">Claude Code plugin · v${esc(pkg.version)}</span>
    <h1>${esc(title)}</h1>
    <div class="lede">${marked.parseInline(lede.split('\n\n')[0].replace(/\n/g, ' '))}</div>
    <p class="letters">${marked.parseInline(lede.split('\n\n')[1] ?? '')}</p>
    <div class="cta">
      <a class="primary" href="#install">Install</a>
      <a href="${REPO}">Source</a>
      <a href="https://www.npmjs.com/package/${pkg.name}">npm</a>
    </div>
    ${renderPipeline(rows, pipeline)}
    <div class="note">${marked.parse(after)}</div>
  </div>

${rendered.join('\n\n')}
</main>

<footer>
  <div class="wrap row">
    <span>MIT · <a href="${REPO}">Allan-Nava/qrspi</a></span>
    <span>Generated from <a href="${BLOB}/README.md">README.md</a></span>
  </div>
</footer>

<script>
for (const pre of document.querySelectorAll('pre')) {
  const box = document.createElement('div')
  box.className = 'codeblock'
  pre.parentNode.insertBefore(box, pre)
  box.appendChild(pre)
  const btn = document.createElement('button')
  btn.className = 'copy'
  btn.textContent = 'copy'
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText)
      btn.textContent = 'copied'
      setTimeout(() => { btn.textContent = 'copy' }, 1400)
    } catch { btn.textContent = 'failed' }
  })
  box.appendChild(btn)
}
</script>
</body>
</html>
`

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'index.html'), html)
writeFileSync(join(OUT, '.nojekyll'), '')
console.log(`built ${join(OUT, 'index.html')} — ${(html.length / 1024).toFixed(1)} kB, ${rendered.length} sections, pipeline: ${rows ? `${rows.length} rows` : 'fallback <pre>'}`)
