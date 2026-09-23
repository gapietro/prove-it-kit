import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePlan } from '../skills/build-plan/file-plan.mjs';

const valid = () => JSON.parse(readFileSync(new URL('./fixtures/plan.valid.json', import.meta.url), 'utf8'));
const story = (plan, key) => plan.stories.find((s) => s.key === key);
const has = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected an error containing "${text}", got ${JSON.stringify(errors)}`);

test('a valid plan has no errors', () => {
  assert.deepEqual(validatePlan(valid()), []);
});
test('a story with neither a gate nor register is rejected', () => {
  const p = valid(); delete story(p, 'S1').gate;
  has(validatePlan(p), 'exactly one of a gate or register');
});
test('a story with both a gate and register is rejected', () => {
  const p = valid(); story(p, 'S1').register = true;
  has(validatePlan(p), 'exactly one of a gate or register');
});
test('an unknown gate is rejected', () => {
  const p = valid(); story(p, 'S1').gate = 'ship';
  has(validatePlan(p), 'unknown gate');
});
test('a register story with a milestone is rejected', () => {
  const p = valid(); story(p, 'S3').milestone = 'M1';
  has(validatePlan(p), 'register stories have no milestone');
});
test('a register story with a priority is rejected', () => {
  const p = valid(); story(p, 'S3').priority = 'p1';
  has(validatePlan(p), 'register stories have no priority');
});
test('missing doneWhen and honestLimit are rejected', () => {
  const p = valid(); delete story(p, 'S1').doneWhen; delete story(p, 'S1').honestLimit;
  const e = validatePlan(p); has(e, 'missing doneWhen'); has(e, 'missing honestLimit');
});
test('unknown epic, milestone and dependency are rejected', () => {
  const p = valid(); Object.assign(story(p, 'S2'), { epic: 'E9', milestone: 'M9', dependsOn: ['S9'] });
  const e = validatePlan(p); has(e, 'epic "E9"'); has(e, 'milestone "M9"'); has(e, 'unknown story "S9"');
});
test('a dependency cycle is rejected', () => {
  const p = valid(); story(p, 'S1').dependsOn = ['S2'];
  has(validatePlan(p), 'dependency cycle');
});
test('duplicate keys are rejected', () => {
  const p = valid(); story(p, 'S2').key = 'S1';
  has(validatePlan(p), 'duplicate key S1');
});
test('bad priority and size are rejected', () => {
  const p = valid(); Object.assign(story(p, 'S1'), { priority: 'urgent', size: 'xl' });
  const e = validatePlan(p); has(e, 'priority must be'); has(e, 'size must be');
});

import { createFiler, backlogMarkdown, LABELS } from '../skills/build-plan/file-plan.mjs';

// An in-memory stand-in for the gh CLI: the filer takes `run(args) -> stdout`.
function fakeGh() {
  const s = { labels: [], milestones: [], issues: [], writes: [] };
  const val = (args, flag) => args[args.indexOf(flag) + 1];
  const all = (args, flag) => args.flatMap((x, i) => (x === flag ? [args[i + 1]] : []));
  const shape = (i) => ({ number: i.number, title: i.title, body: i.body,
    labels: i.labels.map((name) => ({ name })), milestone: i.milestone ? { title: i.milestone } : null });
  const run = (args) => {
    const [a, b] = args;
    if (a === 'repo') return JSON.stringify({ nameWithOwner: 'me/app' });
    if (a === 'label' && b === 'list') return JSON.stringify(s.labels.map((name) => ({ name })));
    if (a === 'label' && b === 'create') { s.writes.push(args); s.labels.push(args[2]); return ''; }
    if (a === 'api' && !args.includes('-f')) return JSON.stringify(s.milestones.map((title) => ({ title })));
    if (a === 'api') { s.writes.push(args); s.milestones.push(args.find((x) => x.startsWith('title=')).slice(6)); return '{}'; }
    if (a === 'issue' && b === 'list') {
      const state = args.includes('--state') ? val(args, '--state') : 'open';
      return JSON.stringify(s.issues.filter((i) => state === 'all' || i.state === state).map(shape));
    }
    if (a === 'issue' && b === 'create') {
      s.writes.push(args);
      const number = s.issues.length + 1;
      s.issues.push({ number, state: 'open', title: val(args, '--title'), body: val(args, '--body'), labels: all(args, '--label'),
        milestone: args.includes('--milestone') ? val(args, '--milestone') : null });
      return `https://github.com/me/app/issues/${number}\n`;
    }
    if (a === 'issue' && b === 'edit') {
      s.writes.push(args);
      const i = s.issues.find((x) => x.number === Number(args[2]));
      if (args.includes('--title')) i.title = val(args, '--title');
      if (args.includes('--body')) i.body = val(args, '--body');
      for (const l of all(args, '--add-label')) if (!i.labels.includes(l)) i.labels.push(l);
      for (const l of all(args, '--remove-label')) i.labels = i.labels.filter((x) => x !== l);
      if (args.includes('--milestone')) i.milestone = val(args, '--milestone');
      if (args.includes('--remove-milestone')) i.milestone = null;
      return '';
    }
    if (a === 'issue' && b === 'view') {
      const i = s.issues.find((x) => x.number === Number(args[2]));
      return JSON.stringify({ labels: i.labels.map((name) => ({ name })) });
    }
    throw new Error(`fake gh: unhandled ${args.join(' ')}`);
  };
  const openIssues = () => JSON.parse(run(['issue', 'list', '--state', 'open', '--json', 'number,title,labels']));
  return { s, run, openIssues };
}

