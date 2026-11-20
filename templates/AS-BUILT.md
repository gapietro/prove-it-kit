# As built: <App name>

- Mode: full
- Read at: commit `<short sha>`, <date>
- Instance: alias `<alias>`, release <release>

A light document has only four of the sections below, in this order: The
pieces, One record's path (as a section of its own), As built against as
designed, Not verified. A full document has all nine, exactly as named here.
Remove this paragraph and every instruction line when you write the document.
A section with nothing to show says "None in this app." It is never left out.

Every diagram is followed straight away by its sources table. The column
"Where it comes from" names a file under `src/` (with a line where it helps)
or a table and record on the instance. Never draw a box you can't put in that
table.

## Summary

What the app does, for whom, in five lines or fewer. What it never does.

## Context

A flowchart: the people who use the app, the app as one box, and the platform
services it leans on.

| Piece | Kind | Where it comes from | On the instance |
|---|---|---|---|

## The pieces

A flowchart: every piece the app is made of (tables, jobs, rules, flows,
agents, tools, properties, UI) and the tables they touch.

| Piece | Kind | Where it comes from | On the instance |
|---|---|---|---|

## The agent

One set of these five subsections. With several agents or workflows, name each
one inside every subsection. With no AI in the app, each says "None in this
app."

### Workflow and trigger

The workflow and its agents, what starts a run, and who it runs as.

### Role and instructions

The agent's role and instructions, quoted word for word in a `text` code
block, with the file and lines they come from.

### Tools

| Tool | Type | Inputs | Outputs | Reads | Writes | Refuses when |
|---|---|---|---|---|---|---|

### Guardrails

| The agent can't | Enforced by | Where |
|---|---|---|

### What reaches the model

The record fields, articles and other data that are sent to the model, and
what is kept back.

## Data flows

### One record's path

A sequence diagram: one record from start to finish on the main path,
including the branch where the app refuses or leaves it alone.

| Step | What happens | Where it comes from | On the instance |
|---|---|---|---|

### Other paths

One `####` heading, sequence diagram and sources table for each other path:
every way a run can end, and every action a person can start.

### Who writes and reads each table

| Table | Written by | When | Read by |
|---|---|---|---|

### A run's life

A state diagram of the states a run or record moves through, from the choices
declared in `src/`.

| State | Set by | Where it comes from | On the instance |
|---|---|---|---|

### Across the scope boundary

| Outside table | Access | Declared in | Why |
|---|---|---|---|

## Configuration

Properties, roles, scheduled jobs and seed data.

| Name | Kind | Value as installed | What it controls |
|---|---|---|---|

## As built against as designed

One row for each place the build differs from a design record. "None found."
when there is none; "No design record in docs/." when there is nothing to
compare with.

| Design term | Designed | Built |
|---|---|---|

## Not verified

Everything drawn or stated above that could not be confirmed, and how a
person would confirm it. "Nothing: everything above was found." only when
that is true.

## Where next

- To install, run and fix the app: [RUNBOOK.md](../RUNBOOK.md).
- The handoff's verdict and open items: [HANDOFF.md](../HANDOFF.md).
- Why it is built this way: the design records in this folder.
