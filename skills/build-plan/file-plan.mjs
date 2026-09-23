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

export function validatePlan(plan) {
  const errors = [];
  const milestones = new Map((plan.milestones ?? []).map((m) => [m.key, m]));
  const epics = new Map((plan.epics ?? []).map((e) => [e.key, e]));
  const stories = plan.stories ?? [];
  const storyKeys = new Set(stories.map((s) => s.key));
  if (!stories.length) errors.push('plan has no stories');

  const seen = new Set();
  for (const item of [...(plan.milestones ?? []), ...(plan.epics ?? []), ...stories]) {
    if (!item.key) { errors.push(`item without a key: ${JSON.stringify(item).slice(0, 60)}`); continue; }
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
