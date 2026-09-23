---
name: handoff
description: Use at the end of a now-sdk build to prove it can be handed off - trace every Fluent record to a design reason, write RUNBOOK.md, run a planted-failure drill (plant, then diagnose in a fresh session) and write HANDOFF.md with a READY or NOT READY verdict.
---

# handoff

## Purpose

Prove that someone who didn't build the app can run it. Three checks:
**1** every record the app ships traces to a reason in a design record;
**2** a runbook exists that a support person can use without the source;
**3** a drill: a real failure is planted on the test instance and diagnosed
in a fresh session from the runbook alone. The verdict is READY only if all
three pass. You never soften it.

## Input

Arguments given: `$ARGUMENTS` (may be empty). The first word picks the mode:

- **none** → checks 1 and 2, and a `HANDOFF.md` draft.
- **`plant`** → propose one failure and write the drill card, then stop.
- **`diagnose`** → diagnose a symptom from `RUNBOOK.md` alone, in a fresh
  session. The rest of the arguments, if any, is the symptom.
- **`verdict`** → write the final `HANDOFF.md`.

Run every mode from the app repo root (`git rev-parse --show-toplevel`).
Templates: `${CLAUDE_PLUGIN_ROOT}/templates/RUNBOOK.md` and
`${CLAUDE_PLUGIN_ROOT}/templates/HANDOFF.md`. Read them each time.

## Steps

### No argument: checks 1 and 2

1. **Check 1: rationale coverage.** List every Fluent record declared under
   `src/` (the `*.now.ts` files): one row per declared record (table, column,
   role, ACL, script include, business rule, flow, property, UI element and
   so on), named by its type and its name or `$id`. Don't guess at Fluent
   API names; mark any declaration you can't classify as **VERIFY**.
   For each record, find its reason in a design record under `docs/`: a term
   (`DESIGN-<Feature> C3`) or a section (`DESIGN-<Feature> §4`). No reason
   means Gap? = yes. Count coverage as **n of m**, and list every gap.
2. **Check 2: runbook.** Write `RUNBOOK.md` at the repo root from the
   template: Install, Configure, Verify (a smoke test as an ordinary user,
   not an admin), Traps, Recovery (off switch, back-out, known good state),
   and the **Symptom → cause index**. Build the index from the design
   records' failure modes and the traps: one row per symptom. "Where to look"
   names only platform screens (lists, forms, system logs, the scheduler,
   system properties) and the app's own lists and logs. Name a screen by its
   table list (for example `sys_properties.list`) or mark it **VERIFY**. The
   runbook must stand alone. It must contain no source paths, no code, no
   design-record names or term numbers, and no secrets, credentials or
   instance hostnames. The diagnose session reads only this file. Check 2
   passes when every section is filled, every failure mode in the design
   records has an index row, and no VERIFY remains. Otherwise, list what is
   missing.
3. **Write a `HANDOFF.md` draft** from the template. Fill Check 1 (the table
   and n of m) and Check 2 (the link and what is not covered). Set Check 3 to
   "pending". Under Verdict, write "Draft: no verdict until the drill has
   run." Never write READY in a draft.
4. **Track the files.** When `RUNBOOK.md` or `HANDOFF.md` is first created,
   append `!/RUNBOOK.md` and `!/HANDOFF.md` to the end of `.gitignore`. Don't
   commit. Tell the person to commit `.gitignore` with the new files together
   on a branch, never on main.
5. Tell the person: "Next: `/prove-it:handoff plant`."

### `plant`

1. Read `RUNBOOK.md` and the design records. Propose **one** realistic
   failure a support person could meet on the test instance, for example
   a system property switched, a role taken from a user, or a scheduled job
   made inactive. Never propose anything destructive or anything on a
   production instance. **Never make the change yourself.**
2. Write the drill card to `$(git rev-parse --show-toplevel)/../drill-card.md`
   (the workspace, outside the repo; the allowlist also ignores
   `drill-card*.md`). If that file already exists, never overwrite it: write
   `../drill-card-<n>.md` with the next unused n (2, 3, …). It holds: the failure, exact steps to plant it, the
   symptom a user would report (the text to give the diagnose session), and
   the exact restore steps with a check that the restore worked. Leave blank
   lines for "Planted by", "Planted on" and "Restored on".
   Write the card even if the app isn't built or installed yet: mark any step
   you can't make exact as **VERIFY**, with what to confirm first. An
   unrestored card keeps the verdict NOT READY, which is correct.
3. Tell the person: plant it on the test instance, ideally someone else does
   it. Then open a **fresh session** in the repo root, with nothing else
   read, and run `/prove-it:handoff diagnose <symptom>`. Open the diagnose
   session with auto-memory off (start it with
   `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` for one session, or set
   `"autoMemoryEnabled": false` in the project's settings), or from a second clone inside the workspace (for example
   `<workspace>/diagnose/`, so `..` is still the workspace), so no memory
   from the build or plant sessions loads. A clone must include the current
   `RUNBOOK.md`: commit it on the branch first, or copy it in. Then **stop**.
   Never diagnose in this session.

