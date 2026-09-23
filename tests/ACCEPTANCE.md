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

## Results summary

**Acceptance run 2026-09-23, kit 0.1.0 (unreleased), sample brief:** 27 criteria (A–E):
**21 pass, 0 fail, 6 unverified** (D1, D4, D5, D6, E1, E2, as the honest limit requires).
One criterion failed first and passed after one fix: E3 (fix commit `fix: handoff — E3`).
A code review then found that an early, never-planted card blocked `verdict` forever. After the fix
`fix: handoff — unplanted cards are drafts, not drills`, E3 (replace) and E5 (both variants) were re-run and pass.
F1–F4 were recorded earlier (below).

How it was run: headless `claude -p` 2.1.280 with `--plugin-dir <kit>`,
`--setting-sources project`, `--strict-mcp-config`, auto-memory off, a narrow
`--allowedTools` list per step, and `--resume` for multi-turn skills. It ran in a
scratch workspace outside this repo, with a throwaway private GitHub repo for
build-plan. `now-sdk install` and `now-sdk auth` were never on the allowed list.
From build-plan onward, runs from `app/` could not write to `..` until
`--add-dir <workspace>` was added (a setup fix, not a skill fault; build-plan put
`plan.json` in a temp folder, which the skill allows). The raw outputs,
transcripts and artifacts are in `acceptance/raw/` in that scratch workspace, not
in this repo.

## consult

