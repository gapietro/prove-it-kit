# prove-it kit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development in the same session) to implement this plan task-by-task.

**Goal:** Build the `prove-it` Claude Code plugin exactly as specified in `docs/plans/2026-09-23-prove-it-kit-design.md`.

**Architecture:** A single-repo plugin + marketplace. Five skills are prompt files (`skills/<name>/SKILL.md`). The two jobs that must be exact are small zero-dependency scripts with tests: `skills/build-plan/file-plan.mjs` (validates a plan and files it on GitHub via `gh`) and `hooks/pre-commit-guard.sh` (blocks non-allowlisted files and secret shapes). Templates fix the shape of every file the skills hand to each other.

**Verified before handoff (2026-09-23, after review fixes):** all code in Tasks 2–6 was extracted and run on Node 26: 27/27 filer tests and 12/12 guard tests pass; the sabotage runs fail as they should (guard: 8 of 12 fail; filer: 12 fail); the CLI runs through a symlink; the guard admits the kit's own docs, tests and source. Use `node --test tests/*.test.mjs` — a bare `tests/` directory argument fails on newer Node.

**Tech Stack:** Claude Code plugins (skills), Node ≥ 18 (`node:test`, `node:child_process`; no npm dependencies), POSIX `sh`, `git`, GitHub CLI `gh`.

**Read first:** the design doc (above), especially §4 (skills), §5 (exact parts) and §6 (VERIFY answers).

**Ground rules for the implementer**
- Work on a feature branch per task group; ship through PRs (`ship it` ritual). Never commit to `main`.
- **Clean-room:** don't open any private plugin's files. Write from the design doc only.
- **Never commit a literal secret shape**, including in tests and docs. Build test secrets at runtime with `printf` octal escapes (see Task 2). In prose, say "the FAKE_TOKEN test marker" and don't spell it out. (Once Task 11 installs the guard in this repo, it will enforce this.)
- **Never use the series' change risk brief.** The only test brief is `tests/fixtures/sample-brief.md` (Task 8).
- Stage files by explicit path, never `git add -A`.

---

### Task 1: Scaffold the plugin

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `CHANGELOG.md`, `README.md` (skeleton)

**Step 1: Write `.claude-plugin/plugin.json`**
```json
{
  "name": "prove-it",
  "description": "Build ServiceNow apps with AI, behind inspections: consult, design challenge, build plan, grade, handoff.",
  "version": "0.1.0",
  "author": { "name": "gapietro" },
  "repository": "https://github.com/gapietro/prove-it-kit",
  "keywords": ["servicenow", "now-sdk", "fluent", "process", "review", "skills"]
}
```

**Step 2: Write `.claude-plugin/marketplace.json`**
```json
{
  "name": "prove-it",
  "owner": { "name": "gapietro" },
  "metadata": { "description": "The prove-it kit", "version": "0.1.0" },
  "plugins": [
    {
      "name": "prove-it",
      "source": "./",
      "description": "Build ServiceNow apps with AI, behind inspections.",
      "version": "0.1.0"
    }
  ]
}
```

**Step 3: Write `package.json`** (no dependencies; scripts only)
```json
{
  "name": "prove-it-kit",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test tests/*.test.mjs && sh tests/guard.test.sh"
  }
}
```

**Step 4: Write `CHANGELOG.md`** with a `## 0.1.0 — unreleased` heading, and a README skeleton with the headings: *What it is · Install · The five commands · Templates · The guard · Answers for the series · Honest limits · Versions*. (Filled in Task 10.)

**Step 5: Validate the plugin structure**

Run: `claude plugin validate .`
Expected: validation passes (warnings about empty `skills/` are acceptable at this point). If the schema rejects a field, fix it to match the validator's message; don't guess.

**Step 6: Commit** — `git add .claude-plugin/plugin.json .claude-plugin/marketplace.json package.json CHANGELOG.md README.md` then `git commit -m "chore: scaffold the prove-it plugin"`.

---

### Task 2: Guard tests (write first)

**Files:**
- Create: `tests/guard.test.sh`, `tests/fixtures/always-pass-guard.sh`

**Step 1: Write `tests/fixtures/always-pass-guard.sh`** (used only for the sabotage run)
```sh
#!/bin/sh
exit 0
```

