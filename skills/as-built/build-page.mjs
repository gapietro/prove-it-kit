#!/usr/bin/env node
// prove-it as-built page builder. Checks docs/AS-BUILT.md against the fixed
// shape of a light or full as-built document, then writes AS-BUILT.html beside
// it: one page, with the Mermaid library inside it, that fetches nothing.
// It understands only the Markdown the skill may write, and refuses the rest
// with a line number, so a malformed document can't become a page that looks
// fine. No dependencies. The browser is always called with an argument array.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, realpathSync, rmSync, mkdtempSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LIGHT_SECTIONS = ['The pieces', "One record's path", 'As built against as designed', 'Not verified'];
export const FULL_SECTIONS = ['Summary', 'Context', 'The pieces', 'The agent', 'Data flows', 'Configuration', 'As built against as designed', 'Not verified', 'Where next'];
export const FULL_SUBSECTIONS = {
  'The agent': ['Workflow and trigger', 'Role and instructions', 'Tools', 'Guardrails', 'What reaches the model'],
  'Data flows': ["One record's path", 'Other paths', 'Who writes and reads each table', "A run's life", 'Across the scope boundary'],
};
const DIAGRAM_TYPES = { flowchart: 'flowchart', graph: 'flowchart', sequenceDiagram: 'sequenceDiagram', 'stateDiagram-v2': 'stateDiagram-v2' };
const SOURCE_COLUMN = 'where it comes from';
// A host in any disguise: bold or code marks and zero-width characters are
// taken out before the test, and the government-cloud domain counts too.
const HOST_RE = /service-?now(services)?\W*\.\W*com/i;
const unmask = (line) => line.replace(/[*`_\u00ad\u200b-\u200f\u2060\ufeff]/g, '');
const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\//i;
// The only link a page may hold: a plain relative path. No scheme, no host, no
// backslash, no leading slash, no control character. An allowlist, because
// browsers accept too many spellings of a URL for a blocklist to hold.
const SAFE_HREF = /^(?![/\\])[A-Za-z0-9._~\-/#%]+$/;
const FENCE_OPEN = /^```\s*([\w.+#-]*)\s*$/;
const normalize = (md) => md.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');

// ---------- Markdown, the subset the skill may write ----------

const splitRow = (line) => {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
};
const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

// What no line may hold. A host is refused everywhere, a code block included.
// A diagram may hold nothing that could fetch or run: no directive, URL,
// url() or HTML. Links, images, raw HTML and rules are refused outside code.
// codeLines and diagramLines come from the parser, so the checker and the
// parser can never disagree about what is code.
function lineChecks(lines, codeLines, diagramLines) {
  const errors = [];
  lines.forEach((line, k) => {
    const n = k + 1;
    if (HOST_RE.test(unmask(line))) errors.push(`line ${n}: names an instance host (write the alias, never the host)`);
    if (diagramLines.has(k)) {
      if (/%%\{|:\/\/|url\s*\(|</i.test(line)) errors.push(`line ${n}: a diagram can't hold a directive (%%{), a URL, url() or HTML (<)`);
      return;
    }
    if (codeLines.has(k)) return;
    if (/^\s+```/.test(line)) errors.push(`line ${n}: code block inside a list or indented (not allowed: start it at the margin, after the list)`);
    if (/^```/.test(line)) errors.push(`line ${n}: unreadable code fence (write \`\`\` and one word, such as \`\`\`text)`);
    const text = line.replace(/`[^`]*`/g, '');
    if (URL_RE.test(text)) errors.push(`line ${n}: absolute link or URL (only relative links are allowed)`);
    for (const m of text.matchAll(/\]\(([^)]*)\)/g)) {
      if (!SAFE_HREF.test(m[1])) errors.push(`line ${n}: link target ${JSON.stringify(m[1])} is not allowed (only a relative path, such as ../RUNBOOK.md)`);
    }
    if (/!\[/.test(text)) errors.push(`line ${n}: image (not allowed: the page fetches nothing)`);
    if (/<[a-zA-Z/!]/.test(text)) errors.push(`line ${n}: raw HTML (not allowed: put a name such as <alias> in backticks)`);
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) errors.push(`line ${n}: horizontal rule (not allowed)`);
  });
  return errors;
}

export function parseMarkdown(md) {
  const lines = normalize(md).split('\n');
  const blocks = [];
  const errors = [];
  const codeLines = new Set();
  const diagramLines = new Set();
  let i = 0;
  const startsBlock = (l) => /^(#{1,6}\s|```|\||>)/.test(l) || LIST_RE.test(l);
  while (i < lines.length) {
    const line = lines[i];
    const n = i + 1;
    if (!line.trim()) { i++; continue; }
    const fence = line.match(FENCE_OPEN);
    if (fence) {
      let j = i + 1;
      // A new ```lang line before the closing fence means the close was left out.
      while (j < lines.length && !/^```/.test(lines[j])) j++;
      const closed = j < lines.length && /^```\s*$/.test(lines[j]);
      if (!closed) errors.push(`line ${n}: code block is never closed`);
      blocks.push({ type: 'code', lang: fence[1], text: lines.slice(i + 1, j).join('\n'), line: n });
      for (let k = i; k < (closed ? j + 1 : j); k++) {
        codeLines.add(k);
        if (fence[1] === 'mermaid' && k > i && k < j) diagramLines.add(k);
      }
      i = closed ? j + 1 : j; continue;
    }
    // Reported by lineChecks, and left out of the page: raw HTML, a fence that can't be read, a rule.
    if (/^\s*<[a-zA-Z/!]/.test(line) || /^```/.test(line) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { i++; continue; }
    const heading = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (heading) {
      if (heading[1].length > 4) errors.push(`line ${n}: heading deeper than four levels`);
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2], line: n });
      i++; continue;
    }
    if (line.startsWith('|')) {
      const header = splitRow(line);
      if (!/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
        errors.push(`line ${n}: table has no |---| line under its header`);
      }
      const rows = [];
      let j = i + 2;
      for (; j < lines.length && lines[j].startsWith('|'); j++) {
        const cells = splitRow(lines[j]);
        if (cells.length !== header.length) errors.push(`line ${j + 1}: row has ${cells.length} cells, the header has ${header.length} (write \\| for a | inside a cell)`);
        rows.push({ cells, line: j + 1 });
      }
      blocks.push({ type: 'table', header, rows, line: n });
      i = j; continue;
    }
    if (line.startsWith('>')) {
      const text = [];
      for (; i < lines.length && lines[i].startsWith('>'); i++) text.push(lines[i].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: text.join('\n'), line: n });
      continue;
    }
    if (LIST_RE.test(line)) {
      const list = { type: 'list', ordered: /^\s*\d+\./.test(line), items: [], line: n };
      let last = null;
      for (; i < lines.length && lines[i].trim(); i++) {
        const m = lines[i].match(LIST_RE);
        if (m && m[1].length >= 2 && list.items.length) {
          const parent = list.items.at(-1);
          parent.children ??= { ordered: /\d/.test(m[2]), items: [] };
          last = { text: m[3] };
          parent.children.items.push(last);
        } else if (m) {
          last = { text: m[3] };
          list.items.push(last);
        } else if (/^\s{2,}\S/.test(lines[i])) {
          last.text += `\n${lines[i].trim()}`;
        } else break;
      }
      blocks.push(list);
      continue;
    }
    const para = [];
    for (; i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(lines[i])); i++) {
      para.push(lines[i].trim());
    }
    blocks.push({ type: 'para', text: para.join('\n'), line: n });
  }
  errors.push(...lineChecks(lines, codeLines, diagramLines));
  errors.sort((x, y) => (Number(x.match(/^line (\d+)/)?.[1] ?? 0)) - (Number(y.match(/^line (\d+)/)?.[1] ?? 0)));
  return { blocks, errors };
}

// ---------- The fixed shape ----------

const diagramType = (text) => {
  const first = text.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('%%')) ?? '';
  return first.split(/\s+/)[0];
};

function sectionsOf(blocks, level) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'heading' && b.level <= level) {
      if (b.level === level) out.push({ name: b.text, line: b.line, blocks: [] });
      else out.push(null); // a higher heading ends the run
    } else if (out.length && out.at(-1)) out.at(-1).blocks.push(b);
  }
  return out.filter(Boolean);
}
const hasContent = (blocks) => blocks.some((b) => b.type !== 'heading');
const diagramsIn = (blocks) => blocks.filter((b) => b.type === 'code' && b.lang === 'mermaid');

function checkOrder(found, expected, what, errors, under = '') {
  const where = under ? ` under "${under}"` : '';
  for (const name of expected) if (!found.includes(name)) errors.push(`missing ${what} "${name}"${where}`);
  const present = found.filter((n) => expected.includes(n));
  const wanted = expected.filter((n) => present.includes(n));
  const firstWrong = present.find((n, k) => n !== wanted[k]);
  if (firstWrong) errors.push(`${what} "${firstWrong}"${where} is out of order (the order is: ${expected.join(', ')})`);
}

export function checkDocument(md, { expectMode } = {}) {
  const { blocks, errors } = parseMarkdown(md);
  const result = { mode: null, title: null, diagrams: [], blocks, errors };
  const first = blocks[0];
  if (first?.type === 'heading' && first.level === 1 && /^As built: \S/.test(first.text)) result.title = first.text;
  else errors.push('the first line must be "# As built: <app name>"');

  for (const b of blocks.slice(1)) if (b.type === 'heading' && b.level === 1) errors.push(`line ${b.line}: only one "#" heading, the title`);
  const firstH2 = blocks.findIndex((b) => b.type === 'heading' && b.level === 2);
  const head = blocks.slice(1, firstH2 === -1 ? blocks.length : firstH2);
  for (const b of head) {
    if (b.type !== 'list' && b.type !== 'para') errors.push(`line ${b.line}: only the Mode, Read at and Instance lines, and a note in plain sentences, go between the title and the first section`);
    if (b.type === 'para' && /Remove this paragraph/i.test(b.text)) errors.push(`line ${b.line}: the template's instructions are still in the document: remove them`);
  }
  const facts = head.filter((b) => b.type === 'list').flatMap((b) => b.items.map((it) => it.text));
  const fact = (name) => facts.find((f) => f.startsWith(`${name}:`))?.slice(name.length + 1).trim();
  const mode = fact('Mode');
  if (mode === undefined) errors.push('no "Mode:" line under the title (- Mode: light, or - Mode: full)');
  else if (mode !== 'light' && mode !== 'full') errors.push(`Mode must be light or full, not "${mode}"`);
  else result.mode = mode;
  if (!fact('Read at')) errors.push('no "Read at:" line under the title (the commit and the date)');
  if (!fact('Instance')) errors.push('no "Instance:" line under the title (the alias and release, or "not read")');
  if (expectMode && result.mode && result.mode !== expectMode) errors.push(`expected a ${expectMode} document, this one is ${result.mode}`);

  // Every diagram: an allowed type, and a sources table straight after it.
  blocks.forEach((b, k) => {
    if (b.type !== 'code' || b.lang !== 'mermaid') return;
    const type = diagramType(b.text);
    if (!DIAGRAM_TYPES[type]) errors.push(`line ${b.line}: diagram type "${type}" is not allowed (use flowchart, sequenceDiagram or stateDiagram-v2)`);
    result.diagrams.push({ line: b.line, type: DIAGRAM_TYPES[type] ?? type, text: b.text });
    const next = blocks[k + 1];
    const sourced = next?.type === 'table' && next.header.some((h) => h.toLowerCase() === SOURCE_COLUMN) && next.rows.length > 0;
    if (!sourced) errors.push(`line ${b.line}: diagram has no sources table (a table with a "Where it comes from" column, straight after the diagram)`);
  });
  for (const t of blocks.filter((b) => b.type === 'table')) {
    const col = t.header.findIndex((h) => h.toLowerCase() === SOURCE_COLUMN);
    if (col === -1) continue;
    for (const r of t.rows) if (r.cells.length === t.header.length && !r.cells[col]) errors.push(`line ${r.line}: "Where it comes from" is empty`);
  }

  if (!result.mode) return result;
  const expected = result.mode === 'light' ? LIGHT_SECTIONS : FULL_SECTIONS;
  const sections = sectionsOf(blocks, 2);
  const names = sections.map((s) => s.name);
  checkOrder(names, expected, 'section', errors);
  for (const s of sections) {
    if (!expected.includes(s.name)) errors.push(`line ${s.line}: unexpected section "${s.name}" (a ${result.mode} document has: ${expected.join(', ')})`);
    else if (!hasContent(s.blocks)) errors.push(`line ${s.line}: section "${s.name}" is empty (say "None in this app." when there is nothing to show)`);
  }
  const section = (name) => sections.find((s) => s.name === name);
  const needsDiagram = (name, blocksOfIt, type) => {
    if (!blocksOfIt) return;
    const d = diagramsIn(blocksOfIt);
    if (!d.length) errors.push(`"${name}" has no diagram`);
    else if (DIAGRAM_TYPES[diagramType(d[0].text)] !== type) errors.push(`line ${d[0].line}: "${name}" must be a ${type}`);
  };

  if (result.mode === 'light') {
    if (result.diagrams.length !== 2) errors.push(`a light document has exactly 2 diagrams, found ${result.diagrams.length}`);
    needsDiagram('The pieces', section('The pieces')?.blocks, 'flowchart');
    needsDiagram("One record's path", section("One record's path")?.blocks, 'sequenceDiagram');
    return result;
  }

  for (const [parent, wanted] of Object.entries(FULL_SUBSECTIONS)) {
    const s = section(parent);
    if (!s) continue;
    const subs = sectionsOf(s.blocks, 3);
    checkOrder(subs.map((x) => x.name), wanted, 'subsection', errors, parent);
    for (const sub of subs) if (!wanted.includes(sub.name)) errors.push(`line ${sub.line}: unexpected subsection "${sub.name}" under "${parent}" (it has: ${wanted.join(', ')}; use #### inside one of them)`);
    for (const sub of subs) if (wanted.includes(sub.name) && !hasContent(sub.blocks)) errors.push(`line ${sub.line}: subsection "${sub.name}" is empty (say "None in this app." when there is nothing to show)`);
  }
  needsDiagram('Context', section('Context')?.blocks, 'flowchart');
  needsDiagram('The pieces', section('The pieces')?.blocks, 'flowchart');
  const flows = section('Data flows');
  if (flows) {
    const path = sectionsOf(flows.blocks, 3).find((x) => x.name === "One record's path");
    needsDiagram("One record's path", path?.blocks, 'sequenceDiagram');
  }
  return result;
}

// ---------- The page ----------

export const sourceHash = (md) => createHash('sha256').update(normalize(md)).digest('hex').slice(0, 16);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  return text.split(/(`[^`]+`)/).map((part) => {
    if (/^`[^`]+`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
    return esc(part)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, href) => (SAFE_HREF.test(href) ? `<a href="${href}">${label}</a>` : all))
      .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*(\S(?:[^*]*?\S)?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  }).join('');
}

const slugger = () => {
  const used = new Set();
  return (text) => {
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = base;
    for (let k = 2; used.has(id); k++) id = `${base}-${k}`;
    used.add(id);
    return id;
  };
};

const listHtml = (list) => {
  const tag = list.ordered ? 'ol' : 'ul';
  return `<${tag}>${list.items.map((it) => `<li>${inline(it.text)}${it.children ? listHtml(it.children) : ''}</li>`).join('\n')}</${tag}>`;
};

function bodyHtml(blocks) {
  const slug = slugger();
  const toc = [];
  let heading = '';
  const out = [];
  for (const b of blocks.slice(1)) {
    if (b.type === 'heading') {
      const id = slug(b.text);
      heading = b.text;
      if (b.level === 2) toc.push({ id, text: b.text });
      out.push(`<h${b.level} id="${id}">${inline(b.text)}</h${b.level}>`);
    } else if (b.type === 'para') out.push(`<p>${inline(b.text)}</p>`);
    else if (b.type === 'quote') out.push(`<blockquote><p>${inline(b.text)}</p></blockquote>`);
    else if (b.type === 'list') out.push(listHtml(b));
    else if (b.type === 'table') {
      out.push(`<div class="table"><table>\n<thead><tr>${b.header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>\n<tbody>\n${
        b.rows.map((r) => `<tr>${r.cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n')}\n</tbody></table></div>`);
    } else if (b.type === 'code' && b.lang === 'mermaid') {
      out.push(`<figure class="diagram" data-line="${b.line}" data-drawn="pending">
<div class="drawing" role="img" aria-label="Diagram: ${esc(heading)}. The same diagram as text follows."></div>
<p class="draw-error" hidden></p>
<p class="zoom" hidden><button type="button" aria-pressed="false">Show at full size</button></p>
<details><summary>Diagram as text</summary><pre class="diagram-source">${esc(b.text)}</pre></details>
</figure>`);
    } else if (b.type === 'code') out.push(`<pre><code>${esc(b.text)}</code></pre>`);
  }
  return { html: out.join('\n'), toc };
}

const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#1b2430;--soft:#56616f;--line:#d5dae1;--accent:#1f5fbf;--code:#eef1f5;--warn-bg:#fff4e0;--warn-ink:#7a4a00}
@media (prefers-color-scheme:dark){:root{--bg:#12161c;--card:#1a2029;--ink:#e6e9ee;--soft:#a3adba;--line:#343d4a;--accent:#8ab4f8;--code:#232b36;--warn-bg:#3a2c10;--warn-ink:#ffd58a}}
*{box-sizing:border-box}
html{font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
body{margin:0 auto;max-width:62rem;padding:1.5rem 1rem 4rem}
h1{font-size:1.9rem;line-height:1.2;margin:0 0 .5rem}
h2{font-size:1.4rem;margin:2.6rem 0 .6rem;padding-top:.9rem;border-top:2px solid var(--line)}
h3{font-size:1.12rem;margin:1.8rem 0 .4rem}
h4{font-size:1rem;margin:1.4rem 0 .3rem;color:var(--soft)}
p,ul,ol{margin:.5rem 0}
a{color:var(--accent)}
code{font:.88em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--code);padding:.08em .32em;border-radius:4px;overflow-wrap:anywhere}
pre{background:var(--code);padding:.8rem 1rem;border-radius:8px;overflow-x:auto;font-size:.88rem;line-height:1.45}
pre code{background:none;padding:0;overflow-wrap:normal}
blockquote{margin:.6rem 0;padding:.1rem 1rem;border-left:4px solid var(--line);color:var(--soft)}
.table{overflow-x:auto;margin:.7rem 0}
table{border-collapse:collapse;width:100%;font-size:.92rem;background:var(--card)}
th,td{border:1px solid var(--line);padding:.42rem .6rem;text-align:left;vertical-align:top}
th{background:var(--code)}
header.facts ul{list-style:none;padding:0;margin:.4rem 0 0;color:var(--soft);display:flex;flex-wrap:wrap;gap:.2rem 1.4rem}
nav{margin:1.4rem 0 0;padding:.8rem 1rem;background:var(--card);border:1px solid var(--line);border-radius:8px}
nav h2{all:unset;font-weight:600;display:block;margin-bottom:.3rem}
nav ol{margin:0;padding-left:1.3rem;columns:2;column-gap:2rem}
figure.diagram{margin:1rem 0;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--card);break-inside:avoid}
.drawing{background:#fff;color:#111;border-radius:8px 8px 0 0;padding:1rem;overflow-x:auto;text-align:center;min-height:3rem}
.drawing svg{max-width:100%;height:auto}
.drawing.full-size{text-align:left}
.zoom{margin:0;padding:.4rem 1rem;border-top:1px solid var(--line)}
.zoom button{font:inherit;font-size:.85rem;color:var(--accent);background:none;border:1px solid var(--line);border-radius:6px;padding:.2rem .7rem;cursor:pointer}
.zoom button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.draw-error{margin:0;padding:.7rem 1rem;background:var(--warn-bg);color:var(--warn-ink);font-weight:600}
figure.diagram details{padding:.5rem 1rem;border-top:1px solid var(--line)}
figure.diagram summary{cursor:pointer;color:var(--soft)}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--soft);font-size:.85rem}
@media (max-width:40rem){nav ol{columns:1}}
@media print{html{background:#fff;color:#000;font-size:11pt}body{max-width:none;padding:0}nav,figure.diagram details,.zoom{display:none}
 body.full h2{break-before:page}body.full h2:first-of-type{break-before:auto}table,pre{break-inside:avoid}a{color:inherit;text-decoration:none}}
`;

const DRAW_JS = `
(async () => {
  const figures = [...document.querySelectorAll('figure.diagram')];
  try { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' }); } catch (e) {}
  let n = 0;
  for (const f of figures) {
    const id = 'as-built-diagram-' + (++n);
    const error = f.querySelector('.draw-error');
    try {
      const { svg } = await mermaid.render(id, f.querySelector('.diagram-source').textContent);
      const drawing = f.querySelector('.drawing');
      drawing.innerHTML = svg;
      f.dataset.drawn = 'yes';
      // A wide diagram is shrunk to fit. Offer it at its own size, scrolling sideways.
      const el = drawing.querySelector('svg');
      const natural = el && el.viewBox && el.viewBox.baseVal ? el.viewBox.baseVal.width : 0;
      if (el && natural > drawing.clientWidth) {
        const fitted = el.getAttribute('style') || '';
        const zoom = f.querySelector('.zoom');
        const button = zoom.querySelector('button');
        zoom.hidden = false;
        button.addEventListener('click', () => {
          const on = button.getAttribute('aria-pressed') !== 'true';
          button.setAttribute('aria-pressed', String(on));
          button.textContent = on ? 'Fit to the page' : 'Show at full size';
          drawing.classList.toggle('full-size', on);
          el.setAttribute('style', on ? 'max-width:none;width:' + natural + 'px' : fitted);
        });
      }
    } catch (e) {
      for (const stray of document.querySelectorAll('#' + id + ', #d' + id)) stray.remove();
      error.textContent = 'This diagram could not be drawn. Its text is below. ' + String((e && e.message) || e).split('\\n')[0];
      error.hidden = false;
      f.querySelector('details').open = true;
      f.dataset.drawn = 'no';
    }
  }
  document.documentElement.dataset.diagrams = 'done';
})();
`;

// A library inlined in a <script> must not be able to end it, or open a comment.
const inlineScript = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

export function renderPage(md, mermaidJs, { expectMode } = {}) {
  const doc = checkDocument(md, { expectMode });
  if (doc.errors.length) throw new Error(`not a valid as-built document:\n${doc.errors.map((e) => `  - ${e}`).join('\n')}`);
  const head = doc.blocks.slice(1).findIndex((b) => b.type === 'heading' && b.level === 2) + 1;
  const facts = doc.blocks.slice(1, head).filter((b) => b.type === 'list').flatMap((b) => b.items);
  const notes = doc.blocks.slice(1, head).filter((b) => b.type === 'para');
  const { html, toc } = bodyHtml([doc.blocks[0], ...doc.blocks.slice(head)]);
  const nav = doc.mode === 'full'
    ? `<nav aria-label="Contents"><h2>Contents</h2><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  // The page may run its own two scripts and nothing else, and may fetch
  // nothing at all: whatever a diagram or a link holds, the browser refuses it.
  const scripts = [inlineScript(mermaidJs), DRAW_JS];
  const allow = scripts.map((js) => `'sha256-${createHash('sha256').update(js).digest('base64')}'`).join(' ');
  const csp = `default-src 'none'; script-src ${allow}; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="as-built-source" content="${sourceHash(md)}">
<meta name="as-built-mode" content="${doc.mode}">
<title>${esc(doc.title)}</title>
<style>${CSS}</style>
</head>
<body class="${doc.mode}">
<header class="facts">
<h1>${inline(doc.title)}</h1>
<ul>${facts.map((f) => `<li>${inline(f.text)}</li>`).join('')}</ul>
${notes.map((n) => `<p>${inline(n.text)}</p>`).join('\n')}
</header>
${nav}
<main>
${html}
</main>
<footer>Built from AS-BUILT.md by the prove-it kit. The table under each diagram says where its boxes come from: check them before you rely on the picture. Diagrams are drawn in this page by Mermaid (MIT licence), and the page's security policy lets it fetch nothing.</footer>
<script>${scripts[0]}</script>
<script>${scripts[1]}</script>
</body>
</html>
`;
}

// ---------- Do the diagrams really draw? ----------

export function findBrowser(env = process.env, platform = process.platform) {
  if (env.PROVE_IT_BROWSER === 'none') return null;
  if (env.PROVE_IT_BROWSER) return existsSync(env.PROVE_IT_BROWSER) ? env.PROVE_IT_BROWSER : null;
  const fixed = platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : platform === 'win32'
      ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((root) => [
        join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')])
      : [];
  const names = platform === 'win32' ? [] : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  const onPath = (env.PATH ?? '').split(delimiter).filter(Boolean).flatMap((dir) => names.map((name) => join(dir, name)));
  return [...fixed, ...onPath].find((p) => existsSync(p)) ?? null;
}

// Opens the page headless and reads back which diagrams drew. Never throws:
// a browser that can't be run means "not checked", not "failed".
// The browser writes the finished page to a file, and is stopped as soon as
// the file is complete: some builds of Chrome print the page and then never
// exit, and a pipe would be held open by their helper processes.
export async function drawCheck(pagePath, browser = findBrowser(), { waitMs = 60000 } = {}) {
  if (!browser) return { checked: false, failed: [], reason: 'no Chrome, Edge or Chromium found' };
  const work = mkdtempSync(join(tmpdir(), 'as-built-browser-'));
  const domPath = join(work, 'dom.html');
  const fd = openSync(domPath, 'w');
  let child;
  try {
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      `--user-data-dir=${join(work, 'profile')}`, '--virtual-time-budget=20000', '--dump-dom', pathToFileURL(pagePath).href];
    if (process.env.CI) args.unshift('--no-sandbox');
    // Its own process group, so the browser's helpers are stopped with it.
    child = spawn(browser, args, { stdio: ['ignore', fd, 'ignore'], detached: process.platform !== 'win32' });
    let exited = false;
    child.on('exit', () => { exited = true; });
    child.on('error', () => { exited = true; });
    const read = () => { try { return readFileSync(domPath, 'utf8'); } catch { return ''; } };
    const complete = (dom) => /<\/html>\s*$/.test(dom);
    let dom = '';
    for (const end = Date.now() + waitMs; Date.now() < end;) {
      dom = read();
      if (complete(dom) || exited) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!complete(dom)) dom = read();
    if (!complete(dom)) return { checked: false, failed: [], reason: exited ? 'the browser could not be run' : `the browser gave no page in ${Math.round(waitMs / 1000)} seconds` };
    if (!/<html[^>]*data-diagrams="done"/.test(dom)) return { checked: false, failed: [], reason: 'the page did not finish drawing in the browser' };
    const failed = [];
    for (const m of dom.matchAll(/<figure class="diagram" data-line="(\d+)" data-drawn="(\w+)">[\s\S]*?<p class="draw-error"[^>]*>([\s\S]*?)<\/p>/g)) {
      if (m[2] !== 'yes') failed.push({ line: Number(m[1]), message: m[3].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') });
    }
    return { checked: true, failed };
  } catch {
    return { checked: false, failed: [], reason: 'the browser could not be run' };
  } finally {
    try { if (process.platform !== 'win32' && child?.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    try { child?.kill('SIGKILL'); } catch { /* already gone */ }
    try { closeSync(fd); } catch { /* already closed */ }
    try { rmSync(work, { recursive: true, force: true, maxRetries: 3 }); } catch { /* a locked profile folder is not our failure */ }
  }
}

// ---------- The command ----------

const USAGE = `usage: node build-page.mjs <path/to/AS-BUILT.md> [--mode light|full] [--check] [--no-draw-check]
  (no flag)        check the document, write AS-BUILT.html beside it, and check that every diagram draws
  --check          check the document and that the page was built from it; writes nothing
  --mode <mode>    refuse a document of the other mode
  --no-draw-check  don't open a browser to check the drawings`;

export async function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const modeAt = argv.indexOf('--mode');
  const expectMode = modeAt === -1 ? undefined : argv[modeAt + 1];
  const files = argv.filter((a, k) => !a.startsWith('--') && (modeAt === -1 || k !== modeAt + 1));
  const file = files[0];
  const unknown = [...flags].filter((f) => !['--mode', '--check', '--no-draw-check'].includes(f));
  if (files.length !== 1 || unknown.length || (modeAt !== -1 && !['light', 'full'].includes(expectMode))) {
    if (unknown.length) console.error(`unknown option: ${unknown.join(', ')}`);
    console.error(USAGE); return 2;
  }
  if (!existsSync(file)) { console.error(`no such file: ${file}\n${USAGE}`); return 2; }
  const md = readFileSync(file, 'utf8');
  const pagePath = join(dirname(file), `${basename(file).replace(/\.md$/i, '')}.html`);
  const doc = checkDocument(md, { expectMode });
  if (doc.errors.length) {
    console.error(`${basename(file)} is not a valid as-built document (${doc.errors.length} problem${doc.errors.length === 1 ? '' : 's'}):\n${doc.errors.map((e) => `  - ${e}`).join('\n')}`);
    return 1;
  }
  const summary = `${basename(file)}: ${doc.mode}, ${doc.diagrams.length} diagrams`;

  if (flags.has('--check')) {
    if (!existsSync(pagePath)) { console.error(`${summary}; no page: ${pagePath} doesn't exist. Build it: node build-page.mjs ${file}`); return 1; }
    const built = readFileSync(pagePath, 'utf8').match(/<meta name="as-built-source" content="([0-9a-f]+)">/)?.[1];
    if (built !== sourceHash(md)) { console.error(`${summary}; page is out of date: ${basename(pagePath)} was built from an earlier ${basename(file)}. Build it again.`); return 1; }
    console.log(`${summary}; page is current`);
    return 0;
  }

  const lib = readFileSync(new URL('./vendor/mermaid.min.js', import.meta.url), 'utf8');
  writeFileSync(pagePath, renderPage(md, lib, { expectMode }));
  console.log(summary);
  console.log(`wrote ${pagePath}`);
  if (flags.has('--no-draw-check')) { console.log('drawing not checked (--no-draw-check)'); return 0; }
  const drawn = await drawCheck(pagePath);
  if (!drawn.checked) { console.log(`drawing not checked: ${drawn.reason}. Open the page and look at each diagram.`); return 0; }
  if (drawn.failed.length) {
    rmSync(pagePath, { force: true });
    console.error(`${drawn.failed.length} diagram${drawn.failed.length === 1 ? '' : 's'} did not draw, so the page was removed:\n${drawn.failed.map((f) => `  - line ${f.line}: diagram did not draw: ${f.message}`).join('\n')}`);
    return 1;
  }
  console.log('every diagram drew');
  return 0;
}

// Run only when invoked directly (real paths: the kit may be reached through a symlink).
function invokedDirectly() {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}
if (process.argv[1] && invokedDirectly()) process.exitCode = await main(process.argv.slice(2));
