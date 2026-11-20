import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkDocument, renderPage, sourceHash, findBrowser, drawCheck, LIGHT_SECTIONS, FULL_SECTIONS, FULL_SUBSECTIONS,
} from '../skills/as-built/build-page.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SCRIPT = here('../skills/as-built/build-page.mjs');
const fixture = (name) => readFileSync(here(`./fixtures/${name}`), 'utf8');
const light = () => fixture('as-built.light.md');
const full = () => fixture('as-built.full.md');
const has = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected an error containing "${text}", got ${JSON.stringify(errors)}`);
const lineOf = (md, text) => md.split('\n').findIndex((l) => l.includes(text)) + 1;
const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
const scratchDirs = [];
process.on('exit', () => { for (const d of scratchDirs) rmSync(d, { recursive: true, force: true }); });
const scratch = (name, md) => {
  const dir = mkdtempSync(join(tmpdir(), 'as-built-'));
  scratchDirs.push(dir);
  const file = join(dir, 'AS-BUILT.md');
  writeFileSync(file, md ?? fixture(name));
  return { dir, file, page: join(dir, 'AS-BUILT.html') };
};

const page = (md) => renderPage(md, 'globalThis.mermaid = {};');

// The shape of a document

test('the light fixture is a valid light document with two diagrams', () => {
  const r = checkDocument(light());
  assert.deepEqual(r.errors, []);
  assert.equal(r.mode, 'light');
  assert.equal(r.diagrams.length, 2);
});
test('the full fixture is a valid full document', () => {
  const r = checkDocument(full());
  assert.deepEqual(r.errors, []);
  assert.equal(r.mode, 'full');
  assert.ok(r.diagrams.length >= 4);
});
test('a document with no Mode line is refused', () => {
  has(checkDocument(light().replace('- Mode: light\n', '')).errors, 'no "Mode:" line');
});
test('an unknown mode is refused', () => {
  has(checkDocument(light().replace('Mode: light', 'Mode: short')).errors, 'Mode must be light or full');
});
test('a document with no "Read at" line is refused', () => {
  has(checkDocument(light().replace(/- Read at:.*\n/, '')).errors, 'no "Read at:" line');
});
test('a title that does not start "As built:" is refused', () => {
  has(checkDocument(light().replace('# As built: ', '# Architecture of ')).errors, 'first line must be "# As built: <app name>"');
});
test('a light document with a third diagram is refused', () => {
  const md = light().replace('## Not verified', '```mermaid\nflowchart LR\n  a --> b\n```\n\n| Piece | Where it comes from |\n|---|---|\n| a | `src/a.now.ts` |\n\n## Not verified');
  has(checkDocument(md).errors, 'a light document has exactly 2 diagrams, found 3');
});
test('a light document missing a section is refused, by name', () => {
  const md = light().replace(/## As built against as designed[\s\S]*?(?=## Not verified)/, '');
  has(checkDocument(md).errors, 'missing section "As built against as designed"');
});
test('sections out of order are refused', () => {
  const md = light();
  const a = md.indexOf('## As built against as designed');
  const b = md.indexOf('## Not verified');
  const swapped = md.slice(0, a) + md.slice(b) + '\n' + md.slice(a, b);
  has(checkDocument(swapped).errors, 'out of order');
});
test('a section the mode does not have is refused', () => {
  has(checkDocument(light().replace('## Not verified', '## Deployment\n\nSome text.\n\n## Not verified')).errors, 'unexpected section "Deployment"');
});
test('an empty section is refused', () => {
  const md = light().replace(/## Not verified[\s\S]*$/, '## Not verified\n');
  has(checkDocument(md).errors, 'section "Not verified" is empty');
});
test('a full document missing a subsection is refused, by name', () => {
  const md = full().replace(/### Guardrails[\s\S]*?(?=### What reaches the model)/, '');
  has(checkDocument(md).errors, 'missing subsection "Guardrails" under "The agent"');
});
test('a full document needs a diagram in Context, The pieces and One record\'s path', () => {
  for (const [heading, name] of [['## Context', 'Context'], ['## The pieces', 'The pieces'], ["### One record's path", "One record's path"]]) {
    const at = full().indexOf(`${heading}\n`);
    const md = full().slice(0, at) + full().slice(at).replace(/```mermaid[\s\S]*?```\n/, '');
    has(checkDocument(md).errors, `"${name}" has no diagram`);
  }
});
test('the light document\'s two diagrams are a flowchart, then a sequence diagram', () => {
  has(checkDocument(light().replace('sequenceDiagram', 'flowchart TD')).errors, '"One record\'s path" must be a sequenceDiagram');
  has(checkDocument(light().replace('flowchart LR', 'stateDiagram-v2')).errors, '"The pieces" must be a flowchart');
});
test('a second top-level heading is refused', () => {
  has(checkDocument(full() + '\n# Appendix\n\nMore.\n').errors, 'only one "#" heading');
});
test('between the title and the first section: the fact lines and a note are kept, anything else is refused', () => {
  const noted = light().replace('## The pieces', 'A note on *what* this is.\n\n## The pieces');
  assert.deepEqual(checkDocument(noted).errors, []);
  assert.ok(page(noted).includes('<p>A note on <em>what</em> this is.</p>'), 'the note is on the page, not dropped');
  const table = light().replace('## The pieces', '| A | B |\n|---|---|\n| 1 | 2 |\n\n## The pieces');
  has(checkDocument(table).errors, `line ${lineOf(table, '| A | B |')}: only the Mode, Read at and Instance lines`);
  const leftover = light().replace('## The pieces', 'Remove this paragraph and every instruction line when you write the document.\n\n## The pieces');
  has(checkDocument(leftover).errors, "the template's instructions are still in the document");
});
test('an unknown subsection under The agent or Data flows is refused', () => {
  has(checkDocument(full().replace('### Guardrails', '### Marketing\n\nText.\n\n### Guardrails')).errors, 'unexpected subsection "Marketing" under "The agent"');
});
test('subsections out of order are refused', () => {
  const md = full().replace('### Tools', '### X1').replace('### Guardrails', '### Tools').replace('### X1', '### Guardrails');
  has(checkDocument(md).errors, 'out of order');
});
test('a sources table must come straight after its diagram', () => {
  const md = light().replace('```\n\n| Piece | Kind |', '```\n\nSome words first.\n\n| Piece | Kind |');
  has(checkDocument(md).errors, 'diagram has no sources table');
});

// Every diagram can be checked

test('a diagram with no sources table is refused, with its line', () => {
  const md = light().replace(/\| Step \| What happens[\s\S]*?(?=## As built against)/, '');
  const r = checkDocument(md);
  has(r.errors, `line ${lineOf(md, 'sequenceDiagram') - 1}: diagram has no sources table`);
});
test('a sources table needs a "Where it comes from" column', () => {
  has(checkDocument(light().replace('| Piece | Kind | Where it comes from |', '| Piece | Kind | Source |')).errors, 'diagram has no sources table');
});
test('an empty "Where it comes from" cell is refused, with its line', () => {
  const md = light().replace('| Table | `src/tables/cluster.now.ts` |', '| Table |  |');
  has(checkDocument(md).errors, `line ${lineOf(md, '| x_kgf_cluster | Table |')}: "Where it comes from" is empty`);
});
test('a diagram type outside the three allowed is refused', () => {
  has(checkDocument(light().replace('flowchart LR', 'C4Context')).errors, 'diagram type "C4Context" is not allowed');
});
test('a code block inside a list item is refused', () => {
  has(checkDocument(light().replace('- Whether a real run', '- A step\n\n  ```js\n  x\n  ```\n- Whether a real run')).errors, 'code block inside a list');
});
test('a code block may name a language with a dot or a plus', () => {
  const md = full().replace('```text\nYou draft', '```now.ts\nYou draft');
  assert.deepEqual(checkDocument(md).errors, []);
});
test('a diagram may not hold a directive, a URL, a url() or HTML', () => {
  for (const bad of ['%%{init: {"themeCSS": ".node rect{fill:red}"}}%%', '  x["see http://example.com/x"] --> job', '  x["a url(data:x)"] --> job', "  x[\"<img src='x'>A\"] --> job"]) {
    const md = light().replace('flowchart LR\n', `flowchart LR\n${bad}\n`);
    has(checkDocument(md).errors, `line ${lineOf(md, bad.trim())}: a diagram can't hold`);
  }
});
test('an unclosed code fence is refused', () => {
  has(checkDocument(light().replace('```\n\n| Piece |', '\n| Piece |')).errors, 'code block is never closed');
});

