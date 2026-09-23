---
name: build-plan
description: Use when a signed design record (docs/DESIGN-<Feature>.md) exists and its work is not yet on GitHub, to draft plan.json from the record's terms and gates, preview it, and on approval file milestones, epics and stories through file-plan.mjs, which also writes BACKLOG.md.
---

# build-plan

## Purpose

Turn a signed design record into a GitHub plan: milestones at gate boundaries,
epics, and stories that each block a named gate or sit in the register. You
draft `plan.json`; the kit's script `file-plan.mjs` validates it and does all
the filing. You never file from an unsigned record, never file without the
person's approval, and never file a story that names neither a gate nor
`register`.

## Input

Arguments given: `$ARGUMENTS` (may be empty).

- **Design record path (optional).** If given, use it. If empty, use the single
  `docs/DESIGN-*.md` in the current directory; if there is none, look in
  `../docs/` the same way. If there is still none, or more than one, ask which.
  Never pick one yourself.
- **Template:** `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md` §9 holds the
  signing rule. Read it each time and apply it exactly as written.
- **Script:** `${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs`. Never
  call `gh issue create`, `gh label` or the milestones API yourself.
- **Priority rule:** `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`, Backlog
  discipline (gate order and gate distance).

## Steps

1. **Check the signatures. Refuse if unsigned.** Read the record's §9 Approval
   and §10 Drift log, and apply the signing rule in the template's §9. Header
   and separator rows are not data rows. If the record is unsigned, stop. Say the record is unsigned and name the exact gap,
   for example "§9 Approval: Date and Signature are empty" or "§10 Drift log,
   row 2 (C4): Signed by is empty". Say: "A person signs this; I don't. Run me
   again once it is signed." Draft nothing and run nothing.
2. **Read the record.** Take §3 Terms (C1…), §7 Gates and their pass criteria,
   §5 Failure modes, and anything the record puts out of scope (§3, §8). Note
   any `OPEN` item; it becomes a story or an open question, never a guess.
3. **Read the board, if a repo is reachable.** From inside the app repo run
   `gh api --paginate 'repos/{owner}/{repo}/milestones?state=all&per_page=100' --jq '.[].title'`
   and `gh issue list --state all --limit 5000 --json number,title,body`. If
   the list comes back with 5000 items, it is truncated. Stop and say so. Reuse
   existing milestone titles exactly (milestones are matched by title, so a
   changed title makes a duplicate). Collect keys already used in
   `<!-- prove-it:key=… -->` markers; a new key must not reuse one.
4. **Draft `plan.json`** in this shape (the schema `file-plan.mjs` enforces):
   - `milestones[]`: `key`, `title`, `description`. One per gate the record
     touches, in gate order merge → install → demo → handoff → publish, named
     for the gate boundary (for example `M1 · merge`), never for a date.
     Titles must be unique.
   - `epics[]`: `key`, `title`, `body`. Group stories by term or area.
   - `stories[]`: `key`, `title`, `epic`, `size` (`s|m|l`), `dependsOn[]`,
     `doneWhen`, `honestLimit`, optional `body`, and then **either**
     - `gate` (one of the five), `milestone` and `priority`, **or**
     - `register: true` with **no** milestone and **no** priority.
   - A gated story's `milestone` is the key of the milestone for **its own
     gate**. A `gate: "install"` story goes in the install milestone, never an
     earlier or later one. Milestones are gate boundaries.
   - **Priority** is gate distance only, counted from the next gate (the
     earliest gate that will have open issues): p0 = blocks it, p1 = blocks the
     gate after, p2 = further out. Nothing is ranked "because it's quick".
   - **Keys** use only letters, digits, `_ . -`. They share one namespace
     across milestones, epics and stories and are unique for the life of the
     repo. For a second design record, prefix keys with the feature name
     (`Intake.S3`) so they can't collide with an earlier plan.
   - **Derive, don't invent.** Every term C<n> is covered by at least one story
     whose `doneWhen` is that term's check; every §7 pass criterion is the
     `doneWhen` of a story on that gate. Out-of-scope items become `register`
     stories or nothing; never gated work. `honestLimit` says what passing the
     story does **not** prove.
   - **Term stories ask for term-named tests.** Every story that implements
     one or more terms says in its `doneWhen` that its tests name those term
     ids, using the actual ids: `C<n>`, or `<Feature> C<n>` when the repo has
     several design records. For example `"doneWhen": "Unit tests named C6,
     C7 and C8 pass, showing …"`, or, for an on-instance check, `"On the PDI,
     tests named C11 and C12 show …"`. Grade counts a term as tested only when
     its id appears as a whole word in a test's name or in a test file, so a
     `doneWhen` that only cites `(C6)` is not enough. A story that only rules
     on an `OPEN` term (a signed drift-log ruling, no code) is exempt, but
     only that ruling story: its `doneWhen` also says "if the term is kept, a
     build story whose tests name C<n> exists (added to this plan via
     `dependsOn`, or filed after the ruling)". The story that builds the term
     carries the test requirement.
   - Reference other stories in a body as `{{KEY}}`; the script resolves them
     to issue numbers.
