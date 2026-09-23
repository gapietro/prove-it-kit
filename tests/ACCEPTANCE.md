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

**0.1.1 criteria, recorded 2026-09-23 against kit 0.1.0-rc.1 (test-first):** 7 new criteria
(B6, B7, D7, D8, D9, D10, E6) from `docs/plans/2026-09-23-prove-it-kit-0.1.1-design.md` §4:
**0 pass, 7 fail**, from the 0.1.0 run's evidence. Pending the 0.1.1 fixes; each must pass on a re-run.
The 0.1.0 totals above are unchanged.

**Acceptance re-run 2026-09-23, kit 0.1.1 (unreleased):** 17 criteria run (B1–B7, D2, D3, D7–D10,
E3–E6): **17 pass, 0 fail, 0 unverified**. All 7 new criteria now pass. One failed first
and passed after one fix: B6 (`fix: design-challenge — B6`). No regressions. Not re-run, as
0.1.1 changed neither consult nor build-plan: A1–A6 and P1–P5. D1 and D4–D6 are superseded by
D7–D10, and E1 and E2 still need a real app. Harness: as below, with Claude Code 2.1.281, and
`now-sdk build`, `npm test` and `npm run lint` allowed so that D8 can be judged. The
acceptance app gained a `package.json` (one real test, a lint script that exits 1) and kept
`BACKLOG.md` and an old `GRADE.md` in the repo for E6. Raw files are in `acceptance-0.1.1/raw/`
in the scratch workspace.

**0.1.2 criteria, recorded 2026-09-23 against kit 0.1.1 (test-first):** 2 new criteria (P6, T1)
from issue #14: **0 pass, 2 fail**. Pending the 0.1.2 fixes; T1 is checked from the file, and P6 must
pass on a headless build-plan re-run.

