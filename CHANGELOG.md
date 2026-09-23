# Changelog

## 0.1.1 — unreleased

Fixes the skill-quality gaps the 0.1.0 acceptance run found. Fixes #8.

- `design-challenge` ends every turn with exactly one question, even when
  asked for all of them at once (B6).
- `design-challenge` reads every term back, numbered, and asks "Confirm these
  N terms, or correct any." before writing; the record holds exactly the
  confirmed list. Splits, merges and additions are proposed in the read-back,
  never made silently. A confirmation with conditions ("yes, but split…") or
  a waived read-back is not a confirmation. `amend` reads back added or
  changed terms the same way (B7).
- `grade` scores a fixed 18-criterion rubric, six per dimension, the same for
  every project; per-term checks are `n of m` coverage inside
  `design.terms-tested` and `design.gates-evidenced`. Caps are set by
  criterion id: `code.tests` unverified now caps at 49, and the 74 cap fires
  on fail or unverified for `design.signed`, `design.terms-tested`,
  `design.gates-evidenced`, `code.oob` and `ready.ai-bounded`, because a
  safeguard you can't show counts as missing. An app with no AI call passes
  `ready.ai-bounded` (D7).
- `grade` judges build, tests and lint by one verdict rule on the plain
  command: a pass needs exit 0 and no error reported by the tool itself (an
  `ERROR:` line from now-sdk, `npm ERR!` or `npm error`, a failed-test count above zero).
  Exit 0 with such an error is unverified, never a pass; a non-zero exit is a
  fail, except exit 127 (tool missing), which is unverified; no visible
  status is unverified. The build uses the `build` script if there is one,
  else `now-sdk build` (D8).
- `grade` rubric rows pass only with evidence of the kind each names (for
  example file:line lists for `design.drift-ruled` and `code.oob`, a cited
  non-admin check for `ready.real-user`); without it they are unverified.
  The secrets scan always runs the guard's patterns and `.prove-it/patterns`
  (ignoring case) over the tracked tree and history, plus gitleaks over
  history if installed; an invalid pattern or any grep error makes it
  unverified, never clean. It never prints matched text.
- `grade` never runs `now-sdk auth --list`; it asks for the install alias by
  name (D9).
- `grade` remediation proposes one story per failed or unverified criterion,
  at most 18, with per-term detail in the story body (D10).
- `handoff` with no argument reads only its listed inputs, and never
  `GRADE.md` or `BACKLOG.md` (E6).

## 0.1.0-rc.1 — 2026-09-23 (release candidate, private)

First version. Tagged `v0.1.0-rc.1`. Not yet public: publishing waits for
employer approval, and the skill-quality gaps in issue #8 are due before the
series records. Acceptance run: 21 pass, 0 fail, 6 unverified (the six need a
real app; see `tests/ACCEPTANCE.md`).

- Five skills: `consult`, `design-challenge` (with `amend`), `build-plan`,
  `grade` and `handoff` (with `plant`, `diagnose` and `verdict`).
- `skills/build-plan/file-plan.mjs`: validates a plan and files labels,
  milestones, epics and stories on GitHub through `gh`, idempotently by key,
  with `--check`, `--dry-run`, `--apply`, `--reopen` and `--backlog`; writes
  `BACKLOG.md` from the open issues.
- `hooks/pre-commit-guard.sh`: blocks files the allowlist doesn't admit and
  added lines that look like secrets; fails closed.
- Templates: `BRIEF.md`, `DESIGN.md`, `CLAUDE.md`, `gitignore.allowlist`,
  `RUNBOOK.md`, `HANDOFF.md`.
- Tests for the filer and the guard, a sample brief, and acceptance criteria
  for the skills (`tests/ACCEPTANCE.md`).
- `docs/SETUP-CHECKLIST.md`, this README, and CI running `npm test` on every
  push and pull request, on Node 22, 24 and 26.
- Requires Node ≥ 22; 20 reached end of life in April 2026.
- Guard installed in the kit's own repo.
- `handoff plant` writes the drill card even before the app is built, marking
  steps it can't make exact as VERIFY (found by the acceptance run, E3).
- A drill card whose "Planted by" is blank is a draft, not a drill: `plant`
  replaces it in place, and `verdict` lists it as never planted and ignores it.
- Acceptance run recorded in `tests/ACCEPTANCE.md`: 21 pass, 0 fail,
  6 unverified. The rows say "0.1.0 (unreleased)" because they were recorded
  before the release was named; they test exactly the content released as
  `0.1.0-rc.1`.
