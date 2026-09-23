# <App name> — session protocol

A ServiceNow scoped app built with now-sdk (Fluent). This file tells Claude how
every session runs. Edit the project facts; keep the rules.

## Project facts

- Scope: `<x_scope>`
- Instance alias: `<alias>` (set with `now-sdk auth --add <instance> --alias <alias>`)
- Build: `now-sdk build`, then deploy with `now-sdk install --auth <alias>`.
  Always pass `--auth` explicitly so you cannot deploy to the wrong instance.
- Design records: `docs/DESIGN-<Feature>.md`. Backlog: `BACKLOG.md`. Session state: `SESSION-NOTE.md`.

## Session open

"Read BACKLOG.md and SESSION-NOTE.md. Re-check the live state of any blocker
they mention (never from memory). Tell me the top three items by gate distance."

## Session close

"Update SESSION-NOTE.md: what's proven, what's open, the exact next step, the
top three next items."

Commit it as the last commit on the open story branch. Between stories, commit
it as the first commit of the next story's branch. Never commit it alone to main.

## Ship ritual

`ship it` = push the branch, open the PR, run `/code-review`, fix findings once,
merge on green, delete the branch. No step-by-step questions.

## Backlog discipline

- Every issue names a gate (`merge`, `install`, `demo`, `handoff`, `publish`) or is `register`.
- Priority is gate distance only: p0 = current gate, p1 = next, p2 = further.
- Nothing is picked "because it's quick".
- The next gate is the earliest gate, in the order merge → install → demo →
  handoff → publish, that still has open issues.
- Blockers-to-gate is the number of open issues labelled with the next gate,
  not counting `register` issues.
- Blockers-to-gate flat for a week → stop filing, start closing.
- Audits and grades run at milestones only.

## Contract

Nothing new is built without a signed design record. A new ask re-enters at the
design step: `/prove-it:design-challenge amend`.

## Brakes

- **Error brake:** three failed attempts on one approach → stop. Give a
  root-cause diagnosis and options, then wait.
- **Two-strike tripwire:** the second time a friction appears, name it, then
  choose: fix it now, file it against a gate, or add it to the register.
- **Pre-build restatement:** before building anything new, restate it in five
  bullets or fewer and get confirmation.

## Learning checkpoints

At decisions that shape the design, state: decision · why · principle ·
recommendation + trade-off. On major ones, ask me to answer first (answer
before you read the answer).

## Honesty

Say what's real, what's staged and what's not built. Never claim a check that
wasn't run.
