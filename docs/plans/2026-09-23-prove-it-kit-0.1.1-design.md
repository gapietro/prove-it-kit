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
| Design | `design.signed` | At least one design record exists in the repo, and every design record is signed (template §9 rule). No record in the repo is a fail, with the reason "missing" |
| Design | `design.terms-tested` | 100% of terms are named by at least one test: the term id as a whole word (`C<n>`, or `<Feature> C<n>` when there are several records) in a test's name or in a test file; shown as `n of m` |
| Design | `design.gates-evidenced` | 100% of §7 pass criteria for gates at or before the milestone have evidence: a check run in this grade, or a closed issue or PR recording the result, cited. Anything else counts as missing; `n of m` |
| Design | `design.failure-modes` | Every §5 failure mode has a handling term or test; cite the term or test for each §5 row |
| Design | `design.drift-ruled` | Every table, role, ACL, property and script include declared in `src/*.now.ts` appears in the record (§3, §4 or §6) or in a signed §10 row; each that doesn't is listed with file:line |
| Design | `design.no-open` | No `OPEN` in §1–§8 of any design record |
| Code quality | `code.build` | The build (`npm run build` if there is a `build` script, else `now-sdk build`) passes by the verdict rule (§3) |
| Code quality | `code.tests` | The `test` script passes by the verdict rule; a test script that makes no assertions is not evidence: unverified |
| Code quality | `code.lint` | The `lint` script passes by the verdict rule (unverified if there is none) |
| Code quality | `code.oob` | Every declaration in `src/` whose table or target is outside the app's scope is listed with file:line; passes only if the list is empty or every entry extends rather than modifies. No list → unverified |
| Code quality | `code.logic-off-instance` | The logic modules are named, shown not to reference `Glide*` or `gs`, and shown to be imported by `npm test` (exit 0); cited file:line |
| Code quality | `code.secrets` | The tree and history scan clean (guard patterns; gitleaks if installed) |
| Readiness | `ready.install` | `now-sdk install --auth <alias>` succeeds (asked first) |
| Readiness | `ready.real-user` | A cited test, issue or PR comment shows a check done as a non-admin role; otherwise unverified |
| Readiness | `ready.ai-bounded` | Every AI call has a rate limit, a budget and an off switch, and ships switched off; cite the property or setting for the rate limit, budget and off switch, file:line |
| Readiness | `ready.config-documented` | Every property and role declared in `src/` is listed with its purpose in `README.md`, `CLAUDE.md` or `RUNBOOK.md`; the design record doesn't count |
| Readiness | `ready.demo-honest` | Demo data is seeded; no real records; cite the seed records in `src/` |
| Readiness | `ready.gate-clear` | Zero open blockers for the milestone's gate |

A pass needs evidence of the kind the row names. Without it the row is
unverified, never pass.

- **Scoring:** pass = 1; fail and unverified = 0, and unverified is shown as
  such. Dimension score = round(100 × passes ÷ 6). Overall = mean of the three.
- **Caps** (by criterion id, applied after the mean, can't be averaged away):
  - **49:** `code.build` fail or unverified; `code.tests` fail or unverified (no
    test script means no evidence of tests, which must never score better than
    failing tests); `code.secrets` fail.
  - **74:** `design.signed` (including a missing record), `design.terms-tested`,
    `code.oob` or `ready.ai-bounded` fail; `ready.install` not pass at a
    milestone whose gate is install or later.
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
| Build pass/fail from output text | One verdict rule for build, test and lint, run as the plain command (`npm run build` if there is a `build` script, else `now-sdk build`; `npm test`; `npm run lint`). The shell tool reports a non-zero exit with its code. **A pass needs exit 0 and no error reported by the tool itself:** an `ERROR:` line from now-sdk, `npm ERR!` or `npm error`, or a failed-test count above zero. Text printed by passing tests (logged errors, warnings) doesn't count. Exit 0 with a tool-reported error (seen with now-sdk 4.12.2: `Could not find package.json`) is **unverified**, with the contradiction quoted, never a pass. A non-zero exit is always a fail, whatever the output says, except exit 127 ("command not found"), which is unverified (tool missing). No visible status is unverified. The re-run harness must allow the plain build, test and lint commands. |
| Hostnames via `now-sdk auth --list` | Grade never runs `now-sdk auth --list` (it prints instance hosts). It asks: *"Which alias should I install to? Type the alias name."* A yes counts only if it names the alias (unchanged). |
| Handoff (no argument) reads unlisted inputs | Inputs are listed explicitly: design records, `src/`, the RUNBOOK and HANDOFF templates, and an existing `RUNBOOK.md` and `HANDOFF.md` draft if present (a re-run rewrites the draft). A rule: *"Read nothing else — not GRADE.md, not BACKLOG.md."* |
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

The 0.1.0 run's transcripts show all seven failing. Those rows are recorded as
FAIL before the fixes, labelled like the rest of that run's evidence: "0.1.0
(unreleased; content released as 0.1.0-rc.1)". D9 rests on the skill text,
since the harness blocked the command from actually running.

## 5. Out of scope

Everything in issue #3. Any change to consult, build-plan or the scripts.