**Step 2: Write `tests/guard.test.sh`**
```sh
#!/bin/sh
# Tests for hooks/pre-commit-guard.sh.   Run: sh tests/guard.test.sh
# Sabotage check (must FAIL): GUARD=tests/fixtures/always-pass-guard.sh sh tests/guard.test.sh
# Every test secret is built at runtime with printf octal escapes, so this file
# never contains a literal secret shape (\075 is '=', \137 is '_', \072 is ':', \040 is a space).
set -u
KIT=$(cd "$(dirname "$0")/.." && pwd)
GUARD=${GUARD:-$KIT/hooks/pre-commit-guard.sh}
case "$GUARD" in /*) ;; *) GUARD="$KIT/$GUARD" ;; esac
pass=0; fail=0
ok()  { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
bad() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

new_repo() {
  R=$(mktemp -d)
  git -C "$R" init -q -b main
  git -C "$R" config user.email test@example.invalid
  git -C "$R" config user.name test
  git -C "$R" config commit.gpgsign false
  printf '/*\n!/.gitignore\n!/src/\n' > "$R/.gitignore"
  mkdir -p "$R/src"
  hooks=$(git -C "$R" rev-parse --git-path hooks)
  case "$hooks" in /*) ;; *) hooks="$R/$hooks" ;; esac
  cp "$GUARD" "$hooks/pre-commit" && chmod +x "$hooks/pre-commit"
}

# expect_block NAME PATH CONTENT [extra git-add flag]
expect_block() {
  new_repo
  printf '%s\n' "$3" > "$R/$2"
  git -C "$R" add ${4:-} -- .gitignore "$2" 2>/dev/null
  if git -C "$R" commit -q -m t > "$R.out" 2>&1; then
    bad "$1 (commit was allowed)"
  elif ! grep -qi 'revoke' "$R.out"; then
    bad "$1 (blocked, but no revoke-first message)"
  elif grep -qF -- "$3" "$R.out"; then
    bad "$1 (blocked, but the secret was printed)"
  else
    ok "$1"
  fi
}

# expect_pass NAME PATH CONTENT
expect_pass() {
  new_repo
  printf '%s\n' "$3" > "$R/$2"
  git -C "$R" add -- .gitignore "$2"
  if git -C "$R" commit -q -m t > "$R.out" 2>&1; then ok "$1"; else bad "$1 (blocked: $(head -2 "$R.out"))"; fi
}

expect_pass  "clean allowed file passes"        src/app.js 'export const x = 1;'
expect_pass  "ordinary word 'token' passes"     src/app.js 'const tokenBudget = 20; // token budget'
expect_block "planted test marker is blocked"   src/app.js "$(printf 'FAKE\137TOKEN\075do-not-use-0000')"
expect_block "GitHub token shape is blocked"    src/app.js "$(printf 'const t = "ghp\137ABCDEFGHIJKLMNOPQRSTUVWX0123";')"
expect_block "private key header is blocked"    src/key.txt "$(printf -- '-----BEGIN RSA PRIVATE\040KEY-----')"
expect_block "credentials in a URL are blocked" src/app.js "$(printf 'https://admin\072hunter22@example.invalid/x')"
expect_block "force-added outside allowlist"    notes.txt 'meeting notes' -f
expect_block "API key shape is blocked"         src/app.js "$(printf 'const k = "sk\055abcdefghijklmnopqrstuvwx1234";')"
expect_pass  "kebab-case names pass"            src/app.css '.x { mask-image-linear-gradient: none; } /* risk-assessment-service-module */'
expect_pass  "lowercase look-alikes pass"       src/app.js 'const s = "akiaabcdefghijklmnop";'

# Local patterns from .prove-it/patterns
new_repo
mkdir -p "$R/.prove-it"; printf '# comment\nmy-instance-name\n' > "$R/.prove-it/patterns"
printf 'see my-instance-name\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "local pattern is blocked (commit was allowed)"; else ok "local pattern is blocked"; fi

# An invalid local pattern must fail closed, not open
new_repo
mkdir -p "$R/.prove-it"; printf 'foo(\n' > "$R/.prove-it/patterns"
printf 'harmless\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "invalid local pattern fails closed (commit was allowed)"
elif grep -qi 'invalid pattern' "$R.out"; then ok "invalid local pattern fails closed"
else bad "invalid local pattern fails closed (blocked without explanation)"; fi

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
```

**Step 3: Run it to verify it fails**

Run: `sh tests/guard.test.sh`
Expected: FAIL — `cp` can't find `hooks/pre-commit-guard.sh`, so every case reports a failure; exit status non-zero.

**Step 4: Commit** — `git add tests/guard.test.sh tests/fixtures/always-pass-guard.sh` then `git commit -m "test: guard tests (failing)"`.

---

### Task 3: The guard

**Files:**
- Create: `hooks/pre-commit-guard.sh`

