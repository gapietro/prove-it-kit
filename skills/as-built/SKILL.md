---
name: as-built
description: Use once a now-sdk app is built and installed, to document what was actually built - read src/ and the instance (read-only), then write docs/AS-BUILT.md and the page docs/AS-BUILT.html. Light mode draws two diagrams (the pieces, one record's path); `full` writes the turnover document with the agent broken down, every data flow, the configuration and where the build differs from the design. Every box names where it comes from.
---

# as-built

## Purpose

Show what was built, so that someone who didn't build it can see the whole
app and check the picture against the real thing. You read the code and the
instance, and you draw only what you found. Every box and every step names
where it comes from, so a person can check it. What you couldn't confirm is
listed as not verified. It is never drawn as fact.

An AI can draw a convincing diagram of an app that isn't quite the one that
was built. This skill exists to make that mistake visible.

## Input

Arguments given: `$ARGUMENTS` (may be empty). In any order:

- **`full`** → the full turnover document. Without it, the light document.
- **Any other word** → the now-sdk alias of the instance to read (for example
  `/prove-it:as-built dev-test` or `/prove-it:as-built full dev-test`).
  Naming it in the command is the person naming it.

Run from the app repo root (`git rev-parse --show-toplevel`). The inputs are
exactly:

- `src/`: every `*.now.ts` file and every script or module those files name;
- `now.config.json` and the repo's `CLAUDE.md` Project facts, for the scope;
- the instance, through `now-sdk query` only (step 3);
- the design records, `docs/DESIGN-*.md`, for step 4 only;
- `${CLAUDE_PLUGIN_ROOT}/templates/AS-BUILT.md`. Read it each time;
- `.gitignore`, which step 7 may edit.

Read nothing else: not `GRADE.md`, `RUNBOOK.md`, `HANDOFF.md`, `BACKLOG.md`
or `CONSULT.md`, and not an earlier `docs/AS-BUILT.md`. This document
describes the build from its sources, every time. An earlier picture may be
of an earlier app.

## The two documents

Both are `docs/AS-BUILT.md`, with the page `docs/AS-BUILT.html` built from
it. A full run replaces a light one. The sections are fixed, word for word,
and the builder refuses any other section, and any other subsection of The
agent or Data flows. Inside a subsection, use `####` headings freely.

**Light** has four sections, in this order, and exactly two diagrams:

1. **The pieces** — a flowchart, then its sources table.
2. **One record's path** — a sequence diagram, then its sources table.
3. **As built against as designed** — at most five rows.
4. **Not verified**

**Full** has nine sections, in this order:

1. **Summary**
2. **Context** — a flowchart, then its sources table.
3. **The pieces** — the same diagram as the light document.
4. **The agent**, with these subsections: **Workflow and trigger**, **Role
   and instructions**, **Tools**, **Guardrails**, **What reaches the model**.
5. **Data flows**, with these subsections: **One record's path** (the same
   diagram as the light document), **Other paths**, **Who writes and reads
   each table**, **A run's life**, **Across the scope boundary**.
6. **Configuration**
7. **As built against as designed** — every difference.
8. **Not verified**
9. **Where next**

The template says what goes in each. A section with nothing to show says
"None in this app." It is never left out.

## Steps

1. **Settle the mode and the alias.** Never run `now-sdk auth --list` (it
   prints instance hosts). If no alias was given, ask: "Which alias should I
   read the instance through? Type the alias name, or `none` to document from
   the code alone." and wait. With `none`, skip step 3: the **Instance** line
   says "not read", and every "On the instance" cell says "Not checked:
   instance not read".
2. **Read the build.** Read every `*.now.ts` file under `src/`, and each
   script or module they name. List every record the app declares: its kind
   (table, column set, role, ACL, property, script include, business rule,
   scheduled job, flow, UI action, AI agent, agentic workflow, agent tool,
   trigger, cross-scope privilege, seed record and so on), its name, and its
   file and line. Don't guess at Fluent API names: a declaration you can't
   classify goes under Not verified, by file and line. For each script, note
   which tables it reads and which it writes, with the line.
