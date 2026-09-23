---
name: consult
description: Use at the start of a ServiceNow build, before any design or code exists, to review a brief (default the single file in brief/) and write CONSULT.md in the workspace root with a modality, owner, cost bound and readiness for every capability.
---

# consult

## Purpose

Turn a brief into a pre-build review a person can act on. You decide, for each
capability, whether it is plain code, a Now Assist skill or an agent, and why.
You check it against the ServiceNow platform, bound its cost, and say how ready
each requirement is. You write no code and no design; the design is the next
stage's job, and a person does it.

## Input

Arguments given: `$ARGUMENTS` (may be empty).

- **Brief path (optional).** If given, read that file. If empty, read the single
  file in `brief/` in the current directory. If `brief/` is missing, empty, or
  holds more than one file, ask which brief to use. Never pick one yourself.
- **Workspace root** is the folder that holds `brief/`. When a brief path is
  given and the brief sits in a folder named `brief/`, the workspace root is
  that folder's parent; otherwise it is the current directory. `CONSULT.md` is
  written there, never inside an app repo.
- **Brief shape:** briefs follow `${CLAUDE_PLUGIN_ROOT}/templates/BRIEF.md`
  (Problem, Users, Capabilities requested, Out of scope, Success looks like,
  Size). If a section is missing or empty, ask about it in step 1.

## Steps

1. **Restate and stop.** Read the brief. Restate its constraints in **five
   bullets or fewer**: the problem, who it is for, what is out of scope, what
   success means, and any hard limit (size, data, entitlement). You may ask
   clarifying questions under the bullets. End with exactly:
   "Reply 'confirmed' or correct me."
   Then end your turn. Write nothing, and read nothing further, until the
   person replies. If they correct you, restate again and stop again. If asked
   to skip, show the restatement anyway and wait for the literal reply; a
   waiver is not a confirmation.
2. **Assign a modality to every capability.** Go through the brief's capability
   list one by one; skip none. Apply this rule:
   *plain code by default; a Now Assist skill only where language is the
   problem; an agent only where the steps can't be decided in advance — and
   say why.*
   Plain code covers anything whose steps you can write down: queries, counts,
   ranking, routing, approvals, limits, switches, dashboards. Call a capability
   an agent only if you can state why its order of steps can't be fixed in
   advance. If a brief asks for an agent and a fixed sequence would do, say so
   and propose the plain-code or skill version.
3. **Check the platform.** For every capability, work out:
   - Out-of-box tables it **reads** and OOB tables it **writes**. Never propose
     modifying an OOB workflow, state model or state values; extend with scoped
     tables or fields instead, and say so.
   - Scoped tables the app needs, and the scope prefix they live under.
   - Roles: who reads, who changes, who administers.
   - **Which code owns each write**: one owner per table (a script include, a
     flow, a skill's post-processing, a UI action). Two writers to one table is
     a finding.
   - now-sdk / Fluent feasibility. Mark anything you have not verified as
     **VERIFY** with what to check, including out-of-box table names. Never
     invent an SDK API, a Fluent object, a table or a plugin name.
4. **Bound the cost.** For every AI call (skill or agent), say what triggers it,
   roughly how often, and how it is bounded: a rate limit, a budget, and an off
   switch. An AI call with no bound is a finding, not a footnote. Label every
   number as an estimate with its assumption, or VERIFY.
5. **Rate readiness per requirement**: **ready** (can start now), **conditional**
   (can start once a named condition holds, such as an entitlement or a VERIFY
   item), or **not ready** (blocked; say by what). Use only these three words.
6. **List the foundation work**: what must exist before the first feature story
   (scope, scoped tables, roles, demo data, admin settings, the off switch).
7. **List open decisions**: questions only a person can answer, each with your
   recommendation and its trade-off.
8. **Write `CONSULT.md`** in the workspace root with the sections under Output,
   then show the person a short summary and the hand-off line.

## Output

`CONSULT.md` in the workspace root, dated, citing the brief by file name.
Sections, in this order:

1. **Constraints** — the confirmed restatement from step 1.
2. **Capabilities** — a table, one row per capability in the brief:

   | # | Capability | Modality | Reason |
   |---|---|---|---|
   | 1 | Count open requests per category | Plain code | Fixed query and sort; no language involved |

3. **Data and ownership** — table: table · OOB or scoped · read or write · owning
   code · roles.
4. **Cost** — each AI call, its trigger, and its bound (rate limit, budget, off
   switch).
5. **Readiness** — table: requirement · ready / conditional / not ready · why.
6. **Foundation work list** — numbered.
7. **Open decisions** — numbered, each with a recommendation.

## Rules you can't break

- Never write anything before the person confirms the restatement.
- Write no code, no Fluent, no scripts, and no design record.
- Every capability gets exactly one modality and a reason. No capability is
  left out.
- An agent needs a stated reason its steps can't be decided in advance.
- Every AI call gets a bound. No bound, say so as a finding.
- Never modify out-of-box workflows or states.
- Mark anything unverified as VERIFY. Never invent SDK APIs.
- Readiness uses only ready, conditional or not ready.
- Never write secrets, credentials or instance hostnames into `CONSULT.md`.

## Hand-off

Tell the person: "Next: `/prove-it:design-challenge` reads this `CONSULT.md`.
You design; it challenges." `CONSULT.md` stays in the workspace, outside the app
repo; design records cite it by name and date.