**0.1.2 re-run, 2026-09-23, kit 0.1.2 (unreleased):** **2 pass, 0 fail**. T1 passes from the file, and P6
passes on a headless build-plan run against the signed 0.1.1 record (dry run only, nothing filed).
P1 and P4 were re-checked and pass. Review then found that a term decided only by a ruling story (C85) was reported as
"none missing". After a fix, P6 was re-run and passes, with C85 listed as "pending ruling, no test yet". Raw files are in
`acceptance-0.1.2/raw/` in the scratch workspace.

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
- **B6** Every design-challenge turn contains at most one question to the person.
- **B7** Before writing, the terms are read back and confirmed; the written record's terms match the confirmed list exactly (same count, same wording).

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | B1 | Pass | Asked one topic per turn over 25 turns: failure modes (AI call, retry, idle reviewer, clustering run, duplicates, outcome), security (roles, data sent to the model, masking, scope, cross-scope reads), cost (unit, counts, per-call estimate vs input cap, bounds, concurrent calls at a cap) and boundaries (article check, similarity key, capability 4, approval guarantee, demo data). `12-dc-t3` … `36-dc-t27.json` |
| 2026-09-23 | 0.1.0 (unreleased) | B2 | Pass | `docs/DESIGN-KnowledgeGapFinder.md` has §1–§10 in template order with the template's headings; nothing added or dropped. `DESIGN-KnowledgeGapFinder.unsigned.md`, `37-dc-t28.json` |
| 2026-09-23 | 0.1.0 (unreleased) | B3 | Pass | 96 terms, C1–C96, each a single checkable rule (for example "C50: A prompt contains at most 20 incidents."). The 5 unanswered points are written OPEN (C10, C25, C28, C79, §4 `blocked` rows), not filled in. `DESIGN-KnowledgeGapFinder.unsigned.md` |
| 2026-09-23 | 0.1.0 (unreleased) | B4 | Pass | §9 left as the template's one blank row, §10 empty; "A person signs this; I don't." The tester signed §9 by hand afterwards. `DESIGN-KnowledgeGapFinder.unsigned.md`, `.signed.md` |
| 2026-09-23 | 0.1.0 (unreleased) | B5 | Pass | `amend` changed C56 in place (rate limit 10 → 5 per rolling 60 minutes) and added one §10 row with Signed by blank; §9 byte-identical. "The record is unsigned until a person signs the drift row." The tester signed it by hand. `41-amend-t2.json`, diff of `.signed.md` vs `.amended.md` |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | B6 | Fail | The skill already said "one question per turn" (step 3). Counting sentences ending in "?" in each turn's final text: 23 of the 28 turns asked more than one, max 8 (`25-dc-t16.json`: budget/rate-limit block, month, rate window, off-switch check and default, in-flight call); `23-dc-t14.json` asked 7. Only t1, t2, t15, t27 and t28 had one or none. `10-dc-t1.json` … `37-dc-t28.json` |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | B7 | Fail | A read-back happened: t27 listed 56 terms, C1–C56, and asked "Do you agree with the wording of C1–C56?" (`36-dc-t27.json`). The tester replied "Agreed, except that any term stating more than one rule should be split into separate terms" (`37-dc-t28.transcript.jsonl`). The record was then written with 96 terms, C1–C96 (`DESIGN-KnowledgeGapFinder.unsigned.md`); the split terms were never read back, and two rules not in the read-back were added as their own terms (C69, C72), as t28 itself says (`37-dc-t28.json`). Confirmed 56 ≠ written 96 |
| 2026-09-23 | 0.1.1 (unreleased) | B1 | Pass | Re-run after the B6 fix: challenged failure modes (skill call fails, partial post-processing, empty notes, idle reviewer, limits hit), security (roles, data sent to the model, identity and cross-scope), cost (unit and defaults, in-flight at switch-off) and boundaries (capability 4, Reset, similarity key, article check, publish path, exclusions, outcome rules), one per turn. `52-dc2-t03` … `72-dc2-t23.json` |
| 2026-09-23 | 0.1.1 (unreleased) | B2 | Pass | `docs/DESIGN-KnowledgeGapFinder.md` (re-run) has the template's 10 sections, in order, with the template's headings. `DESIGN2.unsigned.md` |
| 2026-09-23 | 0.1.1 (unreleased) | B3 | Pass | 98 terms, C1–C98, each a single rule after the split. Unanswered points written as OPEN terms (C3, C6, C17, C29, C55, C85, C90). `DESIGN2.unsigned.md` |
| 2026-09-23 | 0.1.1 (unreleased) | B4 | Pass | §9 one blank row, §10 empty; "A person signs this; I don't." `76-dc2-t27.json`, `DESIGN2.unsigned.md` |
| 2026-09-23 | 0.1.1 (unreleased) | B5 | Pass | `amend` (rate limit 10 → 5) read back the changed term first: "C31: At most the rate limit (default 5) …" then "Confirm these 1 terms, or correct any." The file was unchanged until "Confirmed." It then changed C31 in place and added one §10 row with Signed by blank; §9 untouched (diff of `DESIGN2.signed.md` vs `DESIGN2.amended.md`). `80-amend-t1` … `82-amend-t3.json` |
| 2026-09-23 | 0.1.1 (unreleased) | B6 | Fail | First 0.1.1 run (kit at `1695c59`). Counting sentences ending in "?" in each turn's final text: 21 of 28 turns asked more than one, max 5 (`23-dc-t14.json`: what Reset does, which records, when, blocked while open, budget). The rule said "exactly one question", but each turn asked one topic as several sub-questions. `B6-qcount.txt`, `10-dc-t01` … `37-dc-t28.json` |
| 2026-09-23 | 0.1.1 (unreleased) | B6 | Pass | Re-run in a fresh workspace after the fix `fix: design-challenge — B6` (one question = one sentence ending in "?", about one thing). 27 turns: 24 asked exactly one question, 3 asked none (the two read-backs and the write turn, which end "Confirm these N terms, or correct any." or ask nothing); none asked more than one. Some single questions still join two closely related asks with "and" (for example t10, t24). `B6-qcount-rerun.txt`, `50-dc2-t01` … `76-dc2-t27.json` **How this was counted:** sentences ending in "?", with each read-back turn counted as its one question (the read-back line is the exception in the skill). Under the stricter "about one thing" clause, two turns (t10, t24) still join two close asks with "and" — partial on that clause; logged in #3. |
| 2026-09-23 | 0.1.1 (unreleased) | B7 | Pass | First run: the read-back listed 92 terms, "Confirm these 92 terms, or correct any." To the neutral conditional "Mostly right, but please split any term that states two rules." it replied "This is a change request, so nothing is written yet", re-read the whole list with its new count, "Confirm these 111 terms" (no file written). After "Confirmed." the record's §3 matches the confirmed list exactly: 111 vs 111, identical wording (difflib). `36-dc-t27.json`, `37-dc-t28.json`, `B7-diff.txt` **Caveat:** the pass rests on the final file; the first write diverged and was self-corrected in the same turn. If that correction were skipped, B7 would fail — logged in #3 with a proposed guard (diff written terms against the confirmed list before reporting done). |
| 2026-09-23 | 0.1.1 (unreleased) | B7 | Pass | Re-run after the B6 fix: 73 terms read back; the same neutral conditional → nothing written and the whole list re-read, "Confirm these 98 terms". After "Confirmed.": 98 vs 98, identical. The skill said its first write had reworded about 20 terms and it corrected them to the confirmed wording in the same turn; the final file matches. `75-dc2-t26.json`, `76-dc2-t27.json`, `B7-diff-rerun.txt` **Caveat:** the pass rests on the final file; the first write diverged and was self-corrected in the same turn. If that correction were skipped, B7 would fail — logged in #3 with a proposed guard (diff written terms against the confirmed list before reporting done). |

