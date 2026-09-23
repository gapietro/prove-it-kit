# prove-it kit — design

*A Claude Code plugin that runs the five-stage process — consult, contract, build
plan, grade, handoff — for building ServiceNow apps with AI, behind inspections.*

- **Status:** design validated 2026-09-23 (brainstorming). Not started.
- **Repo:** `gapietro/prove-it-kit`, **private until employer approval**, then public.
- **Consumers:** the YouTube series *Build it with AI, prove it works*
  (production repo `gapietro/change-risk-series`), whose scripts fix this kit's
  interface; later, any ServiceNow developer.
- **Sources:** the author's `PRINCIPLES.md`, the Agentic Development deck, the
  series design and production bible. **Clean-room:** written from those only;
  no private plugin's skill text is read or copied.

## 1. Constraints (confirmed at the pre-build gate)

1. A Claude Code plugin `prove-it`: five skills, templates, a pre-commit guard,
   a starter `CLAUDE.md`, `docs/SETUP-CHECKLIST.md`.
2. ServiceNow-aware (script vs Now Assist skill vs agent, now-sdk, instance
   checks), not tied to any private tooling or customer.
3. The interface is fixed by the series scripts: command names, file names and
   locations. **Done means every kit-related VERIFY in the scripts is answered
   by the README** (§6).
4. Handoff check 3 plants a failure in one session and diagnoses it in a
   separate fresh session that reads only the runbook.
5. Tested on a **different** sample brief (a knowledge-gap finder). The change
   risk brief is never used by or stored in this repo.

## 2. Approach

**Instructions plus small scripts.** Skills are prompt files. The two jobs that
must be exact get a small, tested script: build-plan's GitHub filing and the
pre-commit guard. Scripts are Node ≥ 18 with **zero dependencies** (viewers
already have Node for now-sdk), tested with `node:test`; the guard is POSIX `sh`.

## 3. Structure

```
prove-it-kit/
├── .claude-plugin/
│   ├── plugin.json              name "prove-it"
│   └── marketplace.json         marketplace "prove-it", plugin source "./"
├── skills/
│   ├── consult/SKILL.md
│   ├── design-challenge/SKILL.md
│   ├── build-plan/SKILL.md
│   │   └── file-plan.mjs
│   ├── grade/SKILL.md
│   └── handoff/SKILL.md
├── templates/
│   ├── BRIEF.md  DESIGN.md  RUNBOOK.md  HANDOFF.md
│   ├── CLAUDE.md                starter session protocol
│   └── gitignore.allowlist
├── hooks/pre-commit-guard.sh
├── docs/SETUP-CHECKLIST.md
├── tests/
│   ├── file-plan.test.mjs
│   ├── guard.test.sh
│   ├── ACCEPTANCE.md            skill pass criteria + dated results
│   └── fixtures/sample-brief.md knowledge-gap finder
├── .github/workflows/test.yml   node + guard tests on every push
├── package.json                 "test" script only; no dependencies
└── README.md  LICENSE  CHANGELOG.md
```

Install for users:
```
/plugin marketplace add <owner>/prove-it-kit
/plugin install prove-it@prove-it
```

**The chain.** brief → `CONSULT.md` → `docs/DESIGN-<Feature>.md` → GitHub board +
`BACKLOG.md` → `GRADE.md` → `RUNBOOK.md` + `HANDOFF.md`. Each skill reads the
previous file; the templates fix each file's shape so the next skill can rely
on it (the handoff format is pinned in one place: `templates/DESIGN.md`).

## 4. The skills

