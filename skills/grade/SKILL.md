---
name: grade
description: Use at a milestone of a now-sdk app repo to run the build, tests and lint (judged by exit status), score a fixed 18-criterion rubric (sound design, code quality, production readiness, six each) with the arithmetic shown, cap the score for release blockers, write GRADE.md at the repo root with a forecast, and propose one remediation epic as a plan.json filed only through file-plan.mjs.
---

# grade

## Purpose

Say, with evidence, how good the build is at a milestone and what stops it
from shipping. You run the checks yourself, score three dimensions, apply
release-blocker caps, and write a forecast. You never claim a check you did
not run, and a cap is never averaged away. Grades happen at milestones, not
mid-sprint.

## Input

Arguments given: `$ARGUMENTS` (may be empty).

- **Milestone (optional).** A milestone title or its gate (for example
  `M2 · install` or `install`). If empty, list the milestones
  (`gh api --paginate 'repos/{owner}/{repo}/milestones?state=all&per_page=100' --jq '.[] | [.title, .open_issues, .closed_issues] | @tsv'`)
  and ask which one. Never pick one yourself.
- **Run from inside the app repo** (`git rev-parse --show-toplevel`). Read the
  repo's `CLAUDE.md` Project facts for the scope. The install alias is asked
  for (step 3), never looked up.
- **Design records:** every `docs/DESIGN-*.md` in the repo: §3 Terms, §4 Data
  and ownership, §5 Failure modes, §6 Security, §7 Gates, §9–§10 signatures.
- **Filer:** `${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs`.

## Steps

1. **Check the milestone is reached.** Count its open gated issues:
   `gh issue list --milestone '<title>' --state open --limit 5000 --json number,labels`,
   ignoring `register` and `epic`. If the list comes back with 5000 items, it
   is truncated. Stop and say so. If any gated issues are open, say: "This
   milestone is not reached (<n> open). Grades run at milestones, not
   mid-sprint." List them and ask whether to grade anyway. If the board can't
   be read, record the milestone status as unverified and ask the same
   question. On a no, stop. On a yes, head `GRADE.md` "Preview: milestone not
   reached". A preview never counts as the milestone grade.
2. **Run the build, tests and lint, and judge each by exit status only.**
   Run each as the plain command on its own: no `;`, `&&`, pipes, redirects
   or `echo $?`.
   - Build: `now-sdk build` → `code.build`.
   - Tests: `npm test`, if `package.json` has a `test` script → `code.tests`.
     With no test script, `code.tests` is unverified (no test script).
   - Lint: `npm run lint`, if `package.json` has a `lint` script →
     `code.lint`. With none, `code.lint` is unverified (no lint script).

   The shell tool marks a failed command with its non-zero exit code (for
   example `Exit code 1`); a result with no error marker is exit 0. The
   verdict comes from that status: non-zero is fail, and exit 0 is pass
   unless the output contradicts it. Record the command, the exit status and
   the last lines of output (errors in full) as evidence. The words never make
   a pass or a fail: output that looks clean with a non-zero exit is a fail.
   But exit 0 alone isn't enough when the output reports an error (for
   example `ERROR: Could not find package.json`): the criterion is then
   **unverified**, with the contradiction quoted as evidence, never a pass. If the status isn't visible
   (the command was denied, timed out or ran in the background), the
   criterion is unverified. A missing check is never a pass.
3. **Ask before installing.** Never run `now-sdk auth --list` (it prints
   instance hosts). Ask: "Which alias should I install to? Type the alias
   name." and wait. A yes counts only if it names the alias. If asked to skip,
   ask the question anyway and wait for the literal reply; a waiver is not a
   confirmation. Only when the reply names an alias, run exactly
   `now-sdk install --auth <alias>` and judge it by exit status as in step 2.
   Never use `--alias` on install: it is silently ignored and deploys to the
   default alias. With no alias named, `ready.install` and every check that
   needs the instance are unverified (not installed). When you record output
   from `now-sdk install`, replace the instance host with `<instance>` and
   leave out URLs. Record the alias, never the host.