3. **Read the instance. Read only.** Use only
   `now-sdk query <table> -q '<query>' -f <fields> --limit 200 --auth <alias>`.
   Run each as a plain command on its own.
   - One query per kind of record, for the app's scope
     (`sys_scope.scope=<scope>`), asking only for names and whether each is
     active. Then match the rows to step 2's list.
   - Where a kind lives: tables `sys_db_object`; properties `sys_properties`;
     roles `sys_user_role`; ACLs `sys_security_acl`; script includes
     `sys_script_include`; business rules `sys_script`; scheduled jobs
     `sysauto_script`; flows `sys_hub_flow`; UI actions `sys_ui_action`; AI
     agents `sn_aia_agent`; agentic workflows `sn_aia_usecase`; agent tools
     `sn_aia_tool`; triggers `sn_aia_trigger_configuration`; cross-scope
     privileges `sys_scope_privilege`. For a kind not listed, or a table name
     the instance refuses, write "Not checked: <why>". Never guess a table.
   - A property's "Value as installed" is its value on the instance. Never
     record a value that looks like a password, token or key: write "set" or
     "empty".
   - The release: `now-sdk query sys_properties -q 'name=glide.buildname' -f value --limit 1 --auth <alias>`.
     Some instances don't show it. If no row comes back, write "release not
     read", and nothing more about it.
   - Record three results, in these words: **Found** (with the table, and
     "active" or "inactive" where the record has that field), **Not found**,
     or **Not checked: <why>**. A failed or refused query is Not checked,
     never Not found. If a listing comes back with 200 rows it may be cut
     short: query again with `--offset 200`.
   - Read configuration only. Never read the contents of business records
     (cases, people, messages), and never copy any into the document. A row
     count is the most you take from a data table.
   - Change nothing. No install, no build, no background script, no other
     `now-sdk` command.
4. **Compare with the design.** If `docs/DESIGN-*.md` exists, read §3 Terms,
   §4 Data and ownership, §5 Failure modes and §6 Security, and list each
   place where the build differs: a term with nothing in `src/` that carries
   it out, a table or writer the record doesn't name, a failure mode with no
   handling, an access the record doesn't allow. One row each: the term or
   section, what was designed, what was built, with file and line. A signed
   drift-log row (§10) that already rules on a difference isn't a difference:
   leave it out. Never change the record or the code to make them agree, and
   never soften a row. With no record: "No design record in docs/." The light
   document takes the five that matter most, and says how many more a full
   run would list.