**Step 1: Write the guard**
```sh
#!/bin/sh
# prove-it pre-commit guard.
# Blocks (1) staged files the .gitignore allowlist doesn't admit (for example,
# force-added with `git add -f`) and (2) added lines that look like secrets.
# Fails closed: if a pattern is invalid, nothing is committed.
# Install:
#   cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"
#   chmod +x "$(git rev-parse --git-path hooks)/pre-commit"
set -u
blocked=0
tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT

# Built-in secret shapes, matched case-sensitively. Each is written so this
# file's own text can't match it.
cat > "$tmp/builtin" <<'PATTERNS'
-----BEGIN [A-Z ]*PRIVATE KEY-----
(ghp|gho|ghs|ghu|ghr|github_pat)_[A-Za-z0-9_]{20,}
(^|[^A-Za-z0-9_-])sk-(proj-)?[A-Za-z0-9_]{20,}
AKIA[0-9A-Z]{16}
xox[abprs]-[A-Za-z0-9-]{10,}
https?://[^/[:space:]:@]+:[^/[:space:]@]+@
FAKE_TOKEN[=]do-not-use-
PATTERNS

# Local patterns (your hostname, your email), matched case-insensitively:
# .prove-it/patterns, never committed.
root=$(git rev-parse --show-toplevel)
: > "$tmp/local"
if [ -f "$root/.prove-it/patterns" ]; then
  grep -v -e '^#' -e '^[[:space:]]*$' "$root/.prove-it/patterns" > "$tmp/local"
fi

# Fail closed: an invalid pattern would make grep error and scan nothing.
check_patterns() {
  [ -s "$1" ] || return 0
  printf 'x\n' | grep -E -f "$1" > /dev/null 2>&1
  if [ $? -gt 1 ]; then
    printf 'BLOCKED: %s contains an invalid pattern, so nothing can be scanned. Fix it and commit again.\n' "$2" >&2
    exit 1
  fi
}
check_patterns "$tmp/builtin" "the guard's built-in list"
check_patterns "$tmp/local" ".prove-it/patterns"

git diff --cached --name-only --diff-filter=ACMR > "$tmp/files"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if git check-ignore -q --no-index -- "$f"; then
    printf 'BLOCKED: %s is not admitted by the .gitignore allowlist (force-added?).\n' "$f" >&2
    blocked=1
  fi
  git diff --cached -U0 --no-color -- "$f" | grep '^+' | grep -v '^+++' > "$tmp/added"
  n=$(grep -c -E -f "$tmp/builtin" "$tmp/added")
  if [ -s "$tmp/local" ]; then
    n=$((n + $(grep -c -i -E -f "$tmp/local" "$tmp/added")))
  fi
  if [ "$n" -gt 0 ]; then
    printf 'BLOCKED: %s has %s added line(s) that look like a secret.\n' "$f" "$n" >&2
    blocked=1
  fi
done < "$tmp/files"

if [ "$blocked" -ne 0 ]; then
  cat >&2 <<'MSG'

If any of this is a real credential: REVOKE or ROTATE it first.
Removing it from this commit does not un-leak it if it was ever pushed, pasted or copied.
Then unstage it (git restore --staged <file>), remove the secret, and commit again.
MSG
  exit 1
fi
exit 0
```

**Step 2: Run the tests**

Run: `sh tests/guard.test.sh`
Expected: `12 passed, 0 failed`, exit 0.

**Step 3: Sabotage-test the tests (principle 4)**

Run: `GUARD=tests/fixtures/always-pass-guard.sh sh tests/guard.test.sh; echo "exit=$?"`
Expected: every `expect_block` case, the local-pattern case and the invalid-pattern case FAIL (8 of 12); `exit=1`. If this run passes, the tests prove nothing — stop and fix them.

**Step 4: Self-safety check**

Run: `sh -c 'mkdir -p /tmp/selfcheck && cd /tmp/selfcheck && rm -rf .git && git init -q -b main && git config user.email t@e.invalid && git config user.name t && printf "/*\n!/hooks/\n!/tests/\n!/.gitignore\n" > .gitignore && mkdir -p hooks tests && cp '"$PWD"'/hooks/pre-commit-guard.sh hooks/ && cp '"$PWD"'/tests/guard.test.sh tests/ && cp hooks/pre-commit-guard.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && git add -- .gitignore hooks/pre-commit-guard.sh tests/guard.test.sh && git commit -q -m t && echo SELF-SAFE'`
Expected: `SELF-SAFE` — the guard can commit itself and its tests.

**Step 5: Commit** — `git add hooks/pre-commit-guard.sh` then `git commit -m "feat: pre-commit guard (allowlist + secret shapes, revoke-first message)"`.

---

### Task 4: `file-plan.mjs` validation (test first)

**Files:**
- Create: `tests/file-plan.test.mjs`, `tests/fixtures/plan.valid.json`
- Create (next step): `skills/build-plan/file-plan.mjs`

