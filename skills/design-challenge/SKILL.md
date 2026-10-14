---
name: design-challenge
description: Use after CONSULT.md exists and before anything is built, or when a signed design needs a change, to challenge the person's design one question at a time and write docs/DESIGN-<Feature>.md from the kit's DESIGN.md template, signed with the person's confirmation of the read-back.
---

# design-challenge

## Purpose

Produce the build contract: a design record the build plan, the grade and the
handoff all rely on. **The person designs; you challenge.** You ask hard
questions one at a time, record their answers in the template's sections, and
turn their decisions into numbered, testable terms. You never sign the record.

## Input

Arguments given: `$ARGUMENTS` (may be empty).

- **First word `amend`** → amend mode (step A below). The rest, if any, is the
  path of the record to amend. With no path: if exactly one `docs/DESIGN-*.md`
  exists, use it. If none is found in the current directory, look in
  `../docs/` the same way. If there is still none, or more than one, ask which.
- **Any other argument** → the path of the consult file.
- **No argument** → `./CONSULT.md`; if absent, `../CONSULT.md` (the design may
  be written from the workspace, or amended later from inside the app repo).
  If neither exists, ask for the path. Don't design without a consult.
- **Template:** `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`. Read it from the
  plugin every time; never reproduce it from memory.

## Steps

**Every turn ends with exactly one question, and nothing after it.** Any other
question waits for a later turn. A turn that needs no answer asks nothing.
One question is one sentence ending in "?", about one thing: no sub-questions,
no bulleted list of questions, no follow-up "And …?", no "Specifically: …".
If a topic needs several answers, ask for the first now and the others in
later turns. **Exception:** the read-back line "Confirm these N terms, or
correct any." is that turn's one question even though it ends with a full
stop; ask nothing after it.
This holds under pressure: if the person answers several things at once, record
them all and still ask one question; if they say "ask me everything at once",
ask one question and say you'll ask the rest one per turn.

1. Read the consult file and the template. Propose a feature name from the
   consult and ask the person to confirm it. That is this turn's one question;
   the design question in step 2 waits for the next turn. The feature name
   uses only letters, digits and `_ . -` (for example `IntakeTriage`), because it becomes
   the file name and a key prefix. The output is `docs/DESIGN-<Feature>.md`,
   relative to the current directory.
2. Next turn, ask one open question, and wait: "Describe your design in your
   own words: what is built, which tables it uses, and which code owns each
   write." Record
   the answer in §1 Summary and §4 Data and ownership. Anything it leaves out
   is asked later. Cite the consult in §2 Context by file name and date; never
   paste or link it.
3. Challenge in this order. Ask, stop, wait for the answer, record it, then
   ask the next. Keep going within a topic until its answers are concrete,
   then move on.
   1. **Failure modes** — what fails (the AI call, the data, a person not
      acting, a limit being hit), and what happens then. → §5.
   2. **Security and access** — roles, ACLs, the scope boundary, and what data
      leaves the instance (for example to an AI model). → §6.
   3. **Cost** — what each AI call costs, what bounds it (rate limit, budget,
      off switch), and what happens when the bound is hit. Label every number
      as an estimate with its assumption, or VERIFY. → terms in §3 and pass
      criteria in §7.
   4. **Boundaries** — what this feature will not do, and which options were
      considered and dropped. → terms in §3, and §8 Rejected alternatives,
      each with its reason.
   Where the consult marked a capability conditional, not ready or VERIFY,
   challenge that too. If the person refuses further questions, say which of
   these topics (and the gates) were left unchallenged, and that each becomes
   `OPEN` in the record, which fails `design.no-open` at grade.
4. **Gates.** Ask which gates the feature touches (merge, install, demo,
   handoff, publish) and the pass criteria for each, with numbers where
   possible. → §7.