5. **Write `docs/AS-BUILT.md`** from the template, with the mode's sections.
   - Under the title: `- Mode:` light or full; `- Read at:` the commit
     (`git rev-parse --short HEAD`) and today's date; `- Instance:` the alias
     and release, or "not read". Never the host.
   - **What the builder reads.** Headings, paragraphs, lists, tables, code
     blocks and relative links such as `[RUNBOOK.md](../RUNBOOK.md)`. It
     refuses everything else, with the line: raw HTML, images, horizontal
     rules, any link that isn't a plain relative path, a code block inside a
     list. Put a name in angle brackets, such as `<alias>`, in backticks.
     Write `\|` for a `|` inside a table cell. Under the three fact lines
     you may add one short note in plain sentences, and nothing else. Each
     diagram's sources table comes straight after it, with nothing between.
   - **Diagrams.** Only `flowchart`, `sequenceDiagram` and `stateDiagram-v2`.
     A diagram can't hold a `%%{` directive, a URL, `url(` or a `<`: the
     builder refuses them, so that a page can never fetch or run anything.
     Give every flowchart node a short id of letters and digits, and its
     label in quotes: `tool1["Tool: apply_route"]`, a table as
     `log[("x_app_run_log")]`, a person as `u(["HR fulfiller"])`. No HTML and
     no line breaks in a label. In a sequence diagram, declare each
     participant with a short alias, and keep `;`, `#` and `:` out of message
     text after the first colon. One record's path always shows the branch
     where the app refuses, fails or leaves the record alone.
   - **Draw only what you found.** Every node, participant, step and state
     has a row in the sources table straight under its diagram. One row may
     cover a participant and the steps it takes. "Where it
     comes from" names a file under `src/` (with the line where it helps), or
     a table and record on the instance. "On the instance" holds step 3's
     result. A piece declared in `src/` and Not found on the instance is
     still drawn, says so in its row, and is listed under Not verified.
   - **Keep a diagram readable.** A picture nobody can read shows nothing.
     - The pieces has at most 16 boxes and at most 18 arrows. With more
       pieces, group pieces of one kind into a single box ("Agent tools: 3")
       and list each member in the sources table.
     - Draw the spine first, left to right, and declare the boxes in that
       order: what starts a run, what carries it, what decides, and what it
       writes at the end.
     - No arrow points back towards the start. What a piece writes back to
       the record that started the run (a note, a state) is left out of
       this picture: it is in the sources table and in One record's path.
     - Tables that the same pieces write go in one box ("Run tables:
       run_log, run_detail").
     - An arrow means "starts", "calls" or "writes", and nothing else. Never
       draw an arrow for a read, a guard or a setting: those go in the
       sources table, in words. At most one arrow between any two boxes.
     - Pieces that support the rest (properties, roles, ACLs, cross-scope
       privileges, seed data) sit together in one `subgraph` named
       "Also in the app", with no arrows.
     - Arrow labels are three words or fewer.
     - A sequence diagram has at most 8 participants. Put two steps that
       always happen together on one arrow.
   - **The agent (full).** Quote the role and instructions word for word, in
     a `text` code block, with the file and lines. Never paraphrase inside
     the block. One Tools row per tool: what it takes, what it returns, the
     tables it reads and writes, and each condition under which it refuses,
     all from its script. One Guardrails row per thing the agent can't do,
     with what enforces it (an ACL, a role the run-as user lacks, a check in
     a tool) and where. "What reaches the model" lists field names, never
     values.
   - **Data flows (full).** Other paths has one `####` heading, sequence
     diagram and sources table for each other way a run can end and each
     action a person can start. "Who writes and reads each table" has one row
     per table the app owns or writes. "A run's life" is a state diagram from
     the state choices declared in `src/`. "Across the scope boundary" lists
     each cross-scope access the app declares, and why.
   - **Not verified.** Every Not found and Not checked, every declaration you
     couldn't classify, and what the wiring alone can't show: you read how
     the app is put together, not a run of it. Say how a person would confirm
     each. Write "Nothing: everything above was found." only when it is true.
   - **Where next (full).** Link `../RUNBOOK.md` and `../HANDOFF.md` if they
     exist (`ls`, names only: don't read them). For one that doesn't, say
     "not written yet: `/prove-it:handoff` writes it".
   - Never write a secret, a credential, a person's name or an instance
     hostname.
6. **Build the page.** Run
   `node ${CLAUDE_PLUGIN_ROOT}/skills/as-built/build-page.mjs docs/AS-BUILT.md --mode light`
   (or `--mode full`). It checks the document's shape, writes
   `docs/AS-BUILT.html`, and opens it in a headless browser, if the computer
   has one, to check that every diagram draws. If it lists problems, fix
   `docs/AS-BUILT.md` and run it again. Never edit the page by hand, and
   never remove a sources table or a Not verified line to get past it. If a
   diagram still won't draw after three tries, simplify that diagram and say
   so under Not verified. If it says the drawing was not checked, tell the
   person to look at each diagram.
7. **Track the files.** If `.gitignore` is the kit's allowlist and has no
   `!/docs/` line, append it at the end. Don't commit. Tell the person to
   commit `docs/AS-BUILT.md` and `docs/AS-BUILT.html` together on a branch,
   never on main.
8. **Report.** In this shape, and nothing longer:
   - "Wrote `docs/AS-BUILT.md` and `docs/AS-BUILT.html` (<mode>)."
   - "<n> pieces: <n> found on the instance, <n> not found, <n> not checked."
   - "<n> differences from the design." and the first one, in a line.
   - "Not verified: <n> items."
   - "Open the page: `open docs/AS-BUILT.html` (Mac), or
     `start docs\AS-BUILT.html` (Windows)."
   - "Check it: pick three rows of a sources table and find each one where
     its row says. If a box isn't there, the diagram is wrong: tell me which."

## Output

- `docs/AS-BUILT.md`: the document, light or full, with fixed headings.
- `docs/AS-BUILT.html`: the page built from it. It holds its own diagram
  library and fetches nothing, so it opens offline and can be sent on its
  own. Its security policy lets it run only its own two scripts. It is
  always built by `build-page.mjs`, never written by hand.
- To check both later:
  `node ${CLAUDE_PLUGIN_ROOT}/skills/as-built/build-page.mjs docs/AS-BUILT.md --check`
  passes only when the document has its shape and the page was built from
  this exact document.

## Rules you can't break

- Read only. The instance is read through `now-sdk query` and nothing else.
  Never install, build, run a script on, or change the instance.
- Never draw what you didn't find. Every box, step and state has a sources
  row that names a file or a record.
- `src/` is the authority for what the app declares. The instance is the
  authority for what is installed and switched on. When they disagree, show
  both and list it under Not verified. Never pick one quietly.
- A failed query is Not checked, never Not found, and never Found.
- You read the wiring, not a run. Never write that the app "works" or that a
  path "was seen": say what the code does, and list behaviour as not
  verified.
- Quote instructions word for word, or not at all.
- Never soften a difference from the design, and never edit a design record,
  the code or the instance to remove one.
- Read only the inputs listed under Input. An earlier `AS-BUILT.md` is never
  an input.
- The headings and file names are fixed. Never add, rename or drop a section.
- Never run `now-sdk auth --list`. Always `--auth <alias>`.
- Never write secrets, credentials, people's names, business record contents
  or instance hostnames into either file.

## Hand-off

After a light run: "For the full turnover document, with the agent broken
down and every data flow: `/prove-it:as-built full`." After a full run:
"Send `docs/AS-BUILT.html` with the repo. Next: `/prove-it:handoff`, which
proves someone else can run the app, and lists this document under What the
receiving team receives."