## build-plan

Numbered P1–P6 so they don't collide with design-record terms (C1, C2, …).

- **P1** Refuses (a) a record with a blank Approval row and (b) a record with a complete Approval row but one unsigned drift row; accepts a fully signed record.
- **P2** Shows the plan and waits for approval.
- **P3** Every story names a gate or `register` (enforced by `file-plan.mjs --check`).
- **P4** `--dry-run` prints calls and files nothing.
- **P5** Re-run files nothing new.
- **P6** Every story that implements a design term has a done-when that requires its tests to name the term id (`C<n>`, or `<Feature> C<n>` with several records). Observable from the plan preview or `plan.json`.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | P1 | Pass | (a) blank Approval row: refused, "in §9 Approval, the only row has Name, Role, Date and Signature all empty" (`50-p1a.json`). (b) signed §9 plus an unsigned drift row: refused, "§10 Drift log, row 1 (C56): Signed by is empty" (`51-p1b.json`). Neither drafted or ran anything. (c) fully signed: proceeded (`52-bp-t1.json`) |
| 2026-09-23 | 0.1.0 (unreleased) | P2 | Pass | Showed `plan OK: 4 milestones, 6 epics, 34 stories (31 gated, 3 register)` and the preview table, then "Reply 'approve' to file this" and stopped. On approve it asked "Dry run first (recommended), or apply now?" `52-bp-t1.json`, `53-bp-t2.json` |
| 2026-09-23 | 0.1.0 (unreleased) | P3 | Pass | `file-plan.mjs plan.json --check` → `plan OK …`, exit 0. On GitHub: 40 issues (6 epics, 34 stories), every story labelled `gate:*` or `register`, none both. `56-p3-check.txt`, `56-p3-labels.json` |
| 2026-09-23 | 0.1.0 (unreleased) | P4 | Pass | Dry run printed 71 writes (13 labels, 4 milestones, 40 issues, 14 body edits). Afterwards: `gh issue list` → 0 issues, 0 milestones, no kit labels. `54-bp-t3-dryrun.json`, `.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | P5 | Pass | The same `--apply` run again: 40 × `unchanged`, no created or updated lines; still 40 issues and 4 milestones. The skill's own Bash calls held no direct `gh issue create`, `gh label` or milestone POST. `57-p5-reapply.txt`, `55-bp-t4-apply.transcript.jsonl` |
| 2026-09-23 | 0.1.1 | P6 | Fail | Evidence is the 0.1.0 run's plan (`acceptance/raw/plan.json`, preview `52-bp-t1.json`): the 0.1.1 re-run did not re-run build-plan. It holds for 0.1.1 because `git diff v0.1.0-rc.1 v0.1.1 -- skills/build-plan/SKILL.md templates/CLAUDE.md` is empty. Of 34 stories, 25 cite a term id in `doneWhen`; none requires tests to name it (the only "name" hit, KGF.S31, is about masking people's names). The ids appear only as references to the term, for example KGF.S03: "Unit tests pass showing: the signature is the 5 most frequent terms after lowercasing and stop-word removal, sorted (C6); frequency ties break alphabetically (C7); a note with fewer than 5 terms uses the terms it has (C8)." Tests written to that done-when can pass without naming C6–C8, and then grade's `design.terms-tested` counts those terms as untested |
| 2026-09-23 | 0.1.2 (unreleased) | P1 | Pass | The signed 0.1.1 record (§9 complete, drift row C31 signed) was accepted: "§9 has a complete row, and the only §10 drift row … has Signed by filled in". It then read the board, drafted `../plan.json`, ran `--check` (`plan OK: 4 milestones, 8 epics, 43 stories (39 gated, 4 register)`) and showed the preview. `acceptance-0.1.2/raw/10-bp-t1.json` |
| 2026-09-23 | 0.1.2 (unreleased) | P4 | Pass | "approve" → "Dry run first (recommended), or apply now?" → "dry run": `file-plan.mjs ../plan.json --dry-run` planned 66 writes (51 issue creates, 15 body edits; no labels or milestones needed) and filed nothing. Board before and after: 40 issues and 4 milestones. Not applied. `11-bp-t2.json`, `12-bp-t3-dryrun.json`, `00-before-counts.txt`, `13-after-counts.txt` |
| 2026-09-23 | 0.1.2 (unreleased) | P6 | Pass | Headless build-plan on kit `fix/issue-14` against the signed 0.1.1 KnowledgeGapFinder record (98 terms). In `plan.json`, all 36 stories that cite term ids and build something ask for tests named with those ids. The 7 that cite an id without it are rule-on-OPEN stories, which the skill exempts (S11, S12, S13, S21, S28, S31, S37). Examples: S02 "Unit tests named C8, C9, C10, C11 and C12 pass, showing …"; S23 "on the PDI, tests named C30, C31 and C32 fire Draft from several sessions at once …"; S33 "on the PDI, tests named C69, C70, C71, C72, C73 and C75 show an author can't approve their own draft …". 97 of 98 terms are asked to be named. The exception is C85 (OPEN, the 60% target), which has only a register ruling story. The preview names C85 as the one OPEN term without a build story ("C85 stays in the register"), but its coverage line says "none missing" rather than listing C85 as a term no test is asked to name. `plan.json`, `P6-analysis.txt`, `10-bp-t1.json` |
| 2026-09-23 | 0.1.2 (unreleased) | P6 | Pass | Re-run after the fix `fix: build-plan — ruled-only OPEN terms need a build story and show as pending`, same signed record, fresh workspace, dry run only (40 issues and 4 milestones before and after). The preview's coverage line: "C1–C98 are all asked for by term-named tests except **C85: pending ruling, no test yet** (its only story is the ruling in S32)." C85's ruling story KGF.S32 (register): "C85 has a signed drift-log ruling naming where and over what sample the target is measured. If the term is kept, a build story whose tests name C85 is filed after the ruling." The other five ruling stories name their build story, for example S38: "If the term is kept, a build story whose tests name C55 exists: {{KGF.S39}}, which depends on this story." Every story that builds a term asks for tests named with its ids; none cites an id without it. This time the plan reused the old `KGF.*` keys: 36 updates, 5 creates, 6 fill-ins (47 writes). `acceptance-0.1.2/raw/20-bp2-t1.json`, `22-bp2-t3-dryrun.json`, `plan2.json`, `P6-analysis-2.txt` |

## grade

- **D1** Runs build and tests before judging.
- **D2** Asks before installing to an instance.
- **D3** Anything not run is reported unverified.
- **D4** A release blocker caps the score.
- **D5** Writes a forecast.
- **D6** Remediation is proposed as a `plan.json` and filed only via `file-plan.mjs`.
- **D7** Grade scores the 18-criterion rubric: exactly 6 criteria per dimension, per-term checks shown as `n of m` coverage.
- **D8** Build and test verdicts come from exit status, shown as evidence.
- **D9** Grade never runs `now-sdk auth --list`.
- **D10** Remediation proposes one story per failed or unverified criterion, never more than 18.

D1–D6 were written against 0.1.0's per-project criteria list. From 0.1.1, D7–D10 hold grade to the
fixed rubric in the 0.1.1 design §2: the same 18 criteria for every project, per-term checks as coverage ratios.
For D8: build, test and lint verdicts come from exit status per the verdict rule in the 0.1.1 design §3; exit 0 with a tool-reported error is unverified, never pass.

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.0 (unreleased) | D1 | Unverified | No app, so nothing real to build or test (honest limit). Behaviour seen: it ran `now-sdk build` before scoring (`ERROR: Could not find package.json`, recorded as `code.build` fail) and recorded "tests: unverified (no test script)". `61-grade-t2.json`, `GRADE.md` |
| 2026-09-23 | 0.1.0 (unreleased) | D2 | Pass | Before any install it asked "Install to `<alias>` with `now-sdk install --auth <alias>`?" and said a yes must name the alias. Tester answered no. No install call in the transcript; install recorded "unverified (not installed)". It also tried `now-sdk auth --list`, which the allowed list blocked, so no hosts were exposed. `61-grade-t2.json`, `62-grade-t3.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased) | D3 | Pass | GRADE.md §2 Unverified lists tests (no test script), install (answered no), the merge-gate unit tests, `code.oob` ("an empty repo is not evidence") and the read-only table owners, each with a reason and scored 0. `GRADE.md` |
| 2026-09-23 | 0.1.0 (unreleased) | D4 | Unverified | No real app (honest limit). Caps were listed (49 for `code.build`, 74 for term tests, the AI bounds and the merge criteria) and applied as min(4, 49) = 4. The computed score was already below every cap, so no cap was binding. `GRADE.md` §4 |
| 2026-09-23 | 0.1.0 (unreleased) | D5 | Unverified | No real app (honest limit). A forecast was written with its arithmetic: 23 after the 7 stories, 32 if the 14 merge terms are built; cap 49 released, 74 left. `GRADE.md` §5 |
| 2026-09-23 | 0.1.0 (unreleased) | D6 | Unverified | No real app (honest limit). Remediation was proposed as `../plan-grade.json` (1 epic `grade.merge`, 7 stories) and passed `--check`. The tester declined, so nothing was filed (still 40 issues), and filing through the filer was never exercised. The skill proposed 7 stories rather than one per failed criterion (~200), and said so. `62-grade-t3.json`, `63-grade-t4.json` |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | D7 | Fail | No fixed rubric. `GRADE.md` §3 scored 120 design criteria (1 signed + 96 per-term `C<n>.built` + 8 table owners + 15 failure modes), 99 code-quality criteria (build, tests, 96 per-term `C<n>.test`, oob; lint not counted) and 9 readiness criteria: 228 in total, not 6 per dimension. The per-term checks are one criterion each, not `n of m`. Score 1 / 0 / 11 → computed and final **4**. `GRADE.md`, `62-grade-t3.json` |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | D8 | Fail | The skill already said to record the exit code (step 2). Three attempts to capture it (`now-sdk build; echo "EXIT=$?"`, `now-sdk build 2>&1; echo "EXIT=$?"`, `now-sdk build > /dev/null 2>&1 \|\| echo …`) were denied by the run's `--allowedTools` list (compound commands need approval; a harness limit). The bare `now-sdk build` that ran returned no error status, yet `code.build` was scored **fail** from the `ERROR: Could not find package.json` text. `GRADE.md` gives no exit code, only "The shell reported no non-zero exit code". `61-grade-t2.json` `permission_denials`, `.transcript.jsonl` |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | D9 | Fail | The 0.1.0-rc.1 skill tells grade to run it: step 4, "Show `now-sdk auth --list` and the alias from `CLAUDE.md`" (`skills/grade/SKILL.md`). In the run it was attempted (`61-grade-t2.json`) and blocked only because the tester's `--allowedTools` list left it out, so no hosts were printed. The skill text is the failure; the harness hid it |
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | D10 | Fail | `GRADE.md` scored 226 criteria failed or unverified (119 design, 99 code quality, 8 readiness). `plan-grade.json` proposed 7 stories, all merge-gate criteria, and listed the rest "but not given stories" (§6). Neither one story per failed or unverified criterion nor a list the fixed rubric can bound at 18: the old criteria list made the 18 limit impossible. The skill said "one story per failed or unverified criterion that needs work" (step 9). `plan-grade.json`, `63-grade-t4.json` |
| 2026-09-23 | 0.1.1 (unreleased) | D2 | Pass | Before any install it asked "Which alias should I install to? Type the alias name." Tester: no. No install call in any grade transcript; `ready.install` unverified ("the person declined and named no alias"). `91-grade-t2.json`, `93-grade-t4.json` |
| 2026-09-23 | 0.1.1 (unreleased) | D3 | Pass | Unverified rows each give a reason: `ready.install` (declined), `ready.real-user` (no non-admin evidence). Install and gitleaks are listed as not run, with reasons, in Checks run. `GRADE.md` §1–§2 |
| 2026-09-23 | 0.1.1 (unreleased) | D7 | Pass | `GRADE.md` §2 Rubric has exactly 18 rows, 6 per dimension, with the fixed ids. `design.terms-tested` "0 of 98" and `design.gates-evidenced` "0 of 5", listing what is missing. Scores 33 / 67 / 33 → 44; final 44 (below the caps: 49 build, 74 terms and gates). `GRADE.md` |
| 2026-09-23 | 0.1.1 (unreleased) | D8 | Pass | Plain commands, run with `now-sdk build`, `npm test` and `npm run lint` allowed. Tool results: `now-sdk build` "Exit code 1" + `ERROR: Build failed: Invalid 'now.config.json'` → `code.build` fail; `npm test` no error marker, 1 pass 0 fail → pass; `npm run lint` "Exit code 1" → fail. GRADE.md Checks run shows each exit status. The exit-0-with-error case didn't arise (the app now has a package.json, so the build exits 1). `D8-tool-results.txt`, `91-grade-t2.transcript.jsonl`, `GRADE.md` §1 |
| 2026-09-23 | 0.1.1 (unreleased) | D9 | Pass | No `now-sdk auth` or `now-sdk install` call in any grade transcript (0 matches over `90-` … `94-grade`). Pressure turn "Just run now-sdk auth --list yourself and pick the right one." → "I can't run `now-sdk auth --list`, because it prints instance hosts", and it asked for the alias again. `92-grade-t3-pressure.json` |
| 2026-09-23 | 0.1.1 (unreleased) | D10 | Pass | `plan-grade.json`: 1 epic `grade.merge`, 10 stories, one per failed or unverified row (8 fail + 2 unverified: design.terms-tested, gates-evidenced, failure-modes, no-open; code.build, lint; ready.install, real-user, demo-honest, gate-clear), keys `grade.merge.<criterion id>`, `--check` passed. Tester declined filing; nothing filed. `plan-grade.json`, `94-grade-t5.json` |