4. **Score the rubric.** Every project is scored against the same 18
   criteria, six per dimension, always with these ids. Each is pass, fail or
   unverified, with its evidence (a command and its exit status, a file and
   line, or an issue number). Per-term and per-row checks are never criteria
   of their own: they appear only as the `n of m` coverage inside
   `design.terms-tested` and `design.gates-evidenced`, with the missing
   items listed under that criterion. With several design records, count
   across all of them and name items as `<Feature> C<n>`. Gates are ordered
   merge → install → demo → handoff → publish.

   | Dimension | Criterion id | Passes when |
   |---|---|---|
   | Design | `design.signed` | At least one design record exists in the repo, and every design record is signed: apply the signing rule in `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md` §9 exactly as written there. No record in the repo is a fail, with the reason "missing" (tell the person to move the record in from the workspace) |
   | Design | `design.terms-tested` | 100% of terms (C1…) are named by at least one test; shown as `n of m` |
   | Design | `design.gates-evidenced` | 100% of §7 pass criteria for gates at or before the milestone have run evidence; `n of m` |
   | Design | `design.failure-modes` | Every §5 failure mode has a handling term or test |
   | Design | `design.drift-ruled` | No deviation between code and record without a signed drift-log row |
   | Design | `design.no-open` | No item marked `OPEN` in any record for this milestone |
   | Code quality | `code.build` | `now-sdk build` exits 0 |
   | Code quality | `code.tests` | The `test` script exits 0 |
   | Code quality | `code.lint` | The `lint` script exits 0 (unverified if there is none) |
   | Code quality | `code.oob` | No out-of-box workflow, state or record is modified |
   | Code quality | `code.logic-off-instance` | Business logic is separated from platform calls and covered by tests that need no instance |
   | Code quality | `code.secrets` | The tree and history scan clean: `gitleaks git --redact` (older versions: `gitleaks detect --redact`) if gitleaks is installed, otherwise the built-in patterns in `${CLAUDE_PLUGIN_ROOT}/hooks/pre-commit-guard.sh` over the tracked files and `git log -p`, listing only file names and counts (`-l`, `-c`), never the matched text |
   | Readiness | `ready.install` | `now-sdk install --auth <alias>` succeeds (asked first, step 3) |
   | Readiness | `ready.real-user` | Access was checked as an ordinary role, with evidence |
   | Readiness | `ready.ai-bounded` | Every AI call has a rate limit, a budget and an off switch, and ships switched off |
   | Readiness | `ready.config-documented` | Every property and role the app needs is documented |
   | Readiness | `ready.demo-honest` | Demo data is seeded; no real records |
   | Readiness | `ready.gate-clear` | Zero open blockers for the milestone's gate (the open gated issues counted in step 1) |

5. **Show the arithmetic.** Pass = 1; fail and unverified = 0, and
   unverified is shown as such. Dimension score = round(100 × passes ÷ 6),
   written out, for example `Code quality: 4 of 6 → 100 × 4 ÷ 6 = 67`.
   Computed score = the mean of the three dimension scores, rounded.
6. **Apply release-blocker caps**, by criterion id, after the mean. List
   every blocker with its evidence and cap:
   - **Cap 49:** `code.build` fail or unverified; `code.tests` fail or
     unverified (no test script means no evidence of tests, which must never
     score better than failing tests); `code.secrets` fail.
   - **Cap 74:** `design.signed` fail (including a missing record),
     `design.terms-tested` fail, `code.oob` fail or `ready.ai-bounded` fail;
     `ready.install` not pass at a milestone whose gate is install or later.

   Final score = min(computed score, lowest cap). Bands: 90–100 ready to ship
   the gate; 75–89 ready with named fixes; 50–74 not ready (blocked); 0–49
   broken. A cap can't be averaged away, and no strength elsewhere lifts it.
7. **Write the forecast.** Say what the score would be if the remediation
   below were done, which caps it releases, and which caps it leaves (and why).
   Show that arithmetic too.
