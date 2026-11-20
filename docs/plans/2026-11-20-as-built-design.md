# as-built: design (0.2.0, issue #21)

Agreed with the owner on 2026-11-20, section by section. The lab guide's side
is gapietro/agentic-build-lab-rkt-agentic#325.

## What it is for

After a build, nobody can see the whole app in one picture, and the kit's
written records (decisions, evidence, the runbook) don't show the thing
itself. `as-built` draws what was built, from the code and the instance, in
two sizes: a light "see what I built" picture, and a full turnover document.
The full document must break the agent down completely and show every data
flow.

The risk it is built around: an AI can draw a convincing diagram of an app
that isn't quite the one that was built. So every box names where it comes
from, and what couldn't be confirmed is listed, never drawn as fact.

## Decisions

| Question | Decision | Why |
|---|---|---|
| What the full mode produces | `docs/AS-BUILT.md` plus one formatted page, `docs/AS-BUILT.html` | The Markdown diffs in a PR and can be checked; the page can be sent to a team that never opens the repo |
| The runbook | Not written here. The full document links `RUNBOOK.md` and `HANDOFF.md` | `handoff` already writes both. #21 asked for a runbook draft: dropped, to keep one author per file |
| How the page is built | A dependency-free Node script in the kit, with the diagram library (mermaid) vendored and written into the page | The same page every run, offline and behind a firewall. A page written by the model would differ run to run and drift from the Markdown |
| Light mode's output | The same two files. Light builds the page too | On the day the diagrams open in a browser from a local file: no push, and the same on every surface |
| One file or two | One. A full run replaces a light one, and the light sections are a subset of the full ones | Nothing has two copies |
| Reading the instance | `now-sdk query --auth <alias>` only | The Foundry MCP tools the C4 skill uses aren't in a kit user's hands; `now-sdk` is |
| A real run | Not traced. The document describes the wiring | Offered and declined. Behaviour is listed under Not verified |
| The grade | Notes the document in Checks run, never scores it | Grades measured in dry runs stay what they were |
| The handoff | `verdict` lists the document by name. `diagnose` still reads only `RUNBOOK.md` | The drill tests the runbook alone |
| Release | 0.2.0 | A new skill |

## The shape

Light: The pieces · One record's path · As built against as designed · Not
verified. Exactly two diagrams, a flowchart and a sequence diagram.

Full: Summary · Context · The pieces · The agent (Workflow and trigger, Role
and instructions, Tools, Guardrails, What reaches the model) · Data flows (One
record's path, Other paths, Who writes and reads each table, A run's life,
Across the scope boundary) · Configuration · As built against as designed ·
Not verified · Where next.

Every diagram is followed by a sources table with a "Where it comes from"
column. A section with nothing to show says "None in this app."

## The builder

`skills/as-built/build-page.mjs <AS-BUILT.md> [--mode light|full] [--check] [--no-draw-check]`

- Parses only the Markdown the skill may write. Raw HTML, images, absolute
  links and instance hostnames are refused with a line number.
- Checks the fixed shape for the mode.
- Writes the page: neutral styling, light and dark, printable, each diagram
  with its text form kept for screen readers and for a diagram that fails.
- Opens the page in headless Chrome, Edge or Chromium when one is installed,
  and fails the build if a diagram doesn't draw. With no browser it says the
  drawing was not checked. The browser's output goes to a file and the
  browser is stopped once the file is complete: on macOS, Chrome printed the
  page and then never exited.
- `--check` compares a hash of the document, kept in the page, with the
  document as it stands. Modification times would break on a fresh clone.

## Not done, on purpose

- No C4 component or code level: the pieces diagram is the container view.
- No tracing of live runs.
- No check that a drawn box is truly on the instance: the sources table is
  there so that a person does that.
- No branding in the page. The kit carries none.