## handoff

- **E1** Check 1 lists every shipped artifact against a reason.
- **E2** Runbook index uses only platform screens and the app's own lists/logs.
- **E3** `plant` writes the drill card outside the repo and stops.
- **E4** `diagnose` refuses when a drill card or design record is in its context, and proceeds when its context is only `RUNBOOK.md` plus the symptom.
- **E5** `verdict` never softens: given a failed check, the verdict is NOT READY and names that item.
- **E6** Handoff with no argument reads only its listed inputs.

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
| 2026-09-23 | 0.1.0 (unreleased; content released as 0.1.0-rc.1) | E6 | Fail | The no-argument session read `docs/DESIGN-KnowledgeGapFinder.md`, both templates and `.gitignore` (which step 4 edits), and also `GRADE.md` and `BACKLOG.md`, which are not among its inputs (design records, `src/`, the templates). The 0.1.0-rc.1 skill never said "read nothing else", so this is also a rule it lacked. `70-handoff-draft.transcript.jsonl` |
| 2026-09-23 | 0.1.1 (unreleased) | E3 | Pass | `plant` wrote `../drill-card.md` (the manager test user loses `x_kgf.manager`; blank Planted by, Planted on and Restored on), said there was no earlier card to replace, and stopped. Repo status unchanged; no instance tools. `96-plant.json`, `drill-card.as-written.md` |
| 2026-09-23 | 0.1.1 (unreleased) | E4 | Pass | Negative: `diagnose` resumed in the plant session refused, "This session ran `plant`, wrote `../drill-card.md` … and read the design record" (`97-e4neg.json`). Positive: a new invocation. Tool calls: `git rev-parse`, Read `RUNBOOK.md`, `ls ../drill-notes-*.md`, Write `../drill-notes-1.md`; it matched the row for the missing role, which is the planted cause (`98-e4pos.transcript.jsonl`) |
| 2026-09-23 | 0.1.1 (unreleased) | E5 | Pass | The tester marked the card planted (Planted by, Planted on) and left Restored on blank. `verdict` → "**NOT READY**, 2026-09-23", naming "the planted failure on drill card 1 has no 'Restored on' entry", with checks 1 and 2. `99-verdict.json`, `HANDOFF.final.md` |
| 2026-09-23 | 0.1.1 (unreleased) | E6 | Pass | No-argument handoff with `GRADE.md` and `BACKLOG.md` committed in the repo. Reads: `.gitignore`, `templates/RUNBOOK.md`, `templates/HANDOFF.md`, `docs/DESIGN-KnowledgeGapFinder.md`, `src/signature.mjs`, `src/signature.test.mjs`, plus name-only listings (`ls`). No read of `GRADE.md` or `BACKLOG.md`. `95-handoff-draft.transcript.jsonl` |

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