test('apply creates labels, milestones, the epic and the stories with the right labels', () => {
  const { s, run } = fakeGh();
  const { problems, numbers } = createFiler({ run }).apply(valid());
  assert.deepEqual(problems, []);
  for (const l of LABELS) assert.ok(s.labels.includes(l.name), `label ${l.name} created`);
  assert.deepEqual(s.milestones, ['S1 · Foundation', 'S2 · Core build']);
  assert.equal(s.issues.length, 4); // 1 epic + 3 stories
  const s1 = s.issues.find((i) => i.number === numbers.get('S1'));
  assert.deepEqual(s1.labels.sort(), ['gate:merge', 'p0', 'size:s']);
  assert.equal(s1.milestone, 'S1 · Foundation');
  const s3 = s.issues.find((i) => i.number === numbers.get('S3'));
  assert.deepEqual(s3.labels.sort(), ['register', 'size:s']);
  assert.equal(s3.milestone, null);
  assert.match(s3.body, /\*\*Blocks:\*\* nothing \(register\)/);
});

test('{{KEY}} references are replaced with issue numbers', () => {
  const { s, run } = fakeGh();
  const { numbers } = createFiler({ run }).apply(valid());
  for (const i of s.issues) assert.ok(!i.body.includes('{{'), `issue #${i.number} still has an unresolved reference`);
  const s2 = s.issues.find((i) => i.number === numbers.get('S2'));
  assert.ok(s2.body.includes(`#${numbers.get('S1')}`));
});

test('a second apply writes nothing', () => {
  const { s, run } = fakeGh();
  createFiler({ run }).apply(valid());
  const before = s.writes.length;
  createFiler({ run }).apply(valid());
  assert.equal(s.writes.length, before, `second run made ${s.writes.length - before} write(s)`);
  assert.equal(s.issues.length, 4);
});

test('adding a story files exactly one new issue', () => {
  const { s, run } = fakeGh();
  createFiler({ run }).apply(valid());
  const p = valid();
  p.stories.push({ key: 'S4', title: 'New story', epic: 'E1', milestone: 'M1', gate: 'merge', priority: 'p1',
    size: 's', dependsOn: [], doneWhen: 'Done.', honestLimit: 'Limited.' });
  createFiler({ run }).apply(p);
  assert.equal(s.issues.length, 5);
});

test('moving a story to another gate replaces its owned labels and milestone', () => {
  const { s, run } = fakeGh();
  const { numbers } = createFiler({ run }).apply(valid());
  const p = valid(); Object.assign(story(p, 'S1'), { gate: 'install', priority: 'p1', milestone: 'M2' });
  const { problems } = createFiler({ run }).apply(p);
  assert.deepEqual(problems, []);
  const s1 = s.issues.find((i) => i.number === numbers.get('S1'));
  assert.deepEqual(s1.labels.sort(), ['gate:install', 'p1', 'size:s']);
  assert.equal(s1.milestone, 'S2 · Core build');
});

test('moving a story to the register drops its gate, priority and milestone', () => {
  const { s, run } = fakeGh();
  const { numbers } = createFiler({ run }).apply(valid());
  const p = valid(); const s1 = story(p, 'S1');
  delete s1.gate; delete s1.priority; delete s1.milestone; s1.register = true;
  createFiler({ run }).apply(p);
  const got = s.issues.find((i) => i.number === numbers.get('S1'));
  assert.deepEqual(got.labels.sort(), ['register', 'size:s']);
  assert.equal(got.milestone, null);
});