**Step 1: Write the fixture `tests/fixtures/plan.valid.json`**
```json
{
  "milestones": [
    { "key": "M1", "title": "S1 · Foundation", "description": "Gate boundary: merge" },
    { "key": "M2", "title": "S2 · Core build", "description": "Gate boundary: install" }
  ],
  "epics": [
    { "key": "E1", "title": "Foundation", "body": "Repo, checks, test harness." }
  ],
  "stories": [
    { "key": "S1", "title": "Checks run on every push", "epic": "E1", "milestone": "M1", "gate": "merge",
      "priority": "p0", "size": "s", "dependsOn": [], "doneWhen": "A push runs the tests and reports green.",
      "honestLimit": "Proves the tests run, not that they are good." },
    { "key": "S2", "title": "Install from source", "epic": "E1", "milestone": "M2", "gate": "install",
      "priority": "p1", "size": "m", "dependsOn": ["S1"], "doneWhen": "now-sdk install succeeds on the PDI.",
      "honestLimit": "Proves one instance, not a fresh one.", "body": "Follows {{S1}}." },
    { "key": "S3", "title": "Consider dark mode", "epic": "E1", "register": true, "size": "s",
      "doneWhen": "Decided.", "honestLimit": "Blocks nothing." }
  ]
}
```

**Step 2: Write the validation tests in `tests/file-plan.test.mjs`**
```js
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
```

**Step 3: Run to verify it fails**

Run: `node --test tests/*.test.mjs`
Expected: FAIL — cannot find module `skills/build-plan/file-plan.mjs`.

**Step 4: Write the validation part of `skills/build-plan/file-plan.mjs`**
```js
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
```

**Step 5: Run the tests**

Run: `node --test tests/*.test.mjs`
Expected: all 11 validation tests PASS.

**Step 6: Commit** — `git add skills/build-plan/file-plan.mjs tests/file-plan.test.mjs tests/fixtures/plan.valid.json` then `git commit -m "feat: plan validation (every story names a gate or register)"`.

---

### Task 5: `file-plan.mjs` filing, idempotency and BACKLOG.md (test first)

**Files:**
- Modify: `tests/file-plan.test.mjs` (append), `skills/build-plan/file-plan.mjs` (append)

**Step 1: Append the fake `gh` and filing tests to `tests/file-plan.test.mjs`**
```js
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
```

**Step 2: Run to verify the new tests fail**

Run: `node --test tests/*.test.mjs`
Expected: FAIL — `createFiler`, `backlogMarkdown` and `LABELS` are not exported.

**Step 3: Append the filer to `skills/build-plan/file-plan.mjs`**
```js
export const LABELS = [
  ...GATES.map((g) => ({ name: `gate:${g}`, color: '0E8A16', description: `Blocks the ${g} gate` })),
  { name: 'register', color: 'BFD4F2', description: 'Blocks no gate: watch list' },
  { name: 'p0', color: 'B60205', description: 'Blocks the current gate' },
  { name: 'p1', color: 'D93F0B', description: 'Blocks the next gate' },
  { name: 'p2', color: 'FBCA04', description: 'Further out' },
  ...SIZES.map((z) => ({ name: `size:${z}`, color: 'C5DEF5', description: `Size ${z.toUpperCase()}` })),
  { name: 'epic', color: '5319E7', description: 'Groups stories' },
];

// Labels this tool owns. On re-runs, owned labels that no longer apply are removed;
// any other labels a person added are left alone.
export const isManaged = (l) => /^gate:/.test(l) || l === 'register' || /^p[0-2]$/.test(l) || /^size:/.test(l);

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

export const storyLabels = (s) => (s.register ? ['register', `size:${s.size}`] : [`gate:${s.gate}`, s.priority, `size:${s.size}`]);

export const resolveRefs = (text, numbers) =>
  text.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (m, k) => (numbers.has(k) ? `#${numbers.get(k)}` : m));