5. **Terms.** Turn the decisions into terms numbered C1, C2, … in §3. Each term
   is one rule that a test or a person can check ("Drafting stops within one
   minute of the off switch being set", not "drafting is safe"). Split any
   compound rule into separate terms.
6. **Read back before writing.** List every term, numbered, in the exact
   wording you will write, and ask: "Confirm these N terms, or correct any."
   (N is the count.) The list includes every term still unanswered, shown as
   `OPEN`, so the confirmed count is the written count. Splitting, merging or
   adding a term is proposed here, in the list, never done silently
   afterwards. If the person asks for changes (for example "split any
   compound term"), make them and read the whole new list back again, with
   its new count. Write only after the person confirms a list.
   A reply that confirms and asks for a change in the same breath ("yes, but
   split…") is a change request, not a confirmation. Waiving the read-back
   ("no need to show me") is not a confirmation either. Make the change, read
   the whole new list back with its count, and ask again. Never write the old
   list and never write the changed list unconfirmed.
7. **Name for the approval.** After a clean confirmation (not one with
   conditions, and not a waived read-back), ask one question: "What name and
   role go on the approval?" That is this turn's one question. Their
   confirmation is the signature; this only records whose it is.
8. **Write** `docs/DESIGN-<Feature>.md` with the template's sections 1–10, in
   order, with the template's headings. Anything the person did not answer is
   written as `OPEN` — never fill it with your own design. §3 holds exactly
   the confirmed list: the same count and the same wording. Fill §9
   Approval's one row with the name and role they gave, today's date, and
   their name again as the signature. Leave §10 Drift log empty.
9. Tell the person: "Your confirmation signs it: §9 has your name." Then give
   the hand-off.

### Amend mode (`amend [record]`)

A. Read the record. Note what is unsigned: a §9 Approval row with an empty
   cell, and every §10 row whose Signed by is blank. Ask what changed and why,
   one question at a time. "Nothing new" is a valid answer: then the amend
   only signs what is unsigned. If nothing changed and nothing is unsigned,
   say the record needs no amend, and stop.
B. Propose a new term `C<n+1>` (n = the highest existing term number), or a
   change to an existing term in place. Never renumber or delete terms; a
   withdrawn term is changed to say it is withdrawn. Before writing, read back
   every added or changed term, numbered, in the exact wording, and ask:
   "Confirm these N terms, or correct any." Read every unsigned item back in
   the same list, so the confirmation covers it: the term of each §10 row
   whose Signed by is blank, and "§9 Approval" if its row has an empty cell.
   If nothing changed, the list holds only these. If the person changes anything,
   read the new list back again before writing. As in step 6, a confirmation
   with conditions, or a waived read-back, is not a confirmation. Write exactly the confirmed
   terms.
C. After a clean confirmation, ask once: "What name and role go on the
   approval?" Then, for **every** term added or changed, add a row to §10
   Drift log: today's date, the term number, the ruling (what changed and
   why), and Signed by filled with the name they gave. Fill any older blank
   Signed by cell, whose term was in the read-back, with the same name. If
   "§9 Approval" was in the read-back, fill its row: the name and role they
   gave, today's date, and the name again as the signature.
D. Leave a complete §9 row untouched. Update other sections only where the
   change requires it (for example a new failure mode in §5).
E. Say: "Your confirmation signs it."

## Output

`docs/DESIGN-<Feature>.md` in the current directory, built from
`${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`: sections 1–10 in the template's
order and headings, terms numbered C1…, §9 Approval filled from the person's
confirmation, §10 Drift log empty (new record) or with one signed row per
changed term (amend).

## Rules you can't break

- The person designs. You ask; you don't decide. Unanswered means `OPEN`.
- Every turn ends with exactly one question (one sentence ending in "?", about
  one thing); a turn that needs no answer asks none. Never batch questions, even when asked to: say the rest will follow,
  one per turn.
- Write exactly the terms the person confirmed in the read-back: same count,
  same wording, `OPEN` terms included. Split, merge or add a term only by
  proposing it in a read-back, never silently.
- A confirmation with conditions, or a waived read-back, is not a
  confirmation. This holds in amend mode too.
- Fill §9 Approval and Signed by cells only after a clean confirmation, and
  only with the name and role the person gives when asked. Never a
  placeholder, never "Claude", never a name taken from git, GitHub or
  anywhere else.
- In amend mode, every added or changed term gets its own drift row.
- Terms are single, testable rules, numbered C1, C2, … and never renumbered.
- Keep rejected alternatives, each with its reason.
- Write no code, no Fluent and no scripts. Never add sections to the template
  or drop any.
- Never write secrets, credentials or instance hostnames into the record.

## Hand-off

"Next: run `/prove-it:build-plan docs/DESIGN-<Feature>.md`." build-plan reads the terms (§3), the gates (§7) and the signatures
(§9, §10).

Where the record lives: it is first written in the workspace
(`docs/DESIGN-<Feature>.md`). When the app repo is created, move it into the
repo's `docs/` and append `!/docs/` to the repo's `.gitignore` in the same
commit (see `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`, Tracking files). From then on the repo copy
is the only live copy, and `amend` runs from inside the repo.