test('labels a person added are left alone', () => {
  const { s, run } = fakeGh();
  const { numbers } = createFiler({ run }).apply(valid());
  s.issues.find((i) => i.number === numbers.get('S1')).labels.push('needs-design');
  createFiler({ run }).apply(valid());
  assert.ok(s.issues.find((i) => i.number === numbers.get('S1')).labels.includes('needs-design'));
});

test('titles with shell metacharacters are passed literally', () => {
  const { s, run } = fakeGh();
  const p = valid(); p.stories[0].title = 'Fix $(whoami) and "quotes"; rm -rf nothing';
  createFiler({ run }).apply(p);
  assert.ok(s.issues.some((i) => i.title === 'Fix $(whoami) and "quotes"; rm -rf nothing'));
});

test('read-back reports a missing label', () => {
  const { s, run } = fakeGh();
  const lossy = (args) => { const out = run(args); if (args[0] === 'issue' && args[1] === 'create') s.issues.at(-1).labels = []; return out; };
  const { problems } = createFiler({ run: lossy }).apply(valid());
  assert.ok(problems.some((p) => p.includes('missing labels')));
});

test('read-back reports a stale owned label', () => {
  const { s, run } = fakeGh();
  const sticky = (args) => { const out = run(args); if (args[0] === 'issue' && args[1] === 'create') s.issues.at(-1).labels.push('gate:publish'); return out; };
  const { problems } = createFiler({ run: sticky }).apply(valid());
  assert.ok(problems.some((p) => p.includes('stale labels: gate:publish')));
});

test('BACKLOG.md counts open issues only, skips epics, and lists the register', () => {
  const { s, run, openIssues } = fakeGh();
  const { numbers } = createFiler({ run }).apply(valid());
  let md = backlogMarkdown(openIssues(), new Date('2026-01-02T00:00:00Z'));
  assert.match(md, /\*\*Next gate:\*\* merge · \*\*Blockers:\*\* 1/);
  assert.match(md, /## Register \(blocks no gate\)/);
  assert.ok(!md.includes('Foundation\n'), 'epics are not listed as work');
  s.issues.find((i) => i.number === numbers.get('S1')).state = 'closed';
  md = backlogMarkdown(openIssues());
  assert.match(md, /\*\*Next gate:\*\* install · \*\*Blockers:\*\* 1/);
});

test('a remediation-only plan adds to the backlog instead of replacing it', () => {
  const { run, openIssues } = fakeGh();
  createFiler({ run }).apply(valid());
  const remediation = {
    milestones: [{ key: 'M1', title: 'S1 · Foundation' }],
    epics: [{ key: 'R', title: 'Grade remediation', body: 'From GRADE.md.' }],
    stories: [{ key: 'R1', title: 'Fix the cap', epic: 'R', milestone: 'M1', gate: 'merge', priority: 'p0',
      size: 's', dependsOn: [], doneWhen: 'Cap released.', honestLimit: 'One sitting.' }],
  };
  createFiler({ run }).apply(remediation);
  const md = backlogMarkdown(openIssues());
  assert.match(md, /Checks run on every push/);
  assert.match(md, /Fix the cap/);
  assert.match(md, /\*\*Blockers:\*\* 2/);
});

import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const CLI = fileURLToPath(new URL('../skills/build-plan/file-plan.mjs', import.meta.url));
const FIX = (f) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url));

test('--check accepts a valid plan', () => {
  const r = spawnSync(process.execPath, [CLI, FIX('plan.valid.json'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /plan OK: 2 milestones, 1 epics, 3 stories \(2 gated, 1 register\)/);
});
test('--check rejects an invalid plan with exit 1 and names the problem', () => {
  const r = spawnSync(process.execPath, [CLI, FIX('plan.invalid.json'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /exactly one of a gate or register/);
});
test('no mode prints usage and exits 2', () => {
  const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage/);
});
test('the CLI runs when invoked through a symlink', () => {
  const link = join(mkdtempSync(join(tmpdir(), 'prove-it-')), 'file-plan.mjs');
  symlinkSync(CLI, link);
  const r = spawnSync(process.execPath, [link, FIX('plan.invalid.json'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 1, 'through a symlink the CLI must still run and reject the invalid plan');
  assert.match(r.stderr, /exactly one of a gate or register/);
});
