# Acceptance criteria

Each skill is scored against these criteria in a dry run of the whole chain
against `tests/fixtures/sample-brief.md`, in a scratch workspace. Record every
run below with its date and kit version. A criterion that was not run is not
recorded as a pass.

## consult

- **A1** Restates constraints in ≤ 5 bullets and stops for confirmation before writing.
- **A2** Every capability gets plain code / Now Assist skill / agent, with a reason.
- **A3** An agent is proposed only with a stated reason orchestration can't be predetermined.
- **A4** Cost is raised with a bound.
- **A5** Readiness per requirement.
- **A6** Writes `CONSULT.md` in the workspace root and no code.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## design-challenge

- **B1** Challenges at least failure modes, security and cost.
- **B2** Output follows `templates/DESIGN.md` sections 1–10.
- **B3** Terms are numbered and testable.
- **B4** Approval row left blank.
- **B5** `amend` adds a term or drift row and marks the record for re-signing.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## build-plan

- **C1** Refuses an unsigned design.
- **C2** Shows the plan and waits for approval.
- **C3** Every story names a gate or `register` (enforced by `file-plan.mjs --check`).
- **C4** `--dry-run` prints calls and files nothing.
- **C5** Re-run files nothing new.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## grade

- **D1** Runs build and tests before judging.
- **D2** Asks before installing to an instance.
- **D3** Anything not run is reported unverified.
- **D4** A release blocker caps the score.
- **D5** Writes a forecast.
- **D6** Remediation is proposed as a `plan.json` and filed only via `file-plan.mjs`.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## handoff

- **E1** Check 1 lists every shipped artifact against a reason.
- **E2** Runbook index uses only platform screens and the app's own lists/logs.
- **E3** `plant` writes the drill card outside the repo and stops.
- **E4** `diagnose` refuses when a drill card or design record is in its context.
- **E5** `verdict` never softens (NOT READY stays NOT READY with named items).

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## scripts

- **F1** Guard tests pass.
- **F2** Guard sabotage run fails.
- **F3** Filer tests pass.
- **F4** Filer sabotage run fails.

For F2 and F4, Pass means the sabotaged suite failed, as it must.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0-dev | F1 | Pass | `sh tests/guard.test.sh`: 19 passed, 0 failed. |
| 2026-09-23 | 0.1.0-dev | F2 | Pass | `GUARD=tests/fixtures/always-pass-guard.sh sh tests/guard.test.sh`: 5 passed, 14 failed, exit 1. |
| 2026-09-23 | 0.1.0-dev | F3 | Pass | `node --test tests/*.test.mjs` on Node v26.5.0: 38 tests, 38 pass, 0 fail. |
| 2026-09-23 | 0.1.0-dev | F4 | Pass | `validatePlan` made to start with `return [];`: 38 tests, 24 pass, 14 fail. Restored with `git checkout -- skills/build-plan/file-plan.mjs`: 38 pass, 0 fail. |
