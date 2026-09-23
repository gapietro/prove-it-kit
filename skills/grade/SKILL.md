---
name: grade
description: Use at a milestone of a now-sdk app repo to run the build, tests and lint (a pass needs exit 0 and no tool-reported error), score a fixed 18-criterion rubric (Design, Code quality, Readiness, six each) with the arithmetic shown, cap the score for release blockers, write GRADE.md at the repo root with a forecast, and propose one remediation epic as a plan.json filed only through file-plan.mjs.
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
2. **Run the build, tests and lint, and judge each by the verdict rule.**
   Run each as the plain command on its own: no `;`, `&&`, pipes, redirects
   or `echo $?`.
   - Build: `npm run build` if `package.json` has a `build` script, else
     `now-sdk build` → `code.build`.
   - Tests: `npm test`, if `package.json` has a `test` script → `code.tests`.
     With no test script, `code.tests` is unverified (no test script).
   - Lint: `npm run lint`, if `package.json` has a `lint` script →
     `code.lint`. With none, `code.lint` is unverified (no lint script).

   **Verdict rule.** The shell tool marks a failed command with its non-zero
   exit code (for example `Exit code 1`); a result with no error marker is
   exit 0. A pass needs exit 0 and no error reported by the tool itself: an
   `ERROR:` line from now-sdk, `npm ERR!`, or a failed-test count above zero.
   Text printed by passing tests (logged errors, warnings) doesn't count.
   Exit 0 with a tool-reported error is **unverified**, with the
   contradiction quoted as evidence, never a pass. A non-zero exit is always a
   fail, whatever the output says, except exit 127 ("command not found"),
   which means the check didn't run: unverified (tool missing), never fail. No
   visible status (the command was denied, timed out or ran in the
   background) is unverified. Record the command, the exit status and the
   last lines of output (errors in full) as evidence. A missing check is
   never a pass.
3. **Ask before installing.** Never run `now-sdk auth --list` (it prints
   instance hosts). Ask: "Which alias should I install to? Type the alias
   name." and wait. A yes counts only if it names the alias. If asked to skip,
   ask the question anyway and wait for the literal reply; a waiver is not a
   confirmation. Only when the reply names an alias, run exactly
   `now-sdk install --auth <alias>` and judge it by the verdict rule in step 2.
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

   A pass needs evidence of the kind the row names. Without it the row is
   unverified, never pass.

   | Dimension | Criterion id | Passes when |
   |---|---|---|
   | Design | `design.signed` | At least one design record exists in the repo, and every design record is signed: apply the signing rule in `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md` §9 exactly as written there. No record in the repo is a fail, with the reason "missing" (tell the person to move the record in from the workspace) |
   | Design | `design.terms-tested` | 100% of terms are named by at least one test: the term id as a whole word (`C<n>`, or `<Feature> C<n>` when there are several records) in a test's name or in a test file; shown as `n of m`, listing the terms not named |
   | Design | `design.gates-evidenced` | 100% of §7 pass criteria for gates at or before the milestone have evidence: a check run in this grade, or a closed issue or PR recording the result, cited. Anything else counts as missing; `n of m`, listing what is missing |
   | Design | `design.failure-modes` | Every §5 failure mode has a handling term or test |
   | Design | `design.drift-ruled` | Every table, role, ACL, property and script include declared in `src/*.now.ts` appears in a design record (§3, §4 or §6) or in a signed §10 row. List each that doesn't, with file:line |
   | Design | `design.no-open` | No `OPEN` in §1–§8 of any design record |
   | Code quality | `code.build` | The build command (step 2) passes by the verdict rule |
   | Code quality | `code.tests` | `npm test` passes by the verdict rule |
   | Code quality | `code.lint` | `npm run lint` passes by the verdict rule (unverified if there is no lint script) |
   | Code quality | `code.oob` | List every declaration in `src/` whose table or target is outside the app's scope, with file:line. Pass only if the list is empty or every entry extends rather than modifies. No list → unverified |
   | Code quality | `code.logic-off-instance` | Name the logic modules, show they don't reference `Glide*` or `gs`, and show that `npm test` (exit 0) imports them; cite file:line |
   | Code quality | `code.secrets` | The tree and history scan clean, by the secrets scan below. Never print the matched text |
   | Readiness | `ready.install` | `now-sdk install --auth <alias>` succeeds (asked first, step 3) |
   | Readiness | `ready.real-user` | A cited test, issue or PR comment shows a check done as a non-admin role; otherwise unverified |
   | Readiness | `ready.ai-bounded` | Every AI call has a rate limit, a budget and an off switch, and ships switched off |
   | Readiness | `ready.config-documented` | Every property and role declared in `src/` is listed with its purpose in `README.md`, `CLAUDE.md` or `RUNBOOK.md`. The design record doesn't count |
   | Readiness | `ready.demo-honest` | Demo data is seeded; no real records |
   | Readiness | `ready.gate-clear` | Zero open blockers for the milestone's gate (the open gated issues counted in step 1) |

   **Secrets scan** (`code.secrets`). If gitleaks is installed, run
   `gitleaks git --redact` (older versions: `gitleaks detect --redact`) and
   judge it by the verdict rule. Otherwise take the patterns from the guard
   itself and write them to a temporary file outside the repo:
   `sed -n "/<<'PATTERNS'/,/^PATTERNS/p" ${CLAUDE_PLUGIN_ROOT}/hooks/pre-commit-guard.sh | sed '1d;$d'`,
   plus `.prove-it/patterns` if present, with comment and blank lines
   stripped. Then list file names only for the working tree
   (`git ls-files -z | xargs -0 grep -l -E -f <patterns>`) and a count of
   matching lines only for history (`git log -p | grep -c -E -f <patterns>`).
   Grep exit 1, or xargs exit 123, with no file names, and a history count of
   0, mean clean. Never print the matched text.

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
- Run the build, tests and lint yourself before judging, as plain commands.
  A pass needs exit 0 and no error reported by the tool itself (an `ERROR:`
  line from now-sdk, `npm ERR!`, or a failed-test count above zero); exit 0
  with such an error is unverified, never pass. A non-zero exit is always a
  fail, except exit 127 (tool missing), which is unverified. No visible
  status is unverified.
- A rubric row passes only with evidence of the kind it names. Without it,
  unverified.
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
`/prove-it:handoff`. It reads `src/` and the design records, not this grade.