// What must never be in the document

test('an instance hostname is refused, with its line', () => {
  const md = light().replace('alias `dev-test`', 'dev12345.service-now.com');
  has(checkDocument(md).errors, `line ${lineOf(md, 'service-now.com')}: names an instance host`);
});
test('an absolute link or bare URL is refused', () => {
  has(checkDocument(light().replace('no run was read', 'see [the docs](https://example.com/x)')).errors, 'absolute link');
  has(checkDocument(light().replace('no run was read', 'see http://example.com/x')).errors, 'absolute link');
});
test('only a plain relative path is a link: every other target is refused, and never becomes a link', () => {
  const hostile = ['javascript:alert%281%29', '\u0001javascript:alert%281%29', '\u0001https:evil.example/x', '//evil.example/x', '/\\evil.example/x',
    '\\\\evil.example\\share', 'mailto:a@example.com', '/etc/passwd', 'x"onmouseover="y', 'data:text/html,x'];
  for (const target of hostile) {
    const md = light().replace('no run was read', `see [here](${target})`);
    has(checkDocument(md).errors, `line ${lineOf(md, 'see [here]')}: link target`);
    assert.throws(() => page(md));
  }
  assert.deepEqual(checkDocument(light().replace('no run was read', 'see [the design](DESIGN-Gap.md#terms) and [up](../RUNBOOK.md)')).errors, []);
});
test('a link hidden behind a fence the parser does not read as code is still checked', () => {
  const md = light().replace('## Not verified\n', '## Not verified\n\n```a b\n[click](javascript:alert%281%29)\n```\n');
  const r = checkDocument(md);
  assert.ok(r.errors.length > 0);
  assert.throws(() => page(md));
});
test('a host is refused in every disguise', () => {
  for (const host of ['acme.servicenowservices.com', 'acme.service-**now**.com', 'acme.service-now\u200b.com', 'ACME.SERVICE-NOW.COM', 'acme.service-`now`.com']) {
    const md = light().replace('no run was read', `seen on ${host}`);
    has(checkDocument(md).errors, `line ${lineOf(md, 'seen on')}: names an instance host`);
  }
});
test('HTML in the middle of a line, and a horizontal rule, are refused', () => {
  has(checkDocument(light().replace('no run was read', 'one<br>two')).errors, 'raw HTML');
  has(checkDocument(light().replace('## Not verified', '---\n\n## Not verified')).errors, 'horizontal rule');
  assert.deepEqual(checkDocument(light().replace('no run was read', 'a < b, and `<alias>` in code')).errors, []);
});
test('a file that starts with a byte-order mark is read', () => {
  assert.deepEqual(checkDocument('\ufeff' + light()).errors, []);
  assert.equal(sourceHash('\ufeff' + light()), sourceHash(light()));
});
test('a heading keeps a trailing #', () => {
  assert.equal(checkDocument(light().replace('# As built: Knowledge Gap Finder', '# As built: Tool C#')).title, 'As built: Tool C#');
});
test('raw HTML is refused, with its line', () => {
  const md = light().replace('## Not verified', '<div>hello</div>\n\n## Not verified');
  has(checkDocument(md).errors, `line ${lineOf(md, '<div>')}: raw HTML`);
});
test('an image is refused', () => {
  has(checkDocument(light().replace('no run was read', '![shot](shot.png)')).errors, 'image');
});
test('a table row with the wrong number of cells is refused', () => {
  const md = light().replace('| C4 | A rate limit of 10 drafts an hour |', '| C4 |');
  has(checkDocument(md).errors, 'cells, the header has');
});