| Command | Reads | Writes | Behaviour |
|---|---|---|---|
| `/prove-it:consult [brief]` | brief (default: the one file in `brief/`) | `CONSULT.md`, workspace root | Restates constraints in ≤ 5 bullets and **waits for confirmation** (it may ask clarifying questions here). Then: every capability → plain code / Now Assist skill / agent with a reason (agent only where orchestration can't be predetermined); tables, roles, write-ownership, scope; cost and how it's bounded; readiness per requirement (ready / conditional / not ready); foundation work list |
| `/prove-it:design-challenge [consult]` | `CONSULT.md` (default `./CONSULT.md`) | `docs/DESIGN-<Feature>.md` from `templates/DESIGN.md` | The human designs; the skill challenges failure modes, security, cost, boundaries. Numbered terms C1…; gates with pass criteria; rejected alternatives with reasons; approval table **left for a person to sign**; drift log. **`amend`** mode adds a term or drift entry to an existing record and marks it for re-signing |
| `/prove-it:build-plan [design]` | a **signed** design record | labels, milestones, issues; `BACKLOG.md` | Drafts `plan.json`; shows a preview; **waits for approval**; runs `file-plan.mjs`. Milestones are gate boundaries, not calendar. Refuses an unsigned design |
| `/prove-it:grade [milestone]` | repo, board | `GRADE.md`, repo root | Runs build and tests itself; **asks before `now-sdk install`**. Scores design, code quality, production readiness; release blockers cap the score; anything not run is reported unverified; always writes a **forecast** (score if the plan is done, which cap releases). Findings → one remediation epic, **proposed** as a `plan.json` and filed on approval **through `file-plan.mjs`** (so every remediation story names a gate or `register`, and re-running grade files nothing twice) |
| `/prove-it:handoff` | repo, design records | `RUNBOOK.md`, `HANDOFF.md` draft | Check 1: every shipped artifact traces to a design reason; gaps listed. Check 2: runbook (install, traps, recovery, symptom → cause index using only platform UI and the app's own lists and logs) |
| `/prove-it:handoff plant` | repo | a drill card **outside the repo** (`../drill-card.md`) | Proposes one realistic failure and its restore steps; stops |
| `/prove-it:handoff diagnose` | **only** `RUNBOOK.md` + the symptom | diagnosis notes | Must run in a **fresh session**; refuses if it detects a drill card or the design records in its context |
| `/prove-it:handoff verdict` | checks 1–3 results | final `HANDOFF.md` | READY or NOT READY with named open items and owners by role |

**Rules the skills can't break:** consult and design-challenge write no code;
design-challenge never fills a signature; build-plan never files a story
without a gate or `register`, never files without approval, never files from an
unsigned design; grade never averages a cap away and never claims a check it
didn't run; handoff never softens a verdict, and `diagnose` never sees the card.

## 5. The exact parts

### `file-plan.mjs`
- **Input:** `plan.json` — `milestones[]`, `epics[]`, `stories[]`; each story has
  `key`, `title`, `epic`, `milestone`, `gate` (`merge|install|demo|handoff|publish`)
  **or** `register: true`, `priority` (`p0|p1|p2`), `size` (`s|m|l`),
  `dependsOn[]`, `doneWhen`, `honestLimit`.
- **Validation (before any GitHub call):** gate xor register; register stories
  have no milestone; `doneWhen` and `honestLimit` present; every reference
  resolves; no dependency cycles.
- **Modes:** `--check` (validate, summarise), `--dry-run` (print every `gh`
  call), `--apply` (file).
- **Labels:** `gate:<gate>`, `register`, `p0`–`p2`, `size:s|m|l`, `epic`.
- **Idempotent:** each issue body carries `<!-- prove-it:key=<KEY> -->`; re-runs
  update instead of duplicating. Milestones matched by title, labels created if
  missing.
- **After filing:** replaces `{{KEY}}` references with issue numbers, reads every
  issue back to confirm labels, writes `BACKLOG.md`.
- **Next gate** = the earliest gate, in the order merge → install → demo →
  handoff → publish, that still has open issues. **Blockers-to-gate** = open
  issues labelled `gate:<next gate>`, excluding `register`. `BACKLOG.md` shows
  both at the top; the session protocol uses the same definition.
- **Safety:** `gh` is called with `execFile` argument arrays, never a shell
  string.

### `pre-commit-guard.sh`
- Blocks staged files the allowlist doesn't admit (catches `git add -f`):
  `git check-ignore -q --no-index` on each staged path.
- Blocks added lines matching secret shapes: common token formats, private key
  headers, `https://user:pass@` URLs, and the test marker
  `FAKE_TOKEN=do-not-use-`.
- Optional local patterns from `.prove-it/patterns` (git-ignored).
- Message leads with **revoke or rotate first**, then remove.
- Install (works in worktrees and honours `core.hooksPath`):
  `cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit" && chmod +x "$(git rev-parse --git-path hooks)/pre-commit"`.
- **Never matches itself:** its patterns are written so their own text can't
  match (e.g. `FAKE_TOKEN[=]do-not-use-`), and every test secret is built at
  runtime from octal escapes, so no literal secret shape is ever committed to
  this repo — the guard can guard the repo it ships in. Docs refer to "the
  FAKE_TOKEN test marker" rather than spelling it out.

### `templates/gitignore.allowlist`
Root-level deny (`/*`), then one `!/path` line per admitted file or folder; an
admitted folder's contents are tracked. Comment block explains adding a file
by name.

### `templates/CLAUDE.md` (starter session protocol)
Session open and close prompts and `SESSION-NOTE.md`; the ship ritual
(`ship it` = push, PR, `/code-review`, fix once, merge on green, delete
branch); backlog discipline (every item names a gate or `register`; priority is
gate distance; flat for a week → stop filing); error brake; two-strike
tripwire; pre-build restatement; learning checkpoints (*answer before you read
the answer*); re-entry at Contract for new asks.

## 6. Answers to the series' VERIFY flags

| Script asks | Kit answer |
|---|---|
| `/prove-it:consult` argument form, output location, asks first? | Optional brief path; `CONSULT.md` in the workspace root; restates and waits for confirmation first |
| `/prove-it:design-challenge` input | Optional consult path, default `./CONSULT.md`; `amend` mode for changes |
| Template file names | `templates/gitignore.allowlist`, `templates/CLAUDE.md`, `hooks/pre-commit-guard.sh` |
| Guard install line | The `cp … "$(git rev-parse --git-path hooks)/pre-commit"` line above |
| How the allowlist re-admits a folder | `!/folder/` after `/*` |
| Label names | `gate:*`, `register`, `p0`–`p2`, `size:*`, `epic` |
| How blockers are counted | Open `gate:<next gate>` issues, excluding `register`; the next gate is the earliest gate with open issues |
| `/prove-it:grade` input; installs itself?; forecast? | Optional milestone; asks before installing; always writes a forecast |
| `/prove-it:handoff` check 3 | Split into `plant` and `diagnose` (fresh session), then `verdict` |
| `docs/SETUP-CHECKLIST.md` | Ships in the kit |

## 7. Testing

1. **Scripts:** `node:test` with a fake `gh` on `PATH` (logs calls): a story
   without a gate is rejected; register-with-milestone rejected; cycles
   rejected; a second `--apply` files nothing; keys resolve to numbers.
   `guard.test.sh` in a temp repo: each secret shape blocked; a force-added
   non-allowlisted file blocked; a clean commit passes; the message contains
   "revoke".
2. **Sabotage the tests once:** run the guard tests against a guard that always
   exits 0, and the filer tests against a validator that accepts everything;
   both suites must fail. Recorded in `tests/ACCEPTANCE.md`.
3. **Skills:** a dry run of the whole chain against
   `tests/fixtures/sample-brief.md` in a scratch workspace, scored against the
   written pass criteria in `tests/ACCEPTANCE.md` (e.g. consult waits for
   confirmation; design-challenge leaves the signature blank; build-plan refuses
   an unsigned design; grade reports unrun checks as unverified; `diagnose`
   refuses when it can see a drill card). Results dated.
   **Honest limit:** grade and handoff are only fully proven on a real app; the
   series is that proof, and the README says so.
4. **The kit follows its own rules:** branches and PRs with review, its own
   guard installed in its own repo, tests on every push.

## 8. Out of scope

Overnight mode, the retro and the learning ledger (the series shows overnight
mode by hand). Any private tooling. Publishing the repo before employer
approval. The change risk brief or anything from the series' expected answers.
