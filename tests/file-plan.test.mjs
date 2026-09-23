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
