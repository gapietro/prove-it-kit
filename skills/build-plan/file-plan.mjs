#!/usr/bin/env node
// prove-it build-plan filer. Validates plan.json, then files labels,
// milestones, epics and stories on GitHub through the gh CLI. Safe to re-run:
// every issue carries a hidden key marker, so re-runs update instead of
// duplicating. gh is always called with argument arrays, never a shell string.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GATES = ['merge', 'install', 'demo', 'handoff', 'publish'];
const PRIORITIES = ['p0', 'p1', 'p2'];
const SIZES = ['s', 'm', 'l'];
// Keys go into the hidden issue marker and {{KEY}} references, so they are limited to these characters.
const KEY_RE = /^[A-Za-z0-9_.-]+$/;

export function validatePlan(plan) {
  const errors = [];
  const milestones = new Map((plan.milestones ?? []).map((m) => [m.key, m]));
  const epics = new Map((plan.epics ?? []).map((e) => [e.key, e]));
  const stories = plan.stories ?? [];
  const storyKeys = new Set(stories.map((s) => s.key));
  if (!stories.length) errors.push('plan has no stories');

  const msTitles = new Set();
  for (const m of plan.milestones ?? []) {
    if (msTitles.has(m.title)) errors.push(`duplicate milestone title "${m.title}"`);
    msTitles.add(m.title);
  }

  const seen = new Set();
  for (const item of [...(plan.milestones ?? []), ...(plan.epics ?? []), ...stories]) {
    if (!item.key) { errors.push(`item without a key: ${JSON.stringify(item).slice(0, 60)}`); continue; }
    if (!KEY_RE.test(item.key)) errors.push(`key "${item.key}" may use only letters, digits, _ . -`);
    if (seen.has(item.key)) errors.push(`duplicate key ${item.key}`);
    seen.add(item.key);
    if (!item.title) errors.push(`${item.key}: missing title`);
  }

  for (const s of stories) {
    const k = s.key;
    const gated = s.gate !== undefined;
    const register = s.register === true;
    if (gated === register) errors.push(`${k}: must name exactly one of a gate or register`);
    if (gated && !GATES.includes(s.gate)) errors.push(`${k}: unknown gate "${s.gate}"`);
    if (gated && !milestones.has(s.milestone)) errors.push(`${k}: unknown or missing milestone "${s.milestone}"`);
    if (gated && !PRIORITIES.includes(s.priority)) errors.push(`${k}: priority must be one of ${PRIORITIES.join(', ')}`);
    if (register && s.milestone !== undefined) errors.push(`${k}: register stories have no milestone`);
    if (register && s.priority !== undefined) errors.push(`${k}: register stories have no priority (they block no gate)`);
    if (!epics.has(s.epic)) errors.push(`${k}: unknown or missing epic "${s.epic}"`);
    if (!SIZES.includes(s.size)) errors.push(`${k}: size must be one of ${SIZES.join(', ')}`);
    if (!s.doneWhen) errors.push(`${k}: missing doneWhen`);
    if (!s.honestLimit) errors.push(`${k}: missing honestLimit`);
    for (const d of s.dependsOn ?? []) if (!storyKeys.has(d)) errors.push(`${k}: depends on unknown story "${d}"`);
  }

  const cycle = findCycle(stories);
  if (cycle) errors.push(`dependency cycle: ${cycle.join(' -> ')}`);
  return errors;
}

function findCycle(stories) {
  const deps = new Map(stories.map((s) => [s.key, s.dependsOn ?? []]));
  const state = new Map(); // 1 = visiting, 2 = done
  const path = [];
  const visit = (k) => {
    if (state.get(k) === 2) return null;
    if (state.get(k) === 1) return [...path.slice(path.indexOf(k)), k];
    state.set(k, 1); path.push(k);
    for (const d of deps.get(k) ?? []) {
      if (!deps.has(d)) continue;
      const c = visit(d);
      if (c) return c;
    }
    path.pop(); state.set(k, 2);
    return null;
  };
  for (const k of deps.keys()) { const c = visit(k); if (c) return c; }
  return null;
}

export const LABELS = [
  ...GATES.map((g) => ({ name: `gate:${g}`, color: '0E8A16', description: `Blocks the ${g} gate` })),
  { name: 'register', color: 'BFD4F2', description: 'Blocks no gate: watch list' },
  { name: 'p0', color: 'B60205', description: 'Blocks the next gate' },
  { name: 'p1', color: 'D93F0B', description: 'Blocks the gate after the next one' },
  { name: 'p2', color: 'FBCA04', description: 'Further out' },
  ...SIZES.map((z) => ({ name: `size:${z}`, color: 'C5DEF5', description: `Size ${z.toUpperCase()}` })),
  { name: 'epic', color: '5319E7', description: 'Groups stories' },
];

