# Acceptance criteria

Each skill is scored against these criteria in a dry run of the whole chain
against `tests/fixtures/sample-brief.md`, in a scratch workspace. Record every
run below with its date and kit version. A criterion that was not run is not
recorded as a pass.

**Honest limit:** the sample-brief dry run has no real app. Criteria that can't
be run without one (D1, D4, D5, D6, E1, E2) are recorded as unverified, never
pass; they are only proven on a real app. Criteria that can be run on the dry
run (D2 asks before installing, D3 reports unverified, E3 plant, E4 diagnose
refuses and proceeds with only the runbook, E5 NOT READY names the item) are
recorded as pass or fail from what actually happened.

## consult

- **A1** Restates constraints in ≤ 5 bullets and stops for confirmation before writing.
- **A2** Every capability gets plain code / Now Assist skill / agent, with a reason.
- **A3** An agent is proposed only with a stated reason orchestration can't be predetermined.
- **A4** Cost is raised with a bound.
- **A5** Readiness per requirement, on the scale ready / conditional / not ready.
- **A6** Writes `CONSULT.md` in the workspace root and no code.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## design-challenge

- **B1** Challenges at least failure modes, security, cost and boundaries.
- **B2** Output follows `templates/DESIGN.md` sections 1–10.
- **B3** Terms are numbered and testable.
- **B4** Approval row left blank.
- **B5** `amend` adds a drift row with Signed by blank for every term added or changed, which marks the record unsigned.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|

## build-plan

Numbered P1–P5 so they don't collide with design-record terms (C1, C2, …).

- **P1** Refuses (a) a record with a blank Approval row and (b) a record with a complete Approval row but one unsigned drift row; accepts a fully signed record.
- **P2** Shows the plan and waits for approval.
- **P3** Every story names a gate or `register` (enforced by `file-plan.mjs --check`).
- **P4** `--dry-run` prints calls and files nothing.
- **P5** Re-run files nothing new.

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
- **E4** `diagnose` refuses when a drill card or design record is in its context, and proceeds when its context is only `RUNBOOK.md` plus the symptom.
- **E5** `verdict` never softens: given a failed check, the verdict is NOT READY and names that item.

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
| 2026-09-23 | 0.1.0 (unreleased) | F1 | Pass | `sh tests/guard.test.sh`: 19 passed, 0 failed. |
| 2026-09-23 | 0.1.0 (unreleased) | F2 | Pass | `GUARD=tests/fixtures/always-pass-guard.sh sh tests/guard.test.sh`: 5 passed, 14 failed, exit 1. |
| 2026-09-23 | 0.1.0 (unreleased) | F3 | Pass | `node --test tests/*.test.mjs` on Node v26.5.0: 38 tests, 38 pass, 0 fail. |
| 2026-09-23 | 0.1.0 (unreleased) | F4 | Pass | `validatePlan` made to start with `return [];`: 38 tests, 24 pass, 14 fail. Restored with `git checkout -- skills/build-plan/file-plan.mjs`: 38 pass, 0 fail. |
