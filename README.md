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
reason, writes a runbook, and runs a drill: a person plants a realistic
failure, and a fresh session diagnoses it from the runbook alone. The AI does the
work. A person designs, signs and approves.

## Install

In Claude Code:

```
/plugin marketplace add <owner>/prove-it-kit
/plugin install prove-it@prove-it
```

Needs Node ≥ 22, `git` and the GitHub CLI (`gh`). Then work through
[docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md). The pre-commit
guard is installed separately from a local clone of this repo (`git clone`
it anywhere; see The guard).

## The five commands

| Command | Reads | Writes | The one thing it won't do |
|---|---|---|---|
| `/prove-it:consult [brief]` | The brief (default: the single file in `brief/`) | `CONSULT.md` in the workspace root | Write anything before you confirm its restatement of the brief |
| `/prove-it:design-challenge [consult]`<br>`/prove-it:design-challenge amend [record]` | `./CONSULT.md`, else `../CONSULT.md`; the kit's `DESIGN.md` template. `amend` reads the existing record | `docs/DESIGN-<Feature>.md`, after asking one question per turn and reading every term back for you to confirm; it writes exactly the confirmed terms. `amend` adds or changes terms (read back the same way), with one unsigned drift-log row for each | Sign the record, or fill in any Signed by cell |
| `/prove-it:build-plan [record]` | A signed `docs/DESIGN-*.md` (here, else `../docs/`); the live GitHub board | `plan.json` in the workspace; labels, milestones, epics and stories on GitHub (through `file-plan.mjs`); a story that implements a term asks for tests that name its id (`C<n>`); `BACKLOG.md`, appending `!/BACKLOG.md` to `.gitignore` | File from an unsigned record (or without your approval) |
| `/prove-it:grade [milestone]` | The repo, its design records, the board; runs the build, tests and lint (a pass needs exit 0 and no error reported by the tool) | `GRADE.md` at the repo root, scored on a fixed 18-criterion rubric (six per dimension; a design term counts as tested only when its id appears as a whole word, `C<n>` or `<Feature> C<n>` with several records, in a test's name or in a test file), appending `!/GRADE.md` to `.gitignore`; a remediation plan in `../plan-grade.json`, filed only on approval (which also rewrites `BACKLOG.md`) | Claim a check it didn't run (and it asks you to type the install alias; it never runs `now-sdk auth --list`) |
| `/prove-it:handoff`<br>`… plant` · `… diagnose [symptom]` · `… verdict` | With no argument: `src/`, the design records, the templates, an existing `RUNBOOK.md` and `HANDOFF.md` draft, and `.gitignore`; nothing else. `plant` reads `RUNBOOK.md` and the design records; `diagnose` reads **only** `RUNBOOK.md`; `verdict` reads every card and notes file | `RUNBOOK.md` and a `HANDOFF.md` draft, appending `!/RUNBOOK.md` and `!/HANDOFF.md` to `.gitignore`; `plant` writes a drill card (`../drill-card.md`, then numbered ones) and `diagnose` writes numbered drill notes, both in the workspace; `verdict` writes the final `HANDOFF.md` | Soften the verdict |

Each command ends by naming the next one.

## Templates

- `templates/BRIEF.md`: the shape of a brief (problem, users, capabilities,
  out of scope, success, size).
- `templates/DESIGN.md`: the design record's ten sections, the signing rule
  and the drift log.
- `templates/CLAUDE.md`: the app repo's session protocol (session open and
  close, backlog discipline, tests that name their design term, brakes).
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
  AI-provider API key, an AWS access key id, a Slack token, a URL
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
| `/prove-it:design-challenge` input | Optional consult path. Default `./CONSULT.md`, then `../CONSULT.md`, and it asks if neither exists. One question per turn, even when asked for all of them at once. Before writing, it reads every term back, numbered, and asks "Confirm these N terms, or correct any."; the record holds exactly the confirmed list. `amend [record]` changes a signed record, reading back the added or changed terms the same way: each gets a drift-log row with Signed by left blank, which leaves the record unsigned until a person signs |
| Template file names | `templates/gitignore.allowlist`, `templates/CLAUDE.md`, `templates/DESIGN.md`, `templates/BRIEF.md`, `templates/RUNBOOK.md`, `templates/HANDOFF.md`; the guard is `hooks/pre-commit-guard.sh` |
| Guard install line | `cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"` then `chmod +x "$(git rev-parse --git-path hooks)/pre-commit"` (`<kit>` = a local clone of this repo) |
| How the allowlist re-admits a folder | `!/folder/` after `/*`, appended at the end of `.gitignore` when first needed; never `git add -f` |
| Label names | `gate:merge`, `gate:install`, `gate:demo`, `gate:handoff`, `gate:publish` (`gate:*`), `register`, `p0`–`p2`, `size:s`/`size:m`/`size:l` (`size:*`), `epic` |
| How blockers are counted | Open `gate:<next gate>` issues, excluding `register`; the next gate is the earliest gate, in the order merge → install → demo → handoff → publish, with open issues. `BACKLOG.md` shows it at the top |
| `/prove-it:grade` input; installs itself?; forecast? | Optional milestone (title or gate); with none it lists them and asks. Scores the same fixed 18-criterion rubric on every project (six per dimension; per-term checks are `n of m` coverage inside a criterion). A term counts as tested only when its id appears as a whole word (`C<n>`, or `<Feature> C<n>` with several records) in a test's name or in a test file, so name tests after the term they prove (`C3: …`); `templates/CLAUDE.md` says so. A build, test or lint pass needs exit 0 and no error reported by the tool itself (an `ERROR:` line from now-sdk, `npm ERR!` or `npm error`, a failed-test count above zero); exit 0 with such an error is unverified, a non-zero exit is a fail (exit 127, tool missing, is unverified), and no visible status is unverified. A rubric row passes only with evidence of the kind it names. Never runs `now-sdk auth --list`; before installing it asks "Which alias should I install to? Type the alias name.", and a yes counts only if it names the alias; always `--auth <alias>`. Always writes a forecast. Remediation is one epic in `../plan-grade.json`, one story per failed or unverified criterion (at most 18), filed with `--reopen` so a regressed criterion reopens its old issue |
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
- The guard's AWS pattern catches long-term access key ids (`AKIA…`), not
  temporary ones (`ASIA…`).