5. **Where `plan.json` lives.** Write it in the workspace (`../plan.json`
   from the repo) or a temp folder. Never inside the repo. It is a working
   file and is not committed; the board is the record.
6. **Check it.** Run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --check`.
   If it is rejected, fix the plan and run it again. Never edit the script to
   make a plan pass.
7. **Preview and stop.** Show the `plan OK` summary line, then a table:

   | Key | Title | Epic | Milestone | Gate / register | Priority | Size | Depends on | Done when |
   |---|---|---|---|---|---|---|---|---|

   List which term each story covers and any term or pass criterion with no
   story. The coverage line lists every term that no story's `doneWhen` asks
   tests to name. OPEN terms whose only story is a ruling are listed there
   separately, as "pending ruling — no test yet". Never say "none missing"
   while such a term exists. Then say: "Reply 'approve' to file this, or tell me what to change."
   End your turn. File nothing until the person approves.
8. **Dry run or apply.** On "approve", ask: "Dry run first (recommended), or
   apply now?" If dry run: run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --dry-run`,
   show the count of writes, and stop for "apply". The dry run files nothing,
   but it reads the live repo. Run it from inside the app repo with `gh`
   authenticated (`gh auth status`).
9. **Apply.** Only after "apply" (or "apply now"), from inside the app repo
   (`git rev-parse --show-toplevel`), run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/build-plan/file-plan.mjs "<plan.json>" --apply --backlog "$(git rev-parse --show-toplevel)/BACKLOG.md"`.
   Report what it created, updated and left unchanged. If the read-back fails,
   show the problems. Don't hand-edit issues to hide them.
10. **Track BACKLOG.md.** If `.gitignore` has no `!/BACKLOG.md` line, append
    it at the end. Don't commit. Tell the person to commit `.gitignore` and
    `BACKLOG.md` together on a branch, never on main.

## Output

- `plan.json` in the workspace or a temp folder. It is not committed.
- On GitHub: labels (`gate:*`, `register`, `p0`–`p2`, `size:*`, `epic`),
  milestones, epic issues and story issues, each carrying its key marker.
- `BACKLOG.md` at the repo root, written by the script from the open issues on
  GitHub (not from the plan), with the next gate and its blocker count at the
  top.

## Rules you can't break

- Never draft or file from an unsigned record. Name the missing part.
- Never file without the person's explicit approval of the preview.
- Every story names exactly one gate, or `register`. Register stories have
  no milestone and no priority.
- Every story that implements a term has a `doneWhen` requiring its tests to
  name that term id (`C<n>`, or `<Feature> C<n>` with several records).
- A term with only a ruling story is "pending ruling — no test yet" in the
  preview, and the ruling story requires a build story with term-named tests if the term is kept.
- File only through `file-plan.mjs`. Never call `gh` to create or edit issues,
  labels or milestones directly.
- Milestones are gate boundaries, never calendar dates.
- Priority is gate distance only.
- Keys are never reused for different work. Re-running the same plan files
  nothing new.
- Never commit `plan.json`, and never write secrets, credentials or instance
  hostnames into it.

## Hand-off

"Next: start the top p0 story on its own branch. Session open reads
`BACKLOG.md` and `SESSION-NOTE.md` (see `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`). At a milestone,
run `/prove-it:grade <milestone>`." A new ask re-enters at
`/prove-it:design-challenge amend`, then comes back here once it is signed.
