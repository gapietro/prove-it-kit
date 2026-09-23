# Brief: Knowledge-gap finder

## Problem

The service desk resolves the same kinds of incidents again and again, and many
of them have no knowledge article. Agents solve each one from scratch, and users
can't self-serve. Nobody has time to spot the gaps, let alone write the articles.

## Users

- Service desk agents, who resolve incidents and would use the articles.
- Knowledge managers, who approve and own articles.
- A platform admin, who controls cost and can turn the feature off.
- End users, who read published articles on the portal.

## Capabilities requested

1. Find clusters of resolved incidents (last 90 days) that share a cause and fix
   and have no linked or matching knowledge article.
2. Rank the clusters by how many incidents they cover and how recently.
3. For a chosen cluster, draft a knowledge article with AI from the incidents'
   resolution notes, keeping a link back to every source incident.
4. Decide on its own which clusters are worth drafting and in what order, looking
   up extra context where it needs to.
5. Route each draft to a knowledge manager to approve, edit or reject, with a
   reason on rejection.
6. Admin controls: a monthly budget for AI drafting, a rate limit on drafts per
   hour, and an off switch that stops all drafting at once.
7. Measure the approval rate of drafts (approved as-is, approved after edits,
   rejected) and show it on a simple dashboard.

## Out of scope

- Publishing any article without a person's approval.
- Real production data; build and test with generated demo incidents only.
- Rewriting or retiring existing articles.
- Languages other than English.

## Success looks like

- Every cluster of 5 or more similar resolved incidents with no article is found.
- At least 60% of drafts are approved, as-is or after edits.
- AI drafting never exceeds the monthly budget; the off switch stops drafting within one minute.
- No article reaches the portal without an approval record.

## Size

About 15 stories. Assumes the instance has Now Assist and generative AI
entitlement enabled; if it does not, drafting (capability 3) is blocked.