- **A1** Restates constraints in ≤ 5 bullets and stops for confirmation before writing.
- **A2** Every capability gets plain code / Now Assist skill / agent, with a reason.
- **A3** An agent is proposed only with a stated reason orchestration can't be predetermined.
- **A4** Cost is raised with a bound.
- **A5** Readiness per requirement, on the scale ready / conditional / not ready.
- **A6** Writes `CONSULT.md` in the workspace root and no code.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | A1 | Pass | Restated the brief in 5 bullets plus 4 clarifying questions, ended "Reply 'confirmed' or correct me." and stopped. Write was allowed, but the only tool calls were `ls brief/` and a Read of the brief; no CONSULT.md. `01-consult-t1.json`, `.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | A2 | Pass | The Capabilities table has 7 rows for 7 capabilities: 1, 2, 4, 5, 6 and 7 plain code, 3 a Now Assist skill, each with a reason. `CONSULT.md`, `02-consult-t2.json` |
| 2026-09-23 | 0.1.0 (unreleased) | A3 | Pass | No agent proposed. Capability 4 (the agent bait) is plain code: "An agent needs steps that can't be fixed in advance, and these steps can be" (ranked list, threshold, skip drafted, top N within limits). Its unnamed "extra context" lookups would be unbounded (finding F2). It would be not ready as an agent. `CONSULT.md` |
| 2026-09-23 | 0.1.0 (unreleased) | A4 | Pass | Cost table: the draft skill call has an off switch before every call, 10/hour, 100 drafts a month, 20 incidents per prompt and 1 retry, all labelled estimates. Unbounded agent lookups are finding F2, and the untestable budget unit is F3 (VERIFY). `CONSULT.md` §4 |
| 2026-09-23 | 0.1.0 (unreleased) | A5 | Pass | Readiness table: 10 requirements, each ready or conditional with a named condition. It says not ready only for capability 4 as an agent. No other words used. `CONSULT.md` §5 |
| 2026-09-23 | 0.1.0 (unreleased) | A6 | Pass | The only Write in the session was `<workspace>/CONSULT.md`, with sections 1–7. No code, Fluent or scripts. `02-consult-t2.transcript.jsonl` |

## design-challenge

- **B1** Challenges at least failure modes, security, cost and boundaries.
- **B2** Output follows `templates/DESIGN.md` sections 1–10.
- **B3** Terms are numbered and testable.
- **B4** Approval row left blank.
- **B5** `amend` adds a drift row with Signed by blank for every term added or changed, which marks the record unsigned.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | B1 | Pass | Asked one topic per turn over 25 turns: failure modes (AI call, retry, idle reviewer, clustering run, duplicates, outcome), security (roles, data sent to the model, masking, scope, cross-scope reads), cost (unit, counts, per-call estimate vs input cap, bounds, concurrent calls at a cap) and boundaries (article check, similarity key, capability 4, approval guarantee, demo data). `12-dc-t3` … `36-dc-t27.json` |
| 2026-09-23 | 0.1.0 (unreleased) | B2 | Pass | `docs/DESIGN-KnowledgeGapFinder.md` has §1–§10 in template order with the template's headings; nothing added or dropped. `DESIGN-KnowledgeGapFinder.unsigned.md`, `37-dc-t28.json` |
| 2026-09-23 | 0.1.0 (unreleased) | B3 | Pass | 96 terms, C1–C96, each a single checkable rule (for example "C50: A prompt contains at most 20 incidents."). The 5 unanswered points are written OPEN (C10, C25, C28, C79, §4 `blocked` rows), not filled in. `DESIGN-KnowledgeGapFinder.unsigned.md` |
| 2026-09-23 | 0.1.0 (unreleased) | B4 | Pass | §9 left as the template's one blank row, §10 empty; "A person signs this; I don't." The tester signed §9 by hand afterwards. `DESIGN-KnowledgeGapFinder.unsigned.md`, `.signed.md` |
| 2026-09-23 | 0.1.0 (unreleased) | B5 | Pass | `amend` changed C56 in place (rate limit 10 → 5 per rolling 60 minutes) and added one §10 row with Signed by blank; §9 byte-identical. "The record is unsigned until a person signs the drift row." The tester signed it by hand. `41-amend-t2.json`, diff of `.signed.md` vs `.amended.md` |

## build-plan

Numbered P1–P5 so they don't collide with design-record terms (C1, C2, …).

- **P1** Refuses (a) a record with a blank Approval row and (b) a record with a complete Approval row but one unsigned drift row; accepts a fully signed record.
- **P2** Shows the plan and waits for approval.
- **P3** Every story names a gate or `register` (enforced by `file-plan.mjs --check`).
- **P4** `--dry-run` prints calls and files nothing.
- **P5** Re-run files nothing new.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | P1 | Pass | (a) blank Approval row: refused, "in §9 Approval, the only row has Name, Role, Date and Signature all empty" (`50-p1a.json`). (b) signed §9 plus an unsigned drift row: refused, "§10 Drift log, row 1 (C56): Signed by is empty" (`51-p1b.json`). Neither drafted or ran anything. (c) fully signed: proceeded (`52-bp-t1.json`) |
| 2026-09-23 | 0.1.0 (unreleased) | P2 | Pass | Showed `plan OK: 4 milestones, 6 epics, 34 stories (31 gated, 3 register)` and the preview table, then "Reply 'approve' to file this" and stopped. On approve it asked "Dry run first (recommended), or apply now?" `52-bp-t1.json`, `53-bp-t2.json` |
| 2026-09-23 | 0.1.0 (unreleased) | P3 | Pass | `file-plan.mjs plan.json --check` → `plan OK …`, exit 0. On GitHub: 40 issues (6 epics, 34 stories), every story labelled `gate:*` or `register`, none both. `56-p3-check.txt`, `56-p3-labels.json` |
| 2026-09-23 | 0.1.0 (unreleased) | P4 | Pass | Dry run printed 71 writes (13 labels, 4 milestones, 40 issues, 14 body edits). Afterwards: `gh issue list` → 0 issues, 0 milestones, no kit labels. `54-bp-t3-dryrun.json`, `.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | P5 | Pass | The same `--apply` run again: 40 × `unchanged`, no created or updated lines; still 40 issues and 4 milestones. The skill's own Bash calls held no direct `gh issue create`, `gh label` or milestone POST. `57-p5-reapply.txt`, `55-bp-t4-apply.transcript.jsonl` |