- The guard also blocks files ignored by your global gitignore or
  `.git/info/exclude`, but reports them as "not admitted by the allowlist".
- The guard can also block things that aren't secrets: a CSS class name
  that happens to share an API key's prefix looks like a key to it. It fails closed.
- **Listing limits.** The filer and the skills read at most 5000 issues. If
  the listing is full, they stop instead of risking duplicates. Milestones are
  read in full, page by page.
- **Re-applying a plan overwrites hand edits.** If you edited an issue's
  title, or a story's body, on GitHub, `--apply` puts the plan's text back (an
  epic keeps its body; the filer only appends missing stories). Change the
  plan instead. An issue body edited on the web may come back with different
  line endings, and then look changed on the next run after a web edit
  (unverified against a live repo). A changed title also prints a
  key-collision warning, even when the change was intended.
- The filer ends in a stack trace instead of a clean message when `gh` fails
  (during `--dry-run` or `--apply`), when there are more than 5000 issues,
  when `milestones` or `epics` is not a list, or when an entry in `stories` is
  not an object (for example `null`).
- The filer reads at most 500 labels from the repo. On a repo with more, a
  label it needs may look missing.
- The version number lives in three places (`plugin.json` and twice in
  `marketplace.json`), and nothing checks that they agree.
- `templates/DESIGN.md` has no components section, so the handoff's coverage
  check traces each record through terms and sections only.
- The runbook's `Symptom → cause index` heading has an awkward anchor
  (`#symptom--cause-index`); link to it by heading text, not anchor.
- These are tracked in issue #3.

## Versions

0.1.2 (public; tag `v0.1.2`). See [CHANGELOG.md](CHANGELOG.md). Record the versions you
build or record with (Claude Code, model, Node, now-sdk, gh, gitleaks,
prove-it) in the table in
[docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md#record-your-versions).

## License

MIT. See [LICENSE](LICENSE).