// The page


test('the page holds the library, the source hash and no outside address', () => {
  const html = page(light());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('globalThis.mermaid = {};'));
  assert.ok(html.includes(`<meta name="as-built-source" content="${sourceHash(light())}">`));
  assert.ok(html.includes('<title>As built: Knowledge Gap Finder</title>'));
  assert.equal(/(src|href)="(https?:)?\/\//.test(html), false, 'the page must fetch nothing');
});
test('the page allows only its own two scripts, and no fetch of any kind', () => {
  const html = page(full());
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
  assert.ok(csp, 'the page has a Content-Security-Policy');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src data:/);
  assert.equal(/https?:|\*|unsafe-eval/.test(csp), false);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2);
  for (const body of scripts) assert.ok(csp.includes(`'sha256-${createHash('sha256').update(body).digest('base64')}'`), 'each script is allowed by its hash');
  assert.equal(/script-src[^;]*unsafe-inline/.test(csp), false);
});
test('the library can\'t close its own script tag', () => {
  const html = renderPage(light(), 'var a = "</script><script>alert(1)</script>"; var b = "<!--";');
  assert.equal(html.includes('"</script><script>alert(1)'), false);
  assert.ok(html.includes('<\\/script>'));
  assert.equal(html.includes('"<!--"'), false);
});
test('each diagram keeps its source as text, escaped', () => {
  const html = page(light());
  assert.equal((html.match(/<figure class="diagram"/g) ?? []).length, 2);
  assert.ok(html.includes('J-&gt;&gt;Q: insert a request for the top cluster'));
  assert.ok(html.includes('Diagram as text'));
});
test('text is escaped, and inline code, bold and relative links are kept', () => {
  const md = full().replace('Nothing is published\nwithout a person.', 'Nothing is **published** without a `<person>` & a reason.');
  const html = page(md);
  assert.ok(html.includes('<strong>published</strong> without a <code>&lt;person&gt;</code> &amp; a reason.'));
  assert.ok(html.includes('<a href="../RUNBOOK.md">RUNBOOK.md</a>'));
});
test('bold and italic work around inline code, and the code stays escaped', () => {
  const md = light().replace('- Whether a real run reaches `write_draft`: no run was read, only the wiring.',
    '- **Not checked: the user `hr.router`**, and *the `<b>` table*, and `**not bold**` in code.');
  const html = page(md);
  assert.ok(html.includes('<strong>Not checked: the user <code>hr.router</code></strong>, and <em>the <code>&lt;b&gt;</code> table</em>, and <code>**not bold**</code> in code.'), html.match(/<li>[^\n]*Not checked[^\n]*/)?.[0]);
});
test('tables, lists and code blocks become their elements', () => {
  const html = page(full());
  assert.ok(html.includes('<th>Where it comes from</th>'));
  assert.ok(html.includes('<td><code>src/tables/cluster.now.ts</code></td>'));
  assert.ok(html.includes('<li>Nothing from <code>kb_knowledge</code>.</li>'));
  assert.ok(html.includes('<pre><code>You draft one knowledge article'));
});
test('a full page has a table of contents; a light page has none', () => {
  assert.ok(page(full()).includes('<nav'));
  assert.equal(page(light()).includes('<nav'), false);
});
test('the source hash ignores line endings', () => {
  assert.equal(sourceHash(light()), sourceHash(light().replace(/\n/g, '\r\n')));
});
test('rendering an invalid document throws', () => {
  assert.throws(() => page(light().replace('- Mode: light\n', '')), /Mode/);
});

