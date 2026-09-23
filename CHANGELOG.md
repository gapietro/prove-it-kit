# Changelog

## 0.1.0 — unreleased

First version.

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
  push and pull request.
