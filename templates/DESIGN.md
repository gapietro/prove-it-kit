# Design record: <Feature>

## 1. Summary

What is being built and why, in three lines.

## 2. Context

Cite CONSULT.md by name and date (not a link: it lives in the workspace, outside the repo), and other sources the same way. Never paste them in.

## 3. Terms

Numbered C1, C2, … Each term is a single rule that a test or a person can check.

- C1:

## 4. Data and ownership

Each table, the code that owns writes to it, and the roles that can read or change it.

| Table | Owner of writes | Roles |
|---|---|---|

## 5. Failure modes and how each is handled

Each way it can fail and how that failure is handled.

| Failure | Handling |
|---|---|

## 6. Security and access

Roles, ACLs, scope boundaries and what data leaves the instance.

## 7. Gates

One row per gate this feature touches. Gate is one of merge, install, demo, handoff, publish. Pass criteria use numbers where possible.

| Gate | Pass criteria |
|---|---|

## 8. Rejected alternatives

| Option | Why rejected |
|---|---|

## 9. Approval

A person fills this in; a skill never does. The record is signed only when this table has a complete row and every drift-log row has Signed by filled in. A cell holding only a placeholder (TBD, pending, -, n/a, ?, Claude, or template text in <…>) counts as empty. An empty drift log passes. If any of this fails, the record is unsigned.

| Name | Role | Date | Signature |
|---|---|---|---|
| | | | |

## 10. Drift log

Every change to a term after signing. `amend` adds a row with Signed by left blank, which marks the record for re-signing until a person fills it in.

| Date | Term | Ruling | Signed by |
|---|---|---|---|