// The template agrees with the checker

test('templates/AS-BUILT.md names every section and subsection of a full document', () => {
  const tpl = readFileSync(here('../templates/AS-BUILT.md'), 'utf8');
  for (const s of FULL_SECTIONS) assert.ok(tpl.includes(`\n## ${s}\n`), `template lacks "## ${s}"`);
  for (const [, subs] of Object.entries(FULL_SUBSECTIONS)) for (const s of subs) assert.ok(tpl.includes(`\n### ${s}\n`), `template lacks "### ${s}"`);
  const everyFull = [...FULL_SECTIONS, ...Object.values(FULL_SUBSECTIONS).flat()];
  for (const s of LIGHT_SECTIONS) assert.ok(everyFull.includes(s), `light section "${s}" must exist in full`);
});
test('the skill names the builder, the template and both modes', () => {
  const skill = readFileSync(here('../skills/as-built/SKILL.md'), 'utf8').replace(/\s+/g, ' ');
  for (const s of ['${CLAUDE_PLUGIN_ROOT}/skills/as-built/build-page.mjs', '${CLAUDE_PLUGIN_ROOT}/templates/AS-BUILT.md', 'docs/AS-BUILT.md', 'docs/AS-BUILT.html', '`full`']) {
    assert.ok(skill.includes(s), `SKILL.md lacks ${s}`);
  }
  for (const s of [...FULL_SECTIONS, ...Object.values(FULL_SUBSECTIONS).flat()]) assert.ok(skill.includes(s), `SKILL.md never names "${s}"`);
});
test('the vendored library is the version its notice names', () => {
  const notice = readFileSync(here('../skills/as-built/vendor/README.md'), 'utf8');
  const version = notice.match(/mermaid (\d+\.\d+\.\d+)/)?.[1];
  assert.ok(version, 'vendor/README.md must name the version');
  const lib = readFileSync(here('../skills/as-built/vendor/mermaid.min.js'), 'utf8');
  assert.ok(lib.includes(`"${version}"`), `mermaid.min.js does not contain version ${version}`);
  const sum = createHash('sha256').update(readFileSync(here('../skills/as-built/vendor/mermaid.min.js'))).digest('hex');
  assert.ok(notice.includes(sum), 'vendor/README.md must hold the sha256 of mermaid.min.js');
  assert.ok(existsSync(here('../skills/as-built/vendor/LICENSE-mermaid')));
});

