---
name: grade
description: Use at a milestone of a now-sdk app repo to run the build and tests, score sound design, code quality and production readiness with the arithmetic shown, cap the score for release blockers, write GRADE.md at the repo root with a forecast, and propose one remediation epic as a plan.json filed only through file-plan.mjs.
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
  repo's `CLAUDE.md` Project facts for the scope and the instance alias.
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
2. **Run the build.** `now-sdk build`, or the repo's `build` script if
   `package.json` has one. Record the exact command, exit code and the last
   lines of output (errors in full).
3. **Run the tests.** If `package.json` has a `test` script, run it (`npm test`)
   and record the exact command, exit code and pass/fail counts. If there is no
   test script, record "tests: unverified (no test script)". Run a `lint`
   script the same way if one exists. A missing check is never a pass.
4. **Ask before installing.** Show `now-sdk auth --list` and the alias from
   `CLAUDE.md`, then ask: "Install to `<alias>` with
   `now-sdk install --auth <alias>`?" Wait for the answer. A yes counts only
   if it names the alias. If asked to skip, show the install question anyway
   and wait for the literal reply; a waiver is not a confirmation. Only on a
   yes, run exactly that. Never use `--alias` on install: it is silently
   ignored and deploys to the default alias. If the answer is no, install and
   every check that needs the instance are "unverified (not installed)".
   When you record output from `now-sdk install` or `now-sdk auth`, replace
   the instance host with `<instance>` and leave out URLs. Record the alias,
   never the host.
5. **Build the criteria list** for each dimension. Each criterion is pass,
   fail or unverified, with its evidence (a command and its result, a file and
   line, or an issue number). Each has a fixed id, shown in brackets. `<F>` is
   the record's feature name, `<n>` the term number, and `<gate>`, `<table>`,
   `<call>` are names from the record. For `<table>` and `<call>`, replace any
   character outside letters, digits and `_ . -` with `-`. Always use these
   ids, so the same finding gets the same id at every grade.
   - **No design record:** if the repo has no `docs/DESIGN-*.md`, record
     [`design.missing`] as fail and tell the person to move the record in from
     the workspace.
   - **Sound design:** every design record is signed [`design.<F>.signed`].
     Apply the signing rule in `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md` §9
     exactly as written there. Every term has code that implements it
     [`design.<F>.C<n>.built`]. Every table in §4 has exactly one owner of
     writes in the code [`design.<F>.<table>.owner`]. Every failure mode in §5
     has handling in the code [`design.<F>.fail<row>`].
   - **Code quality:** the build passes [`code.build`]; the tests pass
     [`code.tests`]; the lint passes, if there is one [`code.lint`]; every term
     has an automated test [`code.<F>.C<n>.test`]; no out-of-box workflow,
     state model or state values are modified [`code.oob`].
   - **Production readiness:** every §7 pass criterion for gates up to this
     milestone is met, with evidence [`ready.<F>.<gate>.<row>`]; the install
     succeeds [`ready.install`]; every AI call has a rate limit, a budget and
     an off switch [`ready.ai.<call>`]; the roles and ACLs match §6
     [`ready.<F>.access`]; no secrets, credentials or instance hostnames are
     in the repo [`ready.secrets`].
6. **Score, showing the arithmetic.** For each dimension,
   score = round(100 × passed ÷ total). Unverified criteria count as 0 and
   **stay in the total**; never drop them to raise the score. Write each one
   out, for example `Code quality: 3 passed of 5 → 100 × 3 ÷ 5 = 60`.
   Computed score = the mean of the three, rounded.
7. **Apply release-blocker caps**, by criterion id. List every blocker with
   its evidence and cap:
   - `code.build` fail or unverified, `code.tests` fail, or `ready.secrets`
     fail → cap 49;
   - `ready.install` not pass at a milestone whose gate is install or later;
     or any `design.missing`, `design.<F>.signed`, `code.<F>.C<n>.test`,
     `ready.ai.<call>`, `code.oob` or `ready.<F>.<gate>.<row>` fail → cap 74.
   Final score = min(computed score, lowest cap). Bands: 90–100 ready to ship
   the gate; 75–89 ready with named fixes; 50–74 not ready (blocked); 0–49
   broken. A cap can't be averaged away, and no strength elsewhere lifts it.
8. **Write the forecast.** Say what the score would be if the remediation
   below were done, which caps it releases, and which caps it leaves (and why).
   Show that arithmetic too.
9. **Propose one remediation epic** as a `plan.json` (same schema as
   build-plan): one epic, one story per failed or unverified criterion that
   needs work. Each story names a gate (use the milestone objects with their
   **existing titles exactly**) or `register`, with priority by gate distance,
   `doneWhen` as the criterion's check, and `honestLimit`. Keys are
   deterministic so a re-grade updates instead of duplicating: epic
   `grade.<gate>` and stories `grade.<gate>.<criterion id>`, where `<gate>` is
   the milestone's gate name (never its title). Keys use only letters, digits
   and `_ . -`. Write it in the workspace (`../plan-grade.json`), never in the
   repo, and run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --check`.
10. **Write `GRADE.md` now**, at the repo root (sections under Output), with
    Remediation marked "proposed, not filed". If `.gitignore` has no
    `!/GRADE.md` line, append it at the end. Don't commit. Tell the person to
    commit `.gitignore` and `GRADE.md` together on a branch, never on main.
11. **Stop for approval.** Show the remediation preview table and end your
    turn. On "approve", ask: "Dry run first (recommended), or apply now?" If
    dry run: run
    `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --dry-run`,
    show the count of writes, and stop for "apply".
12. **Only after "apply"** (or "apply now"), run
    `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --apply --backlog "$(git rev-parse --show-toplevel)/BACKLOG.md"`.
    File only through the filer; it also rewrites `BACKLOG.md` from the open
    issues. After a successful apply, update only the Remediation section of
    `GRADE.md` with the issue numbers.

## Output

`GRADE.md` at the repo root, dated, naming the milestone and the commit graded
(`git rev-parse --short HEAD`). Sections, in this order:

1. **Checks run** — table: check · exact command · result (exit code, counts).
   Recorded output never contains an instance host or URL. Write `<instance>`
   and name the alias.
2. **Unverified** — every check not run, and why.
3. **Scores** — per dimension: the criteria, each with its id (pass / fail /
   unverified, with evidence), and the arithmetic; then the computed score.
4. **Release blockers and caps** — table: criterion id · evidence · cap. Then
   the final score, its band, and which cap set it.
5. **Forecast** — score if the remediation is done, caps released, caps left.
6. **Remediation** — the epic and its stories: "proposed, not filed", or,
   after apply, the issue numbers.

## Rules you can't break

- Grades run at milestones. A grade before the milestone is reached is only
  a preview, and is headed that way.
- Run the build and tests yourself before judging. Report exact results.
- Always ask before `now-sdk install`. Always use `--auth <alias>`, never
  `--alias`.
- Never claim a check that wasn't run. Not run means unverified, and
  unverified scores 0.
- Show every sum. A cap applies after averaging and is never averaged away.
- Always write a forecast.
- Remediation is one epic, proposed as a `plan.json`, filed only on approval
  and only through `file-plan.mjs`. Never call `gh` to create issues.
- Never write secrets, credentials or instance hostnames into `GRADE.md`.

## Hand-off

"Next: work the remediation stories from `BACKLOG.md` by gate distance, then
grade again at the next milestone." At the last milestone before handoff, run
`/prove-it:handoff`. It reads the repo and the design records, not this grade.