// Labels this tool owns. On re-runs, owned labels that no longer apply are removed;
// any other labels a person added are left alone.
export const isManaged = (l) => /^gate:/.test(l) || l === 'register' || /^p[0-2]$/.test(l) || /^size:/.test(l);

// Keys are repo-wide: a key's marker ties it to one issue for the life of the repo, across every plan filed there.
const marker = (key) => `<!-- prove-it:key=${key} -->`;
const MARKER_RE = /<!-- prove-it:key=([A-Za-z0-9_.-]+) -->/;
const ref = (key) => `{{${key}}}`;

export function storyBody(s) {
  return [
    marker(s.key),
    `**Epic:** ${ref(s.epic)}`,
    `**Blocks:** ${s.register ? 'nothing (register)' : `${s.gate} gate`}`,
    `**Depends on:** ${(s.dependsOn ?? []).length ? s.dependsOn.map(ref).join(', ') : 'none'}`,
    '', s.body ?? '', '',
    `**Done when:** ${s.doneWhen}`, '',
    `**Honest limit:** ${s.honestLimit}`,
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function epicBody(e, stories) {
  const mine = stories.filter((s) => s.epic === e.key);
  return [marker(e.key), e.body ?? '', '', '**Stories:**', ...mine.map((s) => `- [ ] ${ref(s.key)}`)]
    .join('\n').trim() + '\n';
}

// An epic that already exists keeps its body, so ticked boxes and stories from
// earlier plans survive. Only this plan's stories it doesn't reference yet
// (as {{KEY}} or as the resolved #N) are appended; existing lines are never rewritten.
export function extendEpicBody(body, epicKey, stories, numbers) {
  const text = body ?? '';
  const listed = (k) => text.includes(ref(k)) || (numbers.has(k) && new RegExp(`#${numbers.get(k)}(?!\\d)`).test(text));
  const add = stories.filter((s) => s.epic === epicKey && !listed(s.key)).map((s) => `- [ ] ${ref(s.key)}`);
  return add.length ? `${text.replace(/\s+$/, '')}\n${add.join('\n')}\n` : text;
}

export const storyLabels = (s) => (s.register ? ['register', `size:${s.size}`] : [`gate:${s.gate}`, s.priority, `size:${s.size}`]);

export const resolveRefs = (text, numbers) =>
  text.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (m, k) => (numbers.has(k) ? `#${numbers.get(k)}` : m));

export const ISSUE_LIMIT = 5000;

// gh issue list silently stops at --limit. A full page means the listing may be
// truncated, and filing against a partial listing would create duplicates.
export function listIssues(run, state, fields) {
  const list = JSON.parse(run(['issue', 'list', '--state', state, '--limit', String(ISSUE_LIMIT), '--json', fields]) || '[]');
  if (list.length >= ISSUE_LIMIT) {
    throw new Error(`more than ${ISSUE_LIMIT} issues: re-run with a narrower repo or raise the limit — refusing to risk duplicates`);
  }
  return list;
}

export function createFiler({ run, log = () => {}, verify = true }) {
  const json = (args) => JSON.parse(run(args) || 'null');
  return {
    apply(plan) {
      const repo = json(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;
      // List issues before any write, so a refusal leaves the repo untouched.
      const existing = listIssues(run, 'all', 'number,title,body,labels,milestone');

      // GitHub label names are case-insensitive (P0 and p0 are one label), so every
      // label name read back from GitHub is lowercased before comparing.
      // An owned label whose description has drifted (e.g. an older kit's wording) is
      // edited to match; other labels and colours are left alone.
      const haveLabels = new Map((json(['label', 'list', '--limit', '500', '--json', 'name,description']) ?? []).map((l) => [l.name.toLowerCase(), l]));
      for (const l of LABELS) {
        const have = haveLabels.get(l.name.toLowerCase());
        if (!have) run(['label', 'create', l.name, '--color', l.color, '--description', l.description]);
        else if (isManaged(l.name) && (have.description ?? '') !== l.description) run(['label', 'edit', have.name, '--description', l.description]);
      }

      // --paginate reads every page; --jq prints one title per line.
      const msList = String(run(['api', '--paginate', `repos/${repo}/milestones?state=all&per_page=100`, '--jq', '.[].title']) ?? '');
      const haveMs = new Set(msList.split('\n').filter(Boolean));
      for (const m of plan.milestones ?? []) {
        if (haveMs.has(m.title)) continue;
        run(['api', `repos/${repo}/milestones`, '-f', `title=${m.title}`, '-f', `description=${m.description ?? ''}`]);
        haveMs.add(m.title);
      }
      const msTitle = new Map((plan.milestones ?? []).map((m) => [m.key, m.title]));

      const current = new Map();
      for (const i of existing) {
        const m = MARKER_RE.exec(i.body ?? '');
        if (m) current.set(m[1], { number: i.number, title: i.title, body: i.body,
          labels: new Set((i.labels ?? []).map((l) => l.name.toLowerCase())), milestone: i.milestone?.title ?? null });
      }
      const numbers = new Map([...current].map(([k, v]) => [k, v.number]));

      const items = [
        ...(plan.epics ?? []).map((e) => ({ key: e.key, title: e.title, labels: ['epic'], milestone: null,
          body: current.has(e.key) ? extendEpicBody(current.get(e.key).body, e.key, plan.stories, numbers) : epicBody(e, plan.stories) })),
        ...plan.stories.map((s) => ({ key: s.key, title: s.title, body: storyBody(s), labels: storyLabels(s),
          milestone: s.register ? null : msTitle.get(s.milestone) })),
      ];

      // Pass 1: create new issues; bring changed ones in line (title, body,
      // owned labels, milestone). `written` tracks each issue's body now.
      const written = new Map();
      for (const it of items) {
        const body = resolveRefs(it.body, numbers);
        const c = current.get(it.key);
        if (c) {
          const args = ['issue', 'edit', String(c.number)];
          if (c.title !== it.title) {
            log(`warning: key ${it.key} already belongs to #${c.number} "${c.title}"; it will be updated to "${it.title}". Keys must be unique for the life of the repo.`);
            args.push('--title', it.title);
          }
          if (c.body !== body) args.push('--body', body);
          for (const l of it.labels) if (!c.labels.has(l)) args.push('--add-label', l);
          for (const l of c.labels) if (isManaged(l) && !it.labels.includes(l)) args.push('--remove-label', l);
          if (it.milestone && c.milestone !== it.milestone) args.push('--milestone', it.milestone);
          if (!it.milestone && c.milestone) args.push('--remove-milestone');
          if (args.length > 3) { run(args); log(`updated ${it.key} #${c.number}`); } else log(`unchanged ${it.key} #${c.number}`);
        } else {
          const args = ['issue', 'create', '--title', it.title, '--body', body];
          for (const l of it.labels) args.push('--label', l);
          if (it.milestone) args.push('--milestone', it.milestone);
          const n = Number(String(run(args)).trim().split('/').pop());
          if (!Number.isInteger(n)) throw new Error(`could not read the issue number for ${it.key}`);
          numbers.set(it.key, n); log(`created ${it.key} #${n}`);
        }
        written.set(it.key, body);
      }

      // Pass 2: resolve references to issues created in pass 1.
      for (const it of items) {
        const body = resolveRefs(it.body, numbers);
        if (body !== written.get(it.key)) run(['issue', 'edit', String(numbers.get(it.key)), '--body', body]);
      }

      // Pass 3: read every issue back; its owned labels must match exactly.
      const problems = [];
      if (verify) {
        for (const it of items) {
          const got = (json(['issue', 'view', String(numbers.get(it.key)), '--json', 'labels'])?.labels ?? []).map((l) => l.name.toLowerCase());
          const missing = it.labels.filter((l) => !got.includes(l));
          const extra = got.filter((l) => isManaged(l) && !it.labels.includes(l));
          if (missing.length) problems.push(`${it.key} #${numbers.get(it.key)} is missing labels: ${missing.join(', ')}`);
          if (extra.length) problems.push(`${it.key} #${numbers.get(it.key)} has stale labels: ${extra.join(', ')}`);
        }
      }
      return { numbers, problems };
    },
  };
}

// BACKLOG.md is built from the OPEN issues on GitHub, not from one plan file,
// so closed work drops out and a remediation-only plan doesn't erase the rest.
export function backlogMarkdown(openIssues, now = new Date()) {
  const items = openIssues
    .map((i) => {
      const names = (i.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
      return {
        number: i.number, title: i.title, epic: names.includes('epic'),
        gate: (names.find((n) => n.startsWith('gate:')) ?? '').slice(5) || null,
        register: names.includes('register'),
        priority: names.find((n) => /^p[0-2]$/.test(n)) ?? null,
        size: (names.find((n) => n.startsWith('size:')) ?? '').slice(5) || '?',
      };
    })
    .filter((i) => !i.epic);
  const nextGate = GATES.find((g) => items.some((i) => i.gate === g));
  const line = (i) => `- #${i.number} ${i.title}${i.priority ? ` · ${i.priority}` : ''} · size ${i.size}`;
  const byRank = (a, b) => (a.priority ?? 'p9').localeCompare(b.priority ?? 'p9') || a.number - b.number;
  const out = ['# Backlog', '',
    `*Written by prove-it build-plan on ${now.toISOString().slice(0, 10)} from the open issues on GitHub. Ranked by gate distance; the next gate is the earliest gate with open issues. The board is the live copy.*`, ''];
  out.push(nextGate
    ? `**Next gate:** ${nextGate} · **Blockers:** ${items.filter((i) => i.gate === nextGate).length}`
    : '**Next gate:** none (no gated issues open)', '');
  for (const g of GATES) {
    const mine = items.filter((i) => i.gate === g).sort(byRank);
    if (mine.length) out.push(`## ${g}`, '', ...mine.map(line), '');
  }
  const reg = items.filter((i) => i.register).sort(byRank);
  if (reg.length) out.push('## Register (blocks no gate)', '', ...reg.map(line), '');
  const loose = items.filter((i) => !i.gate && !i.register);
  if (loose.length) out.push('## Needs a gate or register', '', ...loose.map(line), '');
  return out.join('\n');
}

export function dryRunner(real) {
  let n = 0;
  const isWrite = (a) => (a[0] === 'label' && (a[1] === 'create' || a[1] === 'edit')) || (a[0] === 'issue' && (a[1] === 'create' || a[1] === 'edit'))
    || (a[0] === 'api' && a.includes('-f'));
  return (args) => {
    if (!isWrite(args)) return real(args);
    console.log(`[dry-run] gh ${args.map((x) => (/[\s"'$]/.test(x) ? JSON.stringify(x) : x)).join(' ')}`.slice(0, 400));
    return args[0] === 'issue' && args[1] === 'create' ? `https://github.com/dry/run/issues/${900000 + ++n}` : '';
  };
}

export async function main(argv) {
  const [file, mode, ...rest] = argv;
  const usage = () => { console.error('usage: file-plan.mjs <plan.json> --check | --dry-run | --apply [--backlog <path>]'); return 2; };
  if (!file || !['--check', '--dry-run', '--apply'].includes(mode)) return usage();
  let backlogPath = 'BACKLOG.md';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--backlog' && rest[i + 1] && !rest[i + 1].startsWith('--')) { backlogPath = rest[++i]; continue; }
    return usage();
  }
  let plan;
  try {
    plan = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`plan rejected: ${err.message}`);
    return 1;
  }
  if (plan === null || typeof plan !== 'object' || !Array.isArray(plan.stories)) {
    console.error('plan rejected: "stories" must be an array');
    return 1;
  }
  const errors = validatePlan(plan);
  if (errors.length) {
    console.error(`plan rejected (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    return 1;
  }
  const gated = plan.stories.filter((s) => !s.register).length;
  console.log(`plan OK: ${plan.milestones?.length ?? 0} milestones, ${plan.epics?.length ?? 0} epics, ${plan.stories.length} stories (${gated} gated, ${plan.stories.length - gated} register)`);
  if (mode === '--check') return 0;

  const real = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const apply = mode === '--apply';
  const { problems } = createFiler({ run: apply ? real : dryRunner(real), log: (m) => console.log(m), verify: apply }).apply(plan);
  if (problems.length) { console.error(`read-back failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`); return 1; }
  if (apply) {
    const open = listIssues(real, 'open', 'number,title,labels');
    writeFileSync(backlogPath, backlogMarkdown(open));
    console.log(`wrote ${backlogPath} from ${open.length} open issues`);
  }
  return 0;
}

// Run only when invoked directly. Compare real paths: Node resolves symlinks in
// import.meta.url but not in argv[1], so a plain comparison would silently skip
// main() when the kit is reached through a symlink.
function invokedDirectly() {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}
if (process.argv[1] && invokedDirectly()) process.exitCode = await main(process.argv.slice(2));
