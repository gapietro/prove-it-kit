---
name: design-challenge
description: Use after CONSULT.md exists and before anything is built, or when a signed design needs a change, to challenge the person's design one question at a time and write docs/DESIGN-<Feature>.md from the kit's DESIGN.md template, left unsigned for a person to sign.
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

1. Read the consult file and the template. Ask the person for the feature name
   (propose one from the consult and confirm it). The output is
   `docs/DESIGN-<Feature>.md`, relative to the current directory.
2. Ask the person for their design in their own words: what is built, which
   tables, which code owns each write. Record it in §1 Summary and §4 Data and
   ownership. Cite the consult in §2 Context by file name and date; never paste
   or link it.
3. Challenge, **one question per turn**, in this order. Ask, stop, wait for the
   answer, record it, then ask the next. Keep going within a topic until its
   answers are concrete, then move on.
   1. **Failure modes** — what fails (the AI call, the data, a person not
      acting, a limit being hit), and what happens then. → §5.
   2. **Security and access** — roles, ACLs, the scope boundary, and what data
      leaves the instance (for example to an AI model). → §6.
   3. **Cost** — what each AI call costs, what bounds it (rate limit, budget,
      off switch), and what happens when the bound is hit. → terms in §3 and
      pass criteria in §7.
   4. **Boundaries** — what this feature will not do, and which options were
      considered and dropped. → terms in §3, and §8 Rejected alternatives,
      each with its reason.
   Where the consult marked a capability conditional, not ready or VERIFY,
   challenge that too.
4. **Gates.** Ask which gates the feature touches (merge, install, demo,
   handoff, publish) and the pass criteria for each, with numbers where
   possible. → §7.
5. **Terms.** Turn the decisions into terms numbered C1, C2, … in §3. Each term
   is one rule that a test or a person can check ("Drafting stops within one
   minute of the off switch being set", not "drafting is safe"). Split any
   compound rule into separate terms. Read the terms back and get the person's
   agreement on the wording.
6. **Write** `docs/DESIGN-<Feature>.md` with the template's sections 1–10, in
   order, with the template's headings. Anything the person did not answer is
   written as `OPEN` — never fill it with your own design. Leave §9 Approval
   exactly as the template has it (one blank row) and §10 Drift log empty.
7. Tell the person: "A person signs this; I don't." Then give the hand-off.

### Amend mode (`amend [record]`)

A. Read the record. Ask what changed and why, one question at a time.
B. Add a new term `C<n+1>` (n = the highest existing term number), or change an
   existing term in place. Never renumber or delete terms; a withdrawn term is
   changed to say it is withdrawn.
C. For **every** term added or changed, add a row to §10 Drift log: today's
   date, the term number, the ruling (what changed and why), and **Signed by
   left blank**. Per the template, the record is now unsigned until a person
   fills in Signed by.
D. Leave §9 Approval untouched. Update other sections only where the change
   requires it (for example a new failure mode in §5).
E. Say: "The record is unsigned until a person signs the drift row. A person
   signs this; I don't."

## Output

`docs/DESIGN-<Feature>.md` in the current directory, built from
`${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`: sections 1–10 in the template's
order and headings, terms numbered C1…, §9 Approval blank, §10 Drift log empty
(new record) or with one unsigned row per changed term (amend).

## Rules you can't break

- The person designs. You ask; you don't decide. Unanswered means `OPEN`.
- One challenge per turn. Never batch questions.
- Never fill in §9 Approval or any Signed by cell, not even with a placeholder
  such as a name, "pending" or "Claude".
- In amend mode, every added or changed term gets its own drift row.
- Terms are single, testable rules, numbered C1, C2, … and never renumbered.
- Keep rejected alternatives, each with its reason.
- Write no code, no Fluent and no scripts. Never add sections to the template
  or drop any.
- Never write secrets, credentials or instance hostnames into the record.

## Hand-off

"Next: once a person has signed §9 (and every drift row), run
`/prove-it:build-plan docs/DESIGN-<Feature>.md`. It refuses an unsigned
record." build-plan reads the terms (§3), the gates (§7) and the signatures
(§9, §10).

Where the record lives: it is first written in the workspace
(`docs/DESIGN-<Feature>.md`). When the app repo is created, move it into the
repo's `docs/` and append `!/docs/` to the repo's `.gitignore` in the same
commit (see `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`, Tracking files). From then on the repo copy
is the only live copy, and `amend` runs from inside the repo.