8. **Propose one remediation epic** as a `plan.json` (same schema as
   build-plan): one epic, and exactly one story per failed or unverified
   criterion, so never more than 18. The per-term or per-row detail (for
   example which terms have no test) goes in that story's `body`, never in
   stories of its own. Each story names a gate (use the milestone objects with their
   **existing titles exactly**) or `register`, with priority by gate distance,
   `doneWhen` as the criterion's pass condition, and `honestLimit`. Keys are
   deterministic so a re-grade updates instead of duplicating: epic
   `grade.<gate>` and stories `grade.<gate>.<criterion id>` (for example
   `grade.install.design.terms-tested`), where `<gate>` is
   the milestone's gate name (never its title). Keys use only letters, digits
   and `_ . -`. Write it in the workspace, at
   `"$(git rev-parse --show-toplevel)/../plan-grade.json"` (next to the repo, never in it), and run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "$(git rev-parse --show-toplevel)/../plan-grade.json" --check`.
9. **Write `GRADE.md` now**, at the repo root (sections under Output), with
    Remediation marked "proposed, not filed". If `.gitignore` has no
    `!/GRADE.md` line, append it at the end. Don't commit. Tell the person to
    commit `.gitignore` and `GRADE.md` together on a branch, never on main.
10. **Stop for approval.** Show the remediation preview table and end your
    turn. On "approve", ask: "Dry run first (recommended), or apply now?" If
    dry run: run
    `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "$(git rev-parse --show-toplevel)/../plan-grade.json" --dry-run --reopen`,
    show the count of writes, and stop for "apply".
11. **Only after "apply"** (or "apply now"), run
    `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "$(git rev-parse --show-toplevel)/../plan-grade.json" --apply --reopen --backlog "$(git rev-parse --show-toplevel)/BACKLOG.md"`.
    `--reopen` is there so that a criterion that regresses reopens its earlier
    issue instead of hiding in a closed one. File only through the filer; it also rewrites `BACKLOG.md` from the open
    issues. After a successful apply, update only the Remediation section of
    `GRADE.md` with the issue numbers.

## Output

`GRADE.md` at the repo root, dated, naming the milestone and the commit graded
(`git rev-parse --short HEAD`). Sections, in this order:

1. **Checks run** — table: check · exact command · exit status · evidence
   (the last lines of output). Recorded output never contains an instance
   host or URL. Write `<instance>` and name the alias.
2. **Rubric** — table: dimension · criterion id · result (pass / fail /
   unverified) · evidence. Exactly 18 rows, six per dimension, in the order
   of step 4. `design.terms-tested` and `design.gates-evidenced` show
   `n of m` and list what is missing; every unverified row says why.
3. **Scores** — the arithmetic per dimension, then the computed score.
4. **Caps applied** — table: criterion id · evidence · cap. Then the final
   score, its band, and which cap set it.
5. **Forecast** — score if the remediation is done, caps released, caps left.
6. **Remediation** — the epic and its stories (one per failed or unverified
   criterion): "proposed, not filed", or, after apply, the issue numbers.

The remediation plan is `"$(git rev-parse --show-toplevel)/../plan-grade.json"`:
in the workspace, next to the repo, never committed.

## Rules you can't break

- Grades run at milestones. A grade before the milestone is reached is only
  a preview, and is headed that way.
- Run the build, tests and lint yourself before judging. The verdict is the
  exit status the shell tool reports on the plain command; the output is
  evidence, never the verdict. No visible status means unverified, and so
  does exit 0 with output that reports an error: quote the contradiction,
  never call it a pass.
- Score exactly the 18 criteria of step 4, six per dimension. Per-term checks
  are coverage inside a criterion, never criteria of their own.
- Never run `now-sdk auth --list`. Ask for the alias by name before
  `now-sdk install`. Always use `--auth <alias>`, never `--alias`.
- Never claim a check that wasn't run. Not run means unverified, and
  unverified scores 0.
- Show every sum. A cap applies after averaging and is never averaged away.
- Always write a forecast.
- Remediation is one epic with one story per failed or unverified criterion
  (at most 18), proposed as a `plan.json`, filed only on approval and only
  through `file-plan.mjs`. Never call `gh` to create issues.
- Never write secrets, credentials or instance hostnames into `GRADE.md`.

## Hand-off

"Next: work the remediation stories from `BACKLOG.md` by gate distance, then
grade again at the next milestone." At the last milestone before handoff, run
`/prove-it:handoff`. It reads the repo and the design records, not this grade.
