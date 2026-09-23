# Changelog

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
