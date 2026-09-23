# prove-it

## What it is

A Claude Code plugin for building ServiceNow apps with AI, where every stage
has to prove itself before the next one starts. It has five stages. **Consult**
reviews a brief and decides, for each capability, whether it is plain code, a
Now Assist skill or an agent. **Design challenge** questions your design one
point at a time and writes it up as a design record that a person signs.
**Build plan** turns a signed record into milestones, epics and stories on
GitHub. **Grade** scores the build at each milestone, with the arithmetic
shown, and caps the score when something blocks release. **Handoff** proves
that someone who didn't build the app can run it: it checks every record has a
reason, writes a runbook, and runs a planted-failure drill. The AI does the
work. A person designs, signs and approves.

## Install

In Claude Code:

```
/plugin marketplace add <owner>/prove-it-kit
/plugin install prove-it@prove-it
```

Then work through [docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md).

## The five commands

| Command | Reads | Writes | The one thing it won't do |
|---|---|---|---|
| `/prove-it:consult [brief]` | The brief (default: the single file in `brief/`) | `CONSULT.md` in the workspace root | Write anything before you confirm its restatement of the brief |
| `/prove-it:design-challenge [consult]`<br>`/prove-it:design-challenge amend [record]` | `./CONSULT.md`, else `../CONSULT.md`; the kit's `DESIGN.md` template. `amend` reads the existing record | `docs/DESIGN-<Feature>.md`. `amend` adds or changes terms, with one unsigned drift-log row for each | Sign the record, or fill in any Signed by cell |
| `/prove-it:build-plan [record]` | A signed `docs/DESIGN-*.md` (here, else `../docs/`); the live GitHub board | `plan.json` in the workspace; labels, milestones, epics and stories on GitHub (through `file-plan.mjs`); `BACKLOG.md` | File from an unsigned record, or file without your approval |
| `/prove-it:grade [milestone]` | The repo, its design records, the board; runs the build and tests | `GRADE.md` at the repo root; a remediation plan in `../plan-grade.json`, filed only on approval (which also rewrites `BACKLOG.md`) | Install to an instance without asking, or claim a check it didn't run |
| `/prove-it:handoff`<br>`… plant` · `… diagnose [symptom]` · `… verdict` | `src/`, the design records and the templates. `diagnose` reads **only** `RUNBOOK.md` | `RUNBOOK.md` and a `HANDOFF.md` draft; `plant` writes a numbered drill card and `diagnose` writes numbered drill notes, both in the workspace; `verdict` writes the final `HANDOFF.md` | Soften the verdict. It also never plants or restores anything on an instance itself |

Each command ends by naming the next one.

## Templates

- `templates/BRIEF.md`: the shape of a brief (problem, users, capabilities,
  out of scope, success, size).
- `templates/DESIGN.md`: the design record's ten sections, the signing rule
  and the drift log.
- `templates/CLAUDE.md`: the app repo's session protocol (session open and
  close, backlog discipline, brakes).
- `templates/gitignore.allowlist`: an allowlist `.gitignore`. Nothing is
  tracked unless a line admits it.
- `templates/RUNBOOK.md`: the runbook, ending in a symptom → cause index.
- `templates/HANDOFF.md`: the handoff record: three checks, a verdict, and
  open items with owners named by role.

## The guard

`hooks/pre-commit-guard.sh` is a git pre-commit hook. It blocks a commit when:

- a staged file is not admitted by the `.gitignore` allowlist (for example, it
  was force-added);
- an added line looks like a secret: a private key block, a GitHub token, an
  API key of the common `sk-` kinds, an AWS access key id, a Slack token, a URL
  with a user name and password in it, or the kit's own test marker;
- an added line matches one of your own patterns (your hostname, your email)
  in `.prove-it/patterns`. These are matched ignoring case, and the file is
  never committed.

If a pattern is invalid it fails closed, and nothing is committed.

Install it in each app repo, from a local clone of this kit:

```
cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"
chmod +x "$(git rev-parse --git-path hooks)/pre-commit"
```

**If it blocks a real credential, revoke or rotate it first.** Removing it
from the commit doesn't un-leak it if it was ever pushed, pasted or copied.

It is a seatbelt, not a vault: see Honest limits.

## Answers for the series

