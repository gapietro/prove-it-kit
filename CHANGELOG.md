# Changelog

## 0.2.1 — 2026-11-20

- `as-built` page: bold and italic now work around inline code. A phrase such
  as `**Not checked: the user \`hr.router\`**` kept its asterisks on the
  page (#23). The Markdown was always right: build the page again to fix a
  page already made.
- Tests only: the two tests that need a browser to draw ask once more when
  the browser gave no page in time, which failed CI once on a slow start
  (#25). A diagram that can't be drawn still fails at once. The builder is
  unchanged: for it, a slow browser is "drawing not checked", never a failure.
- Plugin and marketplace versions are 0.2.1.

**To update an installed kit:** `/plugin marketplace update prove-it`, then
`/plugin update prove-it@prove-it`, and restart Claude Code. If you installed
from a pinned tag, add the marketplace again at the new tag:
`/plugin marketplace add <owner>/prove-it-kit#v0.2.1`.

## 0.2.0 — 2026-11-20

A sixth skill, `as-built`: it documents what was actually built, from the
app's code and its instance (#21).

- `/prove-it:as-built [alias]` writes the light document: exactly two
  diagrams, the pieces and one record's path, each followed by a sources
  table; up to five differences from the design; and what was not verified.
- `/prove-it:as-built full [alias]` writes the turnover document, in nine
  fixed sections: summary, context, the pieces, the agent (workflow and
  trigger, role and instructions quoted word for word, every tool, the
  guardrails, what reaches the model), data flows (one record's path, the
  other paths, who writes and reads each table, a run's life, access across
  the scope boundary), configuration, as built against as designed, not
  verified, and where next.
- Both write `docs/AS-BUILT.md` and build `docs/AS-BUILT.html` from it. The
  page holds its own diagram library and fetches nothing, so it opens offline
  and can be sent on its own.
- It reads the instance through `now-sdk query --auth <alias>` only, and
  changes nothing there. Each piece is Found, Not found or Not checked. A
  failed query is Not checked. With `none` for the alias it documents from
  the code alone.
- Every box, step and state has a row that names a file under `src/` or a
  table and record on the instance. What it couldn't confirm is listed under
  Not verified and never drawn as fact.
- `skills/as-built/build-page.mjs`, with no dependencies: it checks the
  document's fixed shape; refuses, with the line, raw HTML, images, rules,
  any link that isn't a plain relative path, a diagram that holds a
  directive, a URL or HTML, and any instance hostname, however it is
  dressed up; writes the page, whose Content-Security-Policy allows its own
  two scripts by hash and no fetch at all;
  and, where the computer has Chrome, Edge or Chromium, opens the page
  headless to check that every diagram draws. `--check` passes only when the
  page was built from the document as it stands.
- `skills/as-built/vendor/`: mermaid 12.3.0 (MIT), written into each page.
- `templates/AS-BUILT.md`: the fixed sections and what goes in each.
- `grade`: notes the as-built document in Checks run as
  `as-built (not scored)`. It is not a criterion: no score, cap or
  remediation story changes.
- `handoff verdict`: lists the as-built document under What the receiving
  team receives, by name only. The verdict doesn't depend on it, and
  `diagnose` still reads only `RUNBOOK.md`.
- Plugin and marketplace versions are 0.2.0.

**To update an installed kit:** in Claude Code, run
`/plugin marketplace update prove-it`, then `/plugin update prove-it@prove-it`,
and restart Claude Code. If you installed from a pinned tag, add the
marketplace again at the new tag: `/plugin marketplace add <owner>/prove-it-kit#v0.2.0`.
The pre-commit guard is unchanged: there is no need to copy it again.

## 0.1.4 — 2026-10-14

The person's confirmation of the read-back signs the design record. There is
no separate sign-off step (#19).

- `design-challenge`: after a clean "Confirmed." it asks one question, "What
  name and role go on the approval?", and writes §9 Approval with that name
  and role, the date, and the name again as the signature. It used to leave
  §9 blank and say "A person signs this; I don't."
- `design-challenge amend`: after the confirmation it asks the same question
  and fills Signed by on each new drift row. Older drift rows with Signed by
  blank, and a §9 row with an empty cell, are read back in the same list and
  filled too. "Nothing new" is a valid answer, so a record left unsigned by
  an earlier version is signed by running `amend` and confirming it.
- Unchanged: a confirmation with conditions, or a waived read-back, still
  signs nothing. The name comes only from the person's answer, never from
  git or GitHub. The signing rule in `templates/DESIGN.md` §9 (a complete
  row, every drift row filled, the placeholder list) is word for word the
  same, so `build-plan` and `grade` check it exactly as before.
- `templates/DESIGN.md` §9 and §10 say who fills the cells and when.
- `build-plan`: an unsigned record is still refused. The message now points
  to `/prove-it:design-challenge amend` instead of "A person signs this".
- Plugin and marketplace versions are 0.1.4.

## 0.1.3 — 2026-09-26

Licenses the kit under MIT and makes the handoff wording neutral. No change to
skill steps, questions, file names, commands, the guard or its tests.

- `LICENSE`: MIT. `package.json`, `.claude-plugin/plugin.json` and the plugin
  entry in `.claude-plugin/marketplace.json` declare `"license": "MIT"`. README
  has a License section, and README, CHANGELOG and the design notes describe
  the repo as public (#16).
- `templates/HANDOFF.md`: the Verdict section says the record goes to "the
  receiving team", and `What PS receives` is now `What the receiving team
  receives` (#17).
- `handoff`: step 4 and the READY closing message name the renamed section
  (#17). A `HANDOFF.md` written by an earlier version keeps the old heading
  until handoff rewrites it.
- Plugin and marketplace versions are 0.1.3.

## 0.1.2 — 2026-09-23

Tells the builder how grade counts a term as tested. Fixes #14.

- `templates/CLAUDE.md` has a Tests section: every test names the design term
  it proves, as a whole word at the start of its name (`C3: …`, or
  `<Feature> C3: …` with several records), because grade's
  `design.terms-tested` counts a term only when its id appears as a whole word
  in a test's name or in a test file (T1).
- `build-plan`: every story that implements a term has a `doneWhen` asking
  for tests that name its term ids; stories that only rule on an `OPEN` term
  are exempt (P6).
- `build-plan`: the preview lists any term that no story's `doneWhen` asks
  tests to name, next to the terms and pass criteria with no story.
- `build-plan`: an OPEN term with only a ruling story is listed in the preview
  as "pending ruling — no test yet", never hidden behind "none missing"; its
  ruling story's `doneWhen` requires a build story whose tests name the term,
  if the term is kept (found by the 0.1.2 acceptance run, C85).
- Acceptance: P6 passes on a headless build-plan run (dry run only); T1 passes
  from the file; P1 and P4 re-checked.
- README: the grade rows say up front how a term counts as tested; the
  build-plan row says term stories ask for term-named tests.

## 0.1.1 — 2026-09-23

Acceptance notes: B6 passes on a question count (each read-back counts as its turn's one question); two turns still join close asks. B7 passes on the final file after one self-corrected write. Both are tracked in #3.

Fixes the skill-quality gaps the 0.1.0 acceptance run found. Fixes #8.

- `design-challenge` ends every turn with exactly one question, even when
  asked for all of them at once (B6).
- `design-challenge` reads every term back, numbered, and asks "Confirm these
  N terms, or correct any." before writing; the record holds exactly the
  confirmed list. Splits, merges and additions are proposed in the read-back,
  never made silently. A confirmation with conditions ("yes, but split…") or
  a waived read-back is not a confirmation. `amend` reads back added or
  changed terms the same way (B7).
- `grade` scores a fixed 18-criterion rubric, six per dimension, the same for
  every project; per-term checks are `n of m` coverage inside
  `design.terms-tested` and `design.gates-evidenced`. Caps are set by
  criterion id: `code.tests` and `code.secrets` unverified now cap at 49, and the 74 cap fires
  on fail or unverified for `design.signed`, `design.terms-tested`,
  `design.gates-evidenced`, `code.oob` and `ready.ai-bounded`, because a
  safeguard you can't show counts as missing. An app with no AI call passes
  `ready.ai-bounded` (D7).
- `grade` judges build, tests and lint by one verdict rule on the plain
  command: a pass needs exit 0 and no error reported by the tool itself (an
  `ERROR:` line from now-sdk, `npm ERR!` or `npm error`, a failed-test count above zero).
  Exit 0 with such an error is unverified, never a pass; a non-zero exit is a
  fail, except exit 127 (tool missing), which is unverified; no visible
  status is unverified. The build uses the `build` script if there is one,
  else `now-sdk build` (D8).
- `grade` rubric rows pass only with evidence of the kind each names (for
  example file:line lists for `design.drift-ruled` and `code.oob`, a cited
  non-admin check for `ready.real-user`); without it they are unverified.
  The secrets scan always runs the guard's patterns and `.prove-it/patterns`
  (ignoring case) over the tracked tree and history, plus gitleaks over
  history if installed; an invalid pattern or any grep error makes it
  unverified, never clean. It never prints matched text.
- `grade` never runs `now-sdk auth --list`; it asks for the install alias by
  name (D9).
- `grade` remediation proposes one story per failed or unverified criterion,
  at most 18, with per-term detail in the story body (D10).
- `handoff` with no argument reads only its listed inputs, and never
  `GRADE.md` or `BACKLOG.md` (E6).
- `design-challenge` defines one question as one sentence ending in "?",
  about one thing, with no sub-questions (found by the 0.1.1 acceptance run,
  B6).
- Acceptance run 0.1.1 recorded in `tests/ACCEPTANCE.md`: 17 criteria run,
  17 pass, 0 fail; all seven new criteria pass.

## 0.1.0-rc.1 — 2026-09-23 (release candidate, private)

First version. Tagged `v0.1.0-rc.1`. Released while the repo was still private;
the skill-quality gaps in issue #8 were due before the series records.
Acceptance run: 21 pass, 0 fail, 6 unverified (the six need a
real app; see `tests/ACCEPTANCE.md`).

- Five skills: `consult`, `design-challenge` (with `amend`), `build-plan`,
  `grade` and `handoff` (with `plant`, `diagnose` and `verdict`).
- `skills/build-plan/file-plan.mjs`: validates a plan and files labels,
  milestones, epics and stories on GitHub through `gh`, idempotently by key,
  with `--check`, `--dry-run`, `--apply`, `--reopen` and `--backlog`; writes
  `BACKLOG.md` from the open issues.
- `hooks/pre-commit-guard.sh`: blocks files the allowlist doesn't admit and
  added lines that look like secrets; fails closed.
- Templates: `BRIEF.md`, `DESIGN.md`, `CLAUDE.md`, `gitignore.allowlist`,
  `RUNBOOK.md`, `HANDOFF.md`.
- Tests for the filer and the guard, a sample brief, and acceptance criteria
  for the skills (`tests/ACCEPTANCE.md`).
- `docs/SETUP-CHECKLIST.md`, this README, and CI running `npm test` on every
  push and pull request, on Node 22, 24 and 26.
- Requires Node ≥ 22; 20 reached end of life in April 2026.
- Guard installed in the kit's own repo.
- `handoff plant` writes the drill card even before the app is built, marking
  steps it can't make exact as VERIFY (found by the acceptance run, E3).
- A drill card whose "Planted by" is blank is a draft, not a drill: `plant`
  replaces it in place, and `verdict` lists it as never planted and ignores it.
- Acceptance run recorded in `tests/ACCEPTANCE.md`: 21 pass, 0 fail,
  6 unverified. The rows say "0.1.0 (unreleased)" because they were recorded
  before the release was named; they test exactly the content released as
  `0.1.0-rc.1`.