export function createFiler({ run, log = () => {}, verify = true }) {
  const json = (args) => JSON.parse(run(args) || 'null');
  return {
    apply(plan) {
      const repo = json(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;

      const haveLabels = new Set((json(['label', 'list', '--limit', '500', '--json', 'name']) ?? []).map((l) => l.name));
      for (const l of LABELS) if (!haveLabels.has(l.name)) run(['label', 'create', l.name, '--color', l.color, '--description', l.description]);

      const haveMs = new Set((json(['api', `repos/${repo}/milestones?state=all&per_page=100`]) ?? []).map((m) => m.title));
      for (const m of plan.milestones ?? []) {
        if (!haveMs.has(m.title)) run(['api', `repos/${repo}/milestones`, '-f', `title=${m.title}`, '-f', `description=${m.description ?? ''}`]);
      }
      const msTitle = new Map((plan.milestones ?? []).map((m) => [m.key, m.title]));

      const current = new Map();
      for (const i of json(['issue', 'list', '--state', 'all', '--limit', '1000', '--json', 'number,title,body,labels,milestone']) ?? []) {
        const m = MARKER_RE.exec(i.body ?? '');
        if (m) current.set(m[1], { number: i.number, title: i.title, body: i.body,
          labels: new Set((i.labels ?? []).map((l) => l.name)), milestone: i.milestone?.title ?? null });
      }
      const numbers = new Map([...current].map(([k, v]) => [k, v.number]));

      const items = [
        ...(plan.epics ?? []).map((e) => ({ key: e.key, title: e.title, body: epicBody(e, plan.stories), labels: ['epic'], milestone: null })),
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
          if (c.title !== it.title) args.push('--title', it.title);
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
          const got = (json(['issue', 'view', String(numbers.get(it.key)), '--json', 'labels'])?.labels ?? []).map((l) => l.name);
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
```

**Step 4: Run the tests**

Run: `node --test tests/*.test.mjs`
Expected: all tests PASS (11 validation + 12 filing).

**Step 5: Commit** — `git add skills/build-plan/file-plan.mjs tests/file-plan.test.mjs` then `git commit -m "feat: file plans on GitHub idempotently; write BACKLOG.md"`.

---

### Task 6: `file-plan.mjs` command line (test first)

**Files:** Modify `tests/file-plan.test.mjs`, `skills/build-plan/file-plan.mjs`

**Step 1: Append CLI tests**
```js
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CLI = new URL('../skills/build-plan/file-plan.mjs', import.meta.url).pathname;
const FIX = (f) => new URL(`./fixtures/${f}`, import.meta.url).pathname;

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
```
Create `tests/fixtures/plan.invalid.json`: a copy of `plan.valid.json` with `"gate": "merge"` removed from S1.

**Step 2: Run to verify they fail** — `node --test tests/*.test.mjs` → FAIL (no CLI yet).

**Step 3: Append the CLI to `skills/build-plan/file-plan.mjs`**
```js
function dryRunner(real) {
  let n = 0;
  const isWrite = (a) => (a[0] === 'label' && a[1] === 'create') || (a[0] === 'issue' && (a[1] === 'create' || a[1] === 'edit'))
    || (a[0] === 'api' && a.includes('-f'));
  return (args) => {
    if (!isWrite(args)) return real(args);
    console.log(`[dry-run] gh ${args.map((x) => (/[\s"'$]/.test(x) ? JSON.stringify(x) : x)).join(' ')}`.slice(0, 400));
    return args[0] === 'issue' && args[1] === 'create' ? `https://github.com/dry/run/issues/${900000 + ++n}` : '';
  };
}

export async function main(argv) {
  const [file, mode, ...rest] = argv;
  if (!file || !['--check', '--dry-run', '--apply'].includes(mode)) {
    console.error('usage: file-plan.mjs <plan.json> --check | --dry-run | --apply [--backlog <path>]');
    return 2;
  }
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  const errors = validatePlan(plan);
  if (errors.length) {
    console.error(`plan rejected (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    return 1;
  }
  const gated = plan.stories.filter((s) => !s.register).length;
  console.log(`plan OK: ${plan.milestones?.length ?? 0} milestones, ${plan.epics?.length ?? 0} epics, ${plan.stories.length} stories (${gated} gated, ${plan.stories.length - gated} register)`);
  if (mode === '--check') return 0;

  const real = (args) => execFileSync('gh', args, { encoding: 'utf8' });
  const apply = mode === '--apply';
  const { problems } = createFiler({ run: apply ? real : dryRunner(real), log: (m) => console.log(m), verify: apply }).apply(plan);
  if (problems.length) { console.error(`read-back failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`); return 1; }
  if (apply) {
    const open = JSON.parse(real(['issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,labels']));
    const i = rest.indexOf('--backlog');
    const path = i >= 0 ? rest[i + 1] : 'BACKLOG.md';
    writeFileSync(path, backlogMarkdown(open));
    console.log(`wrote ${path} from ${open.length} open issues`);
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
```

**Step 4: Run the tests** — `node --test tests/*.test.mjs` → all PASS.

**Step 5: Sabotage-test the filer tests (principle 4).** Temporarily change the first line of `validatePlan`'s body to `return [];`, run `node --test tests/*.test.mjs`, and confirm the rejection tests FAIL. Then restore with `git checkout -- skills/build-plan/file-plan.mjs` and confirm all tests pass again. Record the result in `tests/ACCEPTANCE.md` (Task 8).

**Step 6: Commit** — `git add skills/build-plan/file-plan.mjs tests/file-plan.test.mjs tests/fixtures/plan.invalid.json` then `git commit -m "feat: file-plan CLI (--check, --dry-run, --apply)"`.

---

### Task 7: Templates

**Files:** Create `templates/gitignore.allowlist`, `templates/CLAUDE.md`, `templates/BRIEF.md`, `templates/DESIGN.md`, `templates/RUNBOOK.md`, `templates/HANDOFF.md`

**Step 1: `templates/gitignore.allowlist`**
```gitignore
# Allowlist .gitignore (prove-it). Nothing is tracked unless admitted below.
# Why: a blocklist has to predict every shape a leak can take; an allowlist
# only has to know what this repo is for.
#
# To admit a new file or folder, add ONE line, on purpose, when you first need it:
#   !/path/to/file.md      a single file at the root
#   !/folder/              a folder (and everything inside it)
/*
!/.gitignore
!/README.md
!/src/
!/package.json
!/package-lock.json
!/now.config.json
!/tsconfig.json
```
(Adjust nothing else; projects add lines as they go. Verify the now-sdk project file names against a real `now-sdk init` in Task 9's dry run.)

**Step 2: `templates/CLAUDE.md`** — the starter session protocol. It MUST contain these sections, in plain English, with these exact rules:
- **Session open:** "Read BACKLOG.md and SESSION-NOTE.md. Re-check the live state of any blocker they mention (never from memory). Tell me the top three items by gate distance."
- **Session close:** "Update SESSION-NOTE.md: what's proven, what's open, the exact next step, the top three next items." Commit it as the last commit on the open story branch; between stories, as the first commit of the next story's branch; never alone to main.
- **Ship ritual:** `ship it` = push the branch, open the PR, run `/code-review`, fix findings once, merge on green, delete the branch. No step-by-step questions.
- **Backlog discipline:** every issue names a gate (`merge, install, demo, handoff, publish`) or is `register`; priority is gate distance only (p0 = current gate, p1 = next, p2 = further); nothing is picked "because it's quick"; the next gate is the earliest gate with open issues; blockers-to-gate is the number of open issues on it; flat for a week → stop filing, start closing; audits and grades run at milestones only.
- **Contract:** nothing new is built without a signed design record; a new ask re-enters at the design step (`/prove-it:design-challenge amend`).
- **Brakes:** error brake (three failed attempts on one approach → stop, root-cause diagnosis, options); two-strike tripwire (second time a friction appears: name it, then fix now / file against a gate / register); pre-build restatement (≤ 5 bullets, confirmed, before building anything new).
- **Learning checkpoints:** at decisions that shape the design, state decision · why · principle · recommendation + trade-off; on major ones ask me to answer first.
- **Honesty:** say what's real, staged, not built; never claim a check that wasn't run.

**Step 3: `templates/BRIEF.md`** — headings: Problem · Users · Capabilities requested (numbered) · Out of scope · Success looks like · Size. One-line guidance under each heading; no example content.

**Step 4: `templates/DESIGN.md`** — the handoff format the whole chain depends on. Exact numbered sections:
1. Summary (what and why, three lines)
2. Context (links to CONSULT.md by reference, never pasted)
3. Terms — numbered `C1`, `C2`, … each a single testable rule
4. Data and ownership (tables, which code owns writes to each, roles)
5. Failure modes and how each is handled
6. Security and access
7. Gates — one row per gate touched: gate · pass criteria (numbers where possible)
8. Rejected alternatives — option · why rejected
9. Approval — table: Name · Role · Date · Signature (left blank; a person fills it)
10. Drift log — table: Date · Term · Ruling · Signed by

**Step 5: `templates/RUNBOOK.md`** — headings: Install · Configure (properties, roles) · Verify (a smoke test run as an ordinary user) · Traps · Recovery · **Symptom → cause index** (table: Symptom · Where to look (platform screens, the app's own lists and logs only) · Likely cause · Fix).

**Step 6: `templates/HANDOFF.md`** — headings: Verdict (READY / NOT READY, dated) · Check 1: rationale coverage (n of n, gaps) · Check 2: runbook (link) · Check 3: drill (what was planted, first attempt, runbook fix, second attempt, restore) · Open items (item · blocks · owner by role) · What PS receives.

**Step 7: Commit** — stage each template by path; `git commit -m "feat: templates (allowlist, session protocol, brief, design record, runbook, handoff)"`.

---

### Task 8: Sample brief and acceptance criteria

**Files:** Create `tests/fixtures/sample-brief.md`, `tests/ACCEPTANCE.md`

**Step 1: `tests/fixtures/sample-brief.md`** — a one-page brief in the `templates/BRIEF.md` shape for a **knowledge-gap finder**: find clusters of resolved incidents with no knowledge article; draft an article with AI; route to a person to approve; admin controls (budget, rate limit, off switch); measure approval rate. Out of scope: publishing without approval, real data. ~15 stories. (Never the change risk brief.)

**Step 2: `tests/ACCEPTANCE.md`** — one section per skill with numbered pass criteria and a results table (Date · Kit version · Criterion · Pass/Fail · Evidence). Criteria:
- **consult:** A1 restates constraints in ≤ 5 bullets and stops for confirmation before writing; A2 every capability gets plain code / Now Assist skill / agent with a reason; A3 an agent is proposed only with a stated reason orchestration can't be predetermined; A4 cost is raised with a bound; A5 readiness per requirement; A6 writes `CONSULT.md` in the workspace root and no code.
- **design-challenge:** B1 challenges at least failure modes, security and cost; B2 output follows `templates/DESIGN.md` sections 1–10; B3 terms are numbered and testable; B4 approval row left blank; B5 `amend` adds a term or drift row and marks the record for re-signing.
- **build-plan:** C1 refuses an unsigned design; C2 shows the plan and waits for approval; C3 every story names a gate or `register` (enforced by `file-plan.mjs --check`); C4 `--dry-run` prints calls and files nothing; C5 re-run files nothing new.
- **grade:** D1 runs build and tests before judging; D2 asks before installing to an instance; D3 anything not run is reported unverified; D4 a release blocker caps the score; D5 writes a forecast; D6 remediation is proposed as a `plan.json` and filed only via `file-plan.mjs`.
- **handoff:** E1 check 1 lists every shipped artifact against a reason; E2 runbook index uses only platform screens and the app's own lists/logs; E3 `plant` writes the drill card outside the repo and stops; E4 `diagnose` refuses when a drill card or design record is in its context; E5 `verdict` never softens (NOT READY stays NOT READY with named items).
- **scripts:** F1 guard tests pass; F2 guard sabotage run fails; F3 filer tests pass; F4 filer sabotage run fails.

**Step 3: Commit** — stage both files; `git commit -m "test: sample brief and acceptance criteria"`.

---

### Task 9: The five skills

**Files:** Create `skills/consult/SKILL.md`, `skills/design-challenge/SKILL.md`, `skills/build-plan/SKILL.md`, `skills/grade/SKILL.md`, `skills/handoff/SKILL.md`

Each `SKILL.md` starts with front matter:
```yaml
---
name: <consult | design-challenge | build-plan | grade | handoff>
description: <one sentence: when to use it, what it reads, what it writes>
---
```
Then these sections, in order: **Purpose** · **Input** (arguments and defaults) · **Steps** (numbered) · **Output** (file, location, template) · **Rules you can't break** · **Hand-off** (what the next stage reads). Implement the behaviour in design §4 exactly; the acceptance criteria in `tests/ACCEPTANCE.md` are the checklist. Specifics per skill:

- **consult:** Step 1 is the ≤ 5-bullet restatement + an explicit stop ("Reply 'confirmed' or correct me"). Modality rule text: *plain code by default; a Now Assist skill only where language is the problem; an agent only where the steps can't be decided in advance — and say why*. ServiceNow checks: which OOB tables are read vs written (don't modify OOB workflows), scoped tables, roles, who owns each write, now-sdk/Fluent feasibility (mark anything unverified as VERIFY), cost of any AI call and its bound. Output sections: Constraints · Capabilities (table: # · capability · modality · reason) · Data and ownership · Cost · Readiness (ready / conditional / not ready per requirement) · Foundation work list · Open decisions.
- **design-challenge:** the human designs; the skill asks one challenge at a time (failure modes → security/access → cost → boundaries), records answers into `templates/DESIGN.md`'s sections; writes terms as testable single rules; leaves Approval blank and says "A person signs this; I don't." `amend` mode: reads the existing record, adds `C<n+1>` or a drift-log row, clears the approval date and signature for re-signing.
- **build-plan:** refuses unless the Approval table has a name, date and signature; drafts `plan.json` (schema in design §5) with milestones at gate boundaries; runs `node <kit>/skills/build-plan/file-plan.mjs plan.json --check`, shows the summary and a readable preview, **stops for approval**; on approval runs `--apply` (offer `--dry-run` first). The skill resolves the script path relative to its own directory (`${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs`; VERIFY the variable name against the Claude Code plugin docs at build time, fall back to locating the plugin directory).
- **grade:** asks the milestone if not given; runs the project's build and tests; **asks before `now-sdk install --auth <alias>`** (never `--alias` on install); scores design / code quality / production readiness (0–100 arithmetic, shown); release blockers cap the band and are listed; anything not run → "unverified"; forecast section; remediation as a proposed `plan.json` filed via `file-plan.mjs` on approval; writes `GRADE.md` at the repo root.
- **handoff:** no argument → checks 1 and 2 (writes `RUNBOOK.md` from the template and a `HANDOFF.md` draft); `plant` → proposes one realistic failure, writes `../drill-card.md` (outside the repo; the allowlist also ignores `drill-card*.md`), tells the user to open a **fresh session** for diagnosis, stops; `diagnose` → first checks its context: if it can see a drill card or design records, it refuses and explains; otherwise reads only `RUNBOOK.md` and the symptom the user gives, and diagnoses; `verdict` → writes `HANDOFF.md` from the template, READY or NOT READY, never softened.

**Step:** after writing all five, run `claude plugin validate .` → passes. Commit each skill separately (`feat: consult skill`, …).

---

### Task 10: Setup checklist, README, CI

**Files:** Create `docs/SETUP-CHECKLIST.md`, `.github/workflows/test.yml`; fill `README.md`; update `CHANGELOG.md`

**Step 1: `docs/SETUP-CHECKLIST.md`** — checkboxes: Node ≥ 18 · now-sdk installed and `now-sdk auth` done (never on camera/screen) · `gh auth login` done · Claude Code installed · kit installed (`/plugin marketplace add <owner>/prove-it-kit`, `/plugin install prove-it@prove-it`) · a PDI awake · a workspace folder with `brief/` · record your versions (Claude Code, model, Node, now-sdk, gh, gitleaks, prove-it) in the table provided.

**Step 2: `.github/workflows/test.yml`**
```yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: git config --global user.email ci@example.invalid && git config --global user.name ci
      - run: npm test
```

**Step 3: `README.md`** — fill every heading from Task 1. The **"Answers for the series"** section is design §6's table, verbatim, updated with anything that changed during the build. **Honest limits:** grade and handoff are only fully proven on a real app; the guard is a seatbelt, not a vault (`--no-verify` skips it; keep a history scan before publishing). Don't spell out the FAKE_TOKEN marker.

**Step 4: Run** `npm test` → all pass; `claude plugin validate .` → passes.

**Step 5: Commit** — stage by path; `git commit -m "docs: setup checklist, README, CI"`.

---

### Task 11: Dogfood the guard, dry-run the chain, record acceptance

**Step 1: Install the guard in this repo**
```sh
cp hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"
chmod +x "$(git rev-parse --git-path hooks)/pre-commit"
```
Then prove the whole repo is self-safe: re-stage every tracked file through the guard with
`git ls-files -z | xargs -0 touch && git add -u && git commit --allow-empty -m "chore: guard self-check"` (the guard checks added lines, so also run the pattern list directly: extract the heredoc between `PATTERNS` markers in `hooks/pre-commit-guard.sh` to a temp file and run `git ls-files | xargs grep -n -i -E -f <that file>` — it must print nothing). Docs must describe secret shapes in words ("the FAKE_TOKEN test marker", "a URL with a user and password before the @"), never spell them out.

**Step 2: Install the kit locally and dry-run the chain on the sample brief**, in a scratch workspace outside this repo (never in the series folders):
```sh
mkdir -p /tmp/prove-it-dryrun/brief && cp tests/fixtures/sample-brief.md /tmp/prove-it-dryrun/brief/
```
In Claude Code: `/plugin marketplace add <path to this repo>` then `/plugin install prove-it@prove-it`; run consult → design-challenge (sign it yourself as the test author) → build-plan with `--dry-run` only (no real issues), then grade and handoff where they can run without an app (expect "unverified" and a NOT READY verdict — that is a pass for D3/E5). Score every criterion in `tests/ACCEPTANCE.md` with evidence.

**Step 3: Fix failures once**, re-run the failing criteria, record final results with the date and kit version.

**Step 4: Commit** — `git add tests/ACCEPTANCE.md CHANGELOG.md` and any skill fixes; `git commit -m "test: acceptance run 0.1.0"`.

---

### Task 12: Release candidate

- `CHANGELOG.md` → `## 0.1.0 — <date>`; tag with `claude plugin tag .` (VERIFY behaviour) or `git tag v0.1.0`.
- **Do not make the repo public.** Publishing waits for employer approval (series gate 1). Add a `LICENSE` at that point, once the license is approved.
- Update the series production repo: replace the VERIFY flags the kit now answers (bible §5, EP0–EP8), through a PR there.