### `diagnose`

1. **Check your own context first.** Refuse if any of these is true in this
   session:
   - a drill card has been read, pasted or shown (any `drill-card*.md`, or its
     contents);
   - a drill card was written in this session, or this session ran `plant`;
   - a design record (`DESIGN-*.md`) or `CONSULT.md` has been read or shown;
   - any auto-loaded memory or notes mention the drill, a planted change, or
     design-record content;
   - the current directory is not the repo root, for example the workspace
     root next to `CONSULT.md`.
   A file path only mentioned in an auto-loaded `CLAUDE.md` doesn't count. To
   refuse, name what you saw and say: "The drill tests whether the runbook
   alone is enough. I have already seen <it>, so any diagnosis I give would be
   worthless as evidence. Open a fresh session in the repo root and run
   `/prove-it:handoff diagnose` again." Then stop.
2. Otherwise read **only** `RUNBOOK.md`. Don't list or read `..`, `docs/`,
   `src/`, git history, or any other file. The only exception is the name
   check in step 5.
3. Get the symptom from the arguments, or ask for it. Record it word for word.
4. Diagnose step by step from the index. Match the symptom to a row, and ask
   the person to look where that row says and tell you what they see. Narrow
   it down one step at a time. If no row fits, say so. That is a runbook gap,
   not something to guess around.
5. Write the diagnosis notes to a new file for this attempt,
   `$(git rev-parse --show-toplevel)/../drill-notes-<n>.md`, where n = 1, 2, …
   is the next unused number. To find n, list names only
   (`ls ../drill-notes-*.md`). Never read an earlier attempt's notes: a second
   attempt must be as fresh as the first. The notes hold the exact symptom
   text, each step (the row used, what was checked, what was seen), the
   diagnosis and fix proposed, and any runbook gap. Don't read anything else
   in that folder.

### `verdict`

1. Read the `HANDOFF.md` draft, `RUNBOOK.md`, every drill card
   (`../drill-card.md`, `../drill-card-<n>.md`) and every
   `../drill-notes-<n>.md`, in number order. The drill is over, so you may
   read the cards now.
2. **Check 3** passes only if a diagnose session found the planted cause from
   the runbook alone, and every planted failure is restored. Restored means a
   person has filled in the "Restored on" line on **every** drill card; your
   own belief doesn't count, and one card left blank means NOT READY. Record
   every attempt from its own notes file. If the first attempt failed, the
   runbook was fixed, and a fresh second attempt succeeded, record both.
   Check 3 still passes on the second attempt.
3. Re-run check 1 and check 2 against the current repo, and don't rely on the
   draft's numbers.
4. Write `HANDOFF.md` from the template. The verdict is **READY** only if
   coverage is m of m, check 2 passes and check 3 passes. Anything else is
   **NOT READY**. Date it and name every blocking item. Fill Open items (item ·
   blocks · owner by role, never by name) and What PS receives.

## Output

- `RUNBOOK.md` at the repo root, from the template.
- `HANDOFF.md` at the repo root: a draft (no argument), then final (`verdict`).
- `../drill-card.md` (`../drill-card-<n>.md` for later plants) and one
  `../drill-notes-<n>.md` per `diagnose` attempt: all in the workspace,
  outside the repo, never committed.
- In every mode, anything recorded from command output (`now-sdk install`,
  `now-sdk auth`, logs) has the instance host replaced with `<instance>` and
  no URLs. Record the alias, never the host.

## Rules you can't break

- Never soften a verdict. A failed or missing check means NOT READY and names
  the item.
- Never write READY in a draft.
- The drill card is written outside the repo. Never commit it.
- Never plant, change or restore anything on an instance yourself.
- Never diagnose in the session that planted the failure.
- `diagnose` never sees the drill card or a design record. If it has, refuse.
- The runbook index uses only platform screens and the app's own lists and
  logs. No source, no design records.
- Owners are named by role, never by person.
- Never write secrets, credentials or instance hostnames into any output.

## Hand-off

After `diagnose`: "Notes are in `../drill-notes-<n>.md`. If the diagnosis
missed, fix the runbook, re-plant if needed, and run `diagnose` again in
another fresh session. It writes the next numbered file. Once the restore is
confirmed, run `/prove-it:handoff verdict`, which reads every notes file."
On READY: "Hand the repo, `RUNBOOK.md` and `HANDOFF.md` to the receiving team
(What PS receives lists it)." On NOT READY: "Close the open items (anything that
changes scope goes through `/prove-it:design-challenge amend` first), then run
the failed checks again and `/prove-it:handoff verdict`."