## grade

- **D1** Runs build and tests before judging.
- **D2** Asks before installing to an instance.
- **D3** Anything not run is reported unverified.
- **D4** A release blocker caps the score.
- **D5** Writes a forecast.
- **D6** Remediation is proposed as a `plan.json` and filed only via `file-plan.mjs`.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | D1 | Unverified | No app, so nothing real to build or test (honest limit). Behaviour seen: it ran `now-sdk build` before scoring (`ERROR: Could not find package.json`, recorded as `code.build` fail) and recorded "tests: unverified (no test script)". `61-grade-t2.json`, `GRADE.md` |
| 2026-09-23 | 0.1.0 (unreleased) | D2 | Pass | Before any install it asked "Install to `<alias>` with `now-sdk install --auth <alias>`?" and said a yes must name the alias. Tester answered no. No install call in the transcript; install recorded "unverified (not installed)". It also tried `now-sdk auth --list`, which the allowed list blocked, so no hosts were exposed. `61-grade-t2.json`, `62-grade-t3.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | D3 | Pass | GRADE.md §2 Unverified lists tests (no test script), install (answered no), the merge-gate unit tests, `code.oob` ("an empty repo is not evidence") and the read-only table owners, each with a reason and scored 0. `GRADE.md` |
| 2026-09-23 | 0.1.0 (unreleased) | D4 | Unverified | No real app (honest limit). Caps were listed (49 for `code.build`, 74 for term tests, the AI bounds and the merge criteria) and applied as min(4, 49) = 4. The computed score was already below every cap, so no cap was binding. `GRADE.md` §4 |
| 2026-09-23 | 0.1.0 (unreleased) | D5 | Unverified | No real app (honest limit). A forecast was written with its arithmetic: 23 after the 7 stories, 32 if the 14 merge terms are built; cap 49 released, 74 left. `GRADE.md` §5 |
| 2026-09-23 | 0.1.0 (unreleased) | D6 | Unverified | No real app (honest limit). Remediation was proposed as `../plan-grade.json` (1 epic `grade.merge`, 7 stories) and passed `--check`. The tester declined, so nothing was filed (still 40 issues), and filing through the filer was never exercised. The skill proposed 7 stories rather than one per failed criterion (~200), and said so. `62-grade-t3.json`, `63-grade-t4.json` |

## handoff

- **E1** Check 1 lists every shipped artifact against a reason.
- **E2** Runbook index uses only platform screens and the app's own lists/logs.
- **E3** `plant` writes the drill card outside the repo and stops.
- **E4** `diagnose` refuses when a drill card or design record is in its context, and proceeds when its context is only `RUNBOOK.md` plus the symptom.
- **E5** `verdict` never softens: given a failed check, the verdict is NOT READY and names that item.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | E1 | Unverified | No Fluent records (honest limit). Check 1 was reported as "0 of 0, not passing"; the draft lists the records the design expects. `70-handoff-draft.json`, `HANDOFF.draft.md` |
| 2026-09-23 | 0.1.0 (unreleased) | E2 | Unverified | No app screens to confirm (honest limit). As written, every Where-to-look cell names a platform list (`sys_properties.list`, `syslog.list`, `sysauto_script.list` VERIFY, …) or the app's own lists. Grep for DESIGN, term numbers, `src/` and URLs found nothing. `RUNBOOK.md` |
| 2026-09-23 | 0.1.0 (unreleased) | E3 | Fail | `plant` wrote no drill card: "There's nothing on the test instance to plant a failure on yet". It also argued a card would force NOT READY. It changed nothing (repo status identical, no instance tools) and stopped, but the criterion needs the card. The skill states no such precondition. `71-plant.json` |
| 2026-09-23 | 0.1.0 (unreleased) | E3 | Pass | Re-run after the fix (plant step 2: "Write the card even if the app isn't built or installed yet: mark any step you can't make exact as VERIFY"). Wrote `../drill-card.md` in the workspace (clustering job made inactive; blank Planted by, Planted on and Restored on) and stopped. Repo status identical, nothing changed on any instance. `72-plant-rerun.json`, `drill-card.md` |
| 2026-09-23 | 0.1.0 (unreleased) | E4 | Pass | Negative: `diagnose` resumed in the plant session refused: "I ran `plant` here: I wrote the drill card … and read the design record" (`73-e4neg-diagnose.json`). A new session that only read `../drill-card.md`, then ran `diagnose`, also refused: "Earlier in this session I read and summarised the drill card" (`77-e4neg2-readcard.json`, `78-e4neg2-diagnose.json`). Positive: a new invocation from `app/` with the symptom only. Tool calls: `git rev-parse`, Read `RUNBOOK.md`, `ls ../drill-notes-*.md`, Write `../drill-notes-1.md`, and no read of a drill card, design record or CONSULT.md. It matched the row "Clusters never refresh, and no 'last run failed'", which is the planted cause. `74-e4pos-diagnose.transcript.jsonl`, `75-…` |
| 2026-09-23 | 0.1.0 (unreleased) | E5 | Pass | `verdict` with the card unrestored: "**NOT READY**, 2026-09-23", naming check 3 ("the drill card's 'Restored on' line is blank") along with checks 1 and 2. `76-verdict.json`, `HANDOFF.final.md` |
| 2026-09-23 | 0.1.0 (unreleased) | E3 | Pass | Re-run after the fix `fix: handoff — unplanted cards are drafts, not drills`. The workspace held one unplanted `../drill-card.md` (blank Planted by). `plant` Grep'd only its "Planted by" line, replaced the card in place (no `drill-card-2.md`) and said so: "The old card's 'Planted by' line was blank, so it was never planted. I replaced it in place". `82-plant-replace.json`, `.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | E5 | Pass | After the same fix, variant (a): an unplanted `drill-card.md`, a planted and restored `drill-card-2.md`, and a notes file with a passing attempt. Check 3 "passes on the record", and card 1 is "Never planted, ignored; it neither passes nor blocks this check". The verdict is NOT READY only because of checks 1 and 2 (no `src/`, runbook VERIFYs). `80-e5a-verdict.json`, `e5a-HANDOFF.md` |
| 2026-09-23 | 0.1.0 (unreleased) | E5 | Pass | Same fix, variant (b): as (a), but card 2's "Restored on" is blank. NOT READY, and check 3 fails naming it: "drill card 2 was planted … but the card's 'Restored on' line is blank"; card 1 is still ignored. `81-e5b-verdict.json`, `e5b-HANDOFF.md` |

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
| 2026-09-23 | 0.1.0 (unreleased) | F3 | Pass | Rerun after label-description edits were added: `node --test tests/*.test.mjs` on Node v26.5.0: 40 tests, 40 pass, 0 fail. |
| 2026-09-23 | 0.1.0 (unreleased) | F4 | Pass | Rerun after the same change: `validatePlan` made to start with `return [];`: 40 tests, 26 pass, 14 fail. Restored with `git checkout -- skills/build-plan/file-plan.mjs`: 40 pass, 0 fail. |
| 2026-09-23 | 0.1.0 (unreleased) | F3 | Pass | Rerun after opt-in `--reopen` was added: `node --test tests/*.test.mjs` on Node v26.5.0: 45 tests, 45 pass, 0 fail. |
| 2026-09-23 | 0.1.0 (unreleased) | F4 | Pass | Rerun after the same change: `validatePlan` made to start with `return [];`: 45 tests, 31 pass, 14 fail. Second sabotage, the reopen call disabled (`if (false && reopen && …)`): 45 tests, 43 pass, 2 fail (the reopen test and the dry-run reopen test). Restored from a copy: 45 pass, 0 fail. |