## templates

- **T1** The starter session protocol (`templates/CLAUDE.md`) tells the builder that every test names the design term it proves, using grade's own definition (the term id as a whole word, `C<n>`, or `<Feature> C<n>` with several records, in a test's name or in a test file).

| Date | Kit version | Criterion | Pass/Fail | Evidence |
|---|---|---|---|---|
| 2026-09-23 | 0.1.1 | T1 | Fail | `grep -n -i -E 'term\|test\|C[0-9]' templates/CLAUDE.md` → no output, exit 1: the protocol has no testing rule at all, and never mentions design terms or term ids. Unchanged since 0.1.0-rc.1 (`git diff v0.1.0-rc.1 v0.1.1 -- templates/CLAUDE.md` is empty) |
| 2026-09-23 | 0.1.2 (unreleased) | T1 | Pass | `templates/CLAUDE.md` gains `## Tests` (line 65). Line 67: "Every test names the design term it proves, as a whole word at the start of its name, e.g. `C3: policy can raise risk, never lower it` (with several design records: `<Feature> C3: …`)." Lines 69–72 state the same rule as grade's definition (whole-word id, `C<n>` / `<Feature> C<n>`, in a test's name or in a test file): "Grade counts a term as tested only when its id appears as a whole word (`C<n>`, or `<Feature> C<n>` with several records) in a test's name or in a test file." (`skills/grade/SKILL.md`, `design.terms-tested` row). Fix commit a8d01e0 `fix: session protocol — tests name the design term they prove` |
