# prove-it kit 0.1.1 — design

*Fixes the skill-quality gaps the 0.1.0 acceptance run surfaced (issue #8), so
the kit is fit to record the series with. Nothing else.*

- **Status:** validated 2026-09-23. Supersedes the grade scoring in
  `2026-09-23-prove-it-kit-design.md` §4; everything else there stands.
- **Evidence:** the 0.1.0 acceptance run's raw transcripts (kept outside the
  repo) and `tests/ACCEPTANCE.md`.

## 1. Constraints (pre-build restatement, confirmed)

1. Fix exactly issue #8: question batching, un-read-back term rewrites, grade
   scoring, build pass/fail from output text, handoff reading unlisted inputs,
   remediation grouping, hostnames via `now-sdk auth --list`.
2. Test-first at the skill level: each gap becomes an acceptance criterion
   first, recorded as FAIL from the 0.1.0 evidence; the fix must turn it into
   PASS on a re-run.
3. One design decision (grade scoring): a **fixed rubric**.
4. Same flow: branches, spec + quality review, `/code-review` per PR, isolated
   headless re-run.
5. Release: tag `v0.1.1`, repo stays private.

## 2. Grade: the fixed rubric

Every project is scored against the **same 18 criteria**, six per dimension.
Per-term checks feed a single criterion as a coverage ratio, so a design with
100 terms and a design with 10 produce comparable scores.

| Dimension | Criterion id | Passes when |
|---|---|---|
| Design | `design.signed` | Every design record is signed (template §9 rule) |
| Design | `design.terms-tested` | 100% of terms (C1…) are named by at least one test; shown as `n of m` |
| Design | `design.gates-evidenced` | 100% of §7 pass criteria for gates at or before the milestone have run evidence; `n of m` |
| Design | `design.failure-modes` | Every §5 failure mode has a handling term or test |
| Design | `design.drift-ruled` | No deviation between code and record without a signed drift-log row |
| Design | `design.no-open` | No item marked `OPEN` in any record for this milestone |
| Code quality | `code.build` | `now-sdk build` **exits 0** |
| Code quality | `code.tests` | The `test` script exits 0 |
| Code quality | `code.lint` | The `lint` script exits 0 (unverified if there is none) |
| Code quality | `code.oob` | No out-of-box workflow, state or record is modified |
| Code quality | `code.logic-off-instance` | Business logic is separated from platform calls and covered by tests that need no instance |
| Code quality | `code.secrets` | The tree and history scan clean (guard patterns; gitleaks if installed) |
| Readiness | `ready.install` | `now-sdk install --auth <alias>` succeeds (asked first) |
| Readiness | `ready.real-user` | Access was checked as an ordinary role, with evidence |
| Readiness | `ready.ai-bounded` | Every AI call has a rate limit, a budget and an off switch, and ships switched off |
| Readiness | `ready.config-documented` | Every property and role the app needs is documented |
| Readiness | `ready.demo-honest` | Demo data is seeded; no real records |
| Readiness | `ready.gate-clear` | Zero open blockers for the milestone's gate |

- **Scoring:** pass = 1; fail and unverified = 0, and unverified is shown as
  such. Dimension score = round(100 × passes ÷ 6). Overall = mean of the three.
- **Caps** (by criterion id, applied after the mean, can't be averaged away):
  - **49:** `code.build` fail or unverified; `code.tests` fail; `code.secrets` fail.
  - **74:** `design.signed`, `design.terms-tested`, `code.oob` or
    `ready.ai-bounded` fail; `ready.install` not pass at a milestone whose gate
    is install or later; `design.missing` (no design record in the repo).
- **Bands:** unchanged from 0.1.0.
- **Remediation:** one story per failed or unverified criterion (at most 18),
  key `grade.<gate>.<criterion id>`, filed through `file-plan.mjs --reopen`.
  The per-term detail (which terms lack tests) goes in that story's body, not
  in separate stories.
- **Forecast:** unchanged (score if remediation is done; which caps release).

## 3. The other fixes

| Gap | Fix |
|---|---|
| design-challenge batches questions | Every turn ends with **exactly one question**. Extra questions wait for later turns. A turn that needs no answer asks nothing. |
| Terms rewritten without read-back | Before writing the record, list every term, numbered, in the exact wording to be written, and ask: *"Confirm these N terms, or correct any."* Write **exactly** the confirmed list. Splitting or merging a term is proposed in the read-back, never done silently. `amend` reads back the added or changed terms the same way. |
| Build pass/fail from output text | Run each check so its exit status is captured (`now-sdk build; echo "exit=$?"`) and judge **only** by the exit status; quote the output as evidence, not as the verdict. |
| Hostnames via `now-sdk auth --list` | Grade never runs `now-sdk auth --list` (it prints instance hosts). It asks: *"Which alias should I install to? Type the alias name."* A yes counts only if it names the alias (unchanged). |
| Handoff (no argument) reads unlisted inputs | Inputs are listed explicitly: design records, `src/`, the RUNBOOK and HANDOFF templates, and an existing `RUNBOOK.md` if present. A rule: *"Read nothing else — not GRADE.md, not BACKLOG.md."* |
| Remediation grouping | Resolved by §2: one story per failed or unverified criterion. |

## 4. New acceptance criteria (added before any fix)

| Id | Criterion | Observable from |
|---|---|---|
| B6 | Every design-challenge turn contains at most one question to the person | The session transcripts |
| B7 | Before writing, the terms are read back and confirmed; the written record's terms match the confirmed list exactly (same count, same wording) | Transcript read-back vs the record |
| D7 | Grade scores the 18-criterion rubric: exactly 6 criteria per dimension, per-term checks shown as `n of m` coverage | `GRADE.md` |
| D8 | Build and test verdicts come from exit status, shown as evidence | Transcript tool calls and `GRADE.md` |
| D9 | Grade never runs `now-sdk auth --list` | Transcript tool calls |
| D10 | Remediation proposes one story per failed or unverified criterion, never more than 18 | The proposed plan |
| E6 | Handoff with no argument reads only its listed inputs | Transcript tool calls |

The 0.1.0 run's transcripts already show B6, B7, D7 and E6 failing, and D8 and
D10 not meeting the new wording. Those rows are recorded as FAIL (dated,
0.1.0-rc.1) before the fixes. D9 is recorded from the 0.1.0-rc.1 skill text.

## 5. Out of scope

Everything in issue #3. Any change to consult, build-plan or the scripts.