// The command

test('the command builds the page beside the document, and --check then passes', () => {
  const s = scratch('as-built.light.md');
  const built = run([s.file, '--no-draw-check']);
  assert.equal(built.status, 0, built.stderr);
  assert.match(built.stdout, /light, 2 diagrams/);
  assert.ok(readFileSync(s.page, 'utf8').includes(sourceHash(light())));
  const checked = run([s.file, '--check']);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /page is current/);
});
test('--check fails when the page is missing, and writes nothing', () => {
  const s = scratch('as-built.light.md');
  const r = run([s.file, '--check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no page/);
  assert.equal(existsSync(s.page), false);
});
test('--check fails when the document changed after the page was built', () => {
  const s = scratch('as-built.light.md');
  assert.equal(run([s.file, '--no-draw-check']).status, 0);
  writeFileSync(s.file, light().replace('only the wiring', 'only the wiring was read'));
  const r = run([s.file, '--check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /page is out of date/);
});
test('an invalid document builds no page and lists every error', () => {
  const s = scratch(null, light().replace('- Mode: light\n', '').replace('alias `dev-test`', 'dev12345.service-now.com'));
  const r = run([s.file, '--no-draw-check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no "Mode:" line/);
  assert.match(r.stderr, /names an instance host/);
  assert.equal(existsSync(s.page), false);
});
test('a missing file, or no argument, is a usage error', () => {
  assert.equal(run([]).status, 2);
  assert.equal(run([join(tmpdir(), 'no-such-AS-BUILT.md')]).status, 2);
});
test('an unknown flag, or a second file, is a usage error and builds nothing', () => {
  const s = scratch('as-built.light.md');
  for (const args of [[s.file, '--chek'], [s.file, '--mode=full'], [s.file, s.file]]) assert.equal(run(args).status, 2, args.join(' '));
  assert.equal(existsSync(s.page), false);
});
test('--check on an invalid document fails', () => {
  const s = scratch(null, light().replace('- Mode: light\n', ''));
  assert.equal(run([s.file, '--check']).status, 1);
});
test('a document with Windows line endings builds', () => {
  const s = scratch(null, light().replace(/\n/g, '\r\n'));
  assert.equal(run([s.file, '--no-draw-check']).status, 0);
});
test('--mode refuses a document of the other mode', () => {
  const s = scratch('as-built.light.md');
  const r = run([s.file, '--mode', 'full', '--no-draw-check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /expected a full document, this one is light/);
});

// The diagrams really draw (needs Chrome, Edge or Chromium; skipped without one)

const browser = findBrowser();
const drawOpts = { skip: browser ? false : 'no Chrome, Edge or Chromium found' };

test('every diagram in both fixtures draws', drawOpts, () => {
  for (const name of ['as-built.light.md', 'as-built.full.md']) {
    const s = scratch(name);
    const r = run([s.file]);
    assert.equal(r.status, 0, `${name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /every diagram drew/);
  }
});
test('the built page draws under its own security policy, and asks the network for nothing', drawOpts, async () => {
  const { createServer } = await import('node:http');
  let hits = 0;
  const server = createServer((req, res) => { hits++; res.end('x'); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    // Built past the checker on purpose: this is what the policy must stop if a check is ever missed.
    const s = scratch('as-built.light.md');
    const lib = readFileSync(here('../skills/as-built/vendor/mermaid.min.js'), 'utf8');
    const html = renderPage(light(), lib).replace('flowchart LR', `%%{init: {"themeCSS": ".node rect{fill:url(http://127.0.0.1:${port}/css)}"}}%%\nflowchart LR`);
    writeFileSync(s.page, html);
    const r = await drawCheck(s.page);
    assert.equal(r.checked, true);
    assert.equal(hits, 0, 'the page fetched from the network');
  } finally { server.close(); }
});
test('a diagram that can\'t be drawn fails the build, naming its line', drawOpts, () => {
  const md = light().replace('J->>Q: insert a request for the top cluster', 'J->>: ->> ((( broken');
  const s = scratch(null, md);
  const r = run([s.file]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, new RegExp(`line ${lineOf(md, 'sequenceDiagram') - 1}: diagram did not draw`));
});
test('drawCheck reports "not checked" when there is no browser, or one that can\'t be run', async () => {
  const s = scratch('as-built.light.md');
  assert.equal(run([s.file, '--no-draw-check']).status, 0);
  const none = await drawCheck(s.page, null);
  assert.equal(none.checked, false);
  assert.match(none.reason, /no Chrome, Edge or Chromium/);
  const broken = await drawCheck(s.page, join(s.dir, 'no-such-browser'), { waitMs: 3000 });
  assert.equal(broken.checked, false);
  assert.deepEqual(broken.failed, []);
});
test('with no browser the build still succeeds, and says the drawing was not checked', () => {
  const s = scratch('as-built.light.md');
  const r = spawnSync(process.execPath, [SCRIPT, s.file], { encoding: 'utf8', env: { ...process.env, PROVE_IT_BROWSER: 'none' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /drawing not checked/);
  assert.ok(existsSync(s.page));
});