| Script asks | Kit answer |
|---|---|
| `/prove-it:consult` argument form, output location, asks first? | Optional brief path. Default: the single file in `brief/`, and it asks if there are none or several. Writes `CONSULT.md` in the workspace root, never in an app repo. Restates the brief in five bullets or fewer and waits for the literal reply "confirmed" first |
| `/prove-it:design-challenge` input | Optional consult path. Default `./CONSULT.md`, then `../CONSULT.md`, and it asks if neither exists. `amend [record]` changes a signed record: each added or changed term gets a drift-log row with Signed by left blank, which leaves the record unsigned until a person signs |
| Template file names | `templates/gitignore.allowlist`, `templates/CLAUDE.md`, `templates/DESIGN.md`, `templates/BRIEF.md`, `templates/RUNBOOK.md`, `templates/HANDOFF.md`; the guard is `hooks/pre-commit-guard.sh` |
| Guard install line | `cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"` then `chmod +x "$(git rev-parse --git-path hooks)/pre-commit"` (`<kit>` = a local clone of this repo) |
| How the allowlist re-admits a folder | `!/folder/` after `/*`, appended at the end of `.gitignore` when first needed; never `git add -f` |
| Label names | `gate:merge`, `gate:install`, `gate:demo`, `gate:handoff`, `gate:publish` (`gate:*`), `register`, `p0`–`p2`, `size:s`/`size:m`/`size:l` (`size:*`), `epic` |
| How blockers are counted | Open `gate:<next gate>` issues, excluding `register`; the next gate is the earliest gate, in the order merge → install → demo → handoff → publish, with open issues. `BACKLOG.md` shows it at the top |
| `/prove-it:grade` input; installs itself?; forecast? | Optional milestone (title or gate); with none it lists them and asks. Asks before installing, and a yes counts only if it names the alias; always `--auth <alias>`. Always writes a forecast. Remediation is one epic in `../plan-grade.json`, filed with `--reopen` so a regressed criterion reopens its old issue |
| `/prove-it:handoff` check 3 | Split into `plant` (writes `../drill-card.md`, then `../drill-card-<n>.md`; never touches the instance) and `diagnose` (fresh session, `RUNBOOK.md` only, writes `../drill-notes-<n>.md` per attempt), then `verdict` (reads every card and notes file) |
| `docs/SETUP-CHECKLIST.md` | Ships in the kit |
| `/prove-it:build-plan` approval | Preview table, then "approve"; then it asks "Dry run first (recommended), or apply now?" A dry run reads the live repo and files nothing |
| How skills find kit files | `${CLAUDE_PLUGIN_ROOT}` (for example `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`) |
| The filer | `node skills/build-plan/file-plan.mjs <plan.json> --check \| --dry-run [--reopen] \| --apply [--reopen] [--backlog <path>]` |

## Honest limits

- **Grade and handoff are only fully proven on a real app.** The kit's own
  dry run uses a sample brief with no app behind it, so the checks that need
  a built app are recorded as unverified in `tests/ACCEPTANCE.md`, never as
  passes.
- **The guard is a seatbelt, not a vault.** `git commit --no-verify` skips it.
  It doesn't scan binary files, and it can't handle file names that contain a
  newline. It only knows the secret shapes it lists. Keep a full history scan
  (for example gitleaks) before you publish a repo.
- The guard can also block things that aren't secrets: a CSS-style name
  starting `.sk-` looks like an API key to it. It fails closed.
- **Listing limits.** The filer and the skills read at most 5000 issues. If
  the listing is full, they stop instead of risking duplicates. Milestones are
  read in full, page by page.
- **Re-applying a plan overwrites hand edits.** If you edited an issue's title
  or body on GitHub, `--apply` puts the plan's text back. Change the plan
  instead. An issue body edited on the web may come back with different line
  endings, and then look changed on every run. A changed title also prints a
  key-collision warning, even when the change was intended.
- The filer ends in a stack trace instead of a clean message when `gh` fails
  during `--apply`, when there are more than 5000 issues, or when `milestones`
  or `epics` in a plan is not a list.
- The version number lives in three places (`plugin.json` and twice in
  `marketplace.json`), and nothing checks that they agree.
- `templates/DESIGN.md` has no components section, so the handoff's coverage
  check traces each record through terms and sections only.
- These are tracked in issue #3.

## Versions

0.1.0, unreleased. See [CHANGELOG.md](CHANGELOG.md). Record the versions you
build or record with (Claude Code, model, Node, now-sdk, gh, gitleaks,
prove-it) in the table in
[docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md#record-your-versions).
