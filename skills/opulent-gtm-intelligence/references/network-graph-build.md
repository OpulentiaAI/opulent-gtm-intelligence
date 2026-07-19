# First-Party Network Graph Build

Build a pooled, strength-scored relationship graph from the client team's own communication history, then activate it truthfully. Public research explains why a target matters; the first-party network explains how to reach them. This layer is self-contained: it requires no specific CRM, enrichment vendor, or graph database.

## Contents

1. Connector discovery gate
2. Scope contract
3. Privacy floor
4. Ingestion per source
5. Interaction ledger
6. Identity resolution
7. Edge derivation
8. Reciprocity and rescoring
9. Pooling and sharing rules

## 1. Connector discovery gate

Before any ingestion, enumerate the runtime's available connected apps and record every candidate source with a status from `runtime-tools.md`: `available`, `missing`, `unauthenticated`, or `not_required`.

- Candidate sources: email (Gmail/Outlook), calendar, CRM (any vendor), file storage, a user-supplied LinkedIn connections export, a user-supplied CRM export, and an existing graph store in the workspace.
- **Run ingestion on every `available` source. Never block on a missing one.** A run with only a LinkedIn export still produces a truthful, thinner graph.
- Record each `missing` or `unauthenticated` source in `network_health.sources[]` with the exact `blocked_read`, so the client can see what connecting another app would add.
- Never ask the user to install or connect anything before reporting what was ingestible.
- Never claim a source was ingested when its connector was absent. Source honesty follows the same rule as Context execution: fallback work is never reported as executed ingestion.

## 2. Scope contract

`network_history` is the fourth `discovery_scope.mode` alongside `single_person`, `user_list`, and `calendar_derived`.

- Bound the run by an explicit ingestion window. Default: 24 months.
- Name the pooled members explicitly. Each member requires recorded consent before their sources contribute edges. The pilot default is a single member; expand membership deliberately, not implicitly.
- Funnel counts describe network contacts: `requested -> candidates -> deduplicated -> eligible`. Exclusions include internal attendees, bulk senders, suppressed records, rooms, and resources; preserve exclusion reasons by category.
- Exclusions operate at two levels and both must stay visible: person-level exclusions (suppression, internal identity) reduce the funnel's `eligible_count`, while interaction-level exclusions (bulk_sender, internal, declined_attendee, room_or_resource) gate ledger rows without removing the person. Record the per-category interaction-exclusion counts in the store manifest and surface them in `network_health` (for example as an `exclusion_categories` object) so the funnel arithmetic and the ledger gate can each be audited on their own terms.
- The Context budget is keyed to eligible unique identities exactly as in `people-scope-routing.md`. Building the graph is a local operation; Context calls are reserved for priority people and companies that pass a gate.
- A `network_history` packet must include `network_health` with member consent, the window, source statuses, resolution rates, and edge coverage. The validator enforces this.

## 3. Privacy floor

These rules are absolute and validator-enforced where representable:

- **Email is metadata only**: sender, recipients, timestamp, and thread key. Bodies and subjects are never stored in the graph, the ledger, or the packet, and are never sent to Context, people discovery, or any public-web provider. `network_health.metadata_only` must be `true`.
- One-way sends score zero. Exclude bulk and list mail by unsubscribe headers and recipient-count threshold before it enters the ledger.
- Calendar ingestion inherits every minimization rule from `people-scope-routing.md`: attendees and timestamps only; no titles, bodies, notes, links, or event IDs leave the runtime.
- Per-contact `private` and `suppressed` flags block pooling, path output, intro drafting, and outreach.
- Do not scrape LinkedIn. The compliant ingestion path is the user's own connections export file; public-web enrichment uses the ordinary research surfaces.

## 4. Ingestion per source

| Source | Route | What enters the ledger |
| --- | --- | --- |
| Gmail / Outlook | Email connector, incremental from the per-source cursor | One metadata interaction per message: participants, direction, timestamp, thread key; `two_way` set when both directions exist in the thread |
| Calendar | Calendar connector with an explicit window | One `meeting` interaction per event per eligible external attendee set, after the eligibility rules |
| CRM (any vendor) | CRM connector or user-supplied export file | `crm_activity` interactions plus engagement facts (`engaged_by`, `placed_at`) with record IDs as evidence |
| LinkedIn export | User-supplied connections CSV | No interactions; connections become Tier C `linkedin_connection` edges pending reciprocated evidence |
| Existing store | Workspace artifact | Prior people, companies, edges, ledger, and cursors; the run applies deltas |

Ingest incrementally from `graph/cursors.json`. First run is baseline creation; later runs append deltas. Keep per-source failures isolated: a failing source becomes `unauthenticated` or `blocked` in `network_health` while other sources continue.

## 5. Interaction ledger

Append-only, one record per interaction:

```json
{
  "kind": "email | meeting | crm_activity | linkedin_message",
  "participants": ["person-id", "person-id"],
  "direction": "outbound | inbound | mutual",
  "two_way": true,
  "occurred_at": "2026-06-26T09:41:00Z",
  "thread_key": "thread-4471",
  "owner": "person-id of the member whose source produced it",
  "source": "gmail"
}
```

Forbidden fields: `subject`, `body`, `title`, `notes`, `description`, or any message content. The graph-store validator rejects them.

Roll the ledger up per contact into `interaction_rollup`: `interactions_12mo`, `two_way_threads`, `meetings`, `first_interaction_at`, `last_interaction_at`, `owners`, `sources`, and the derived `reciprocity_score`. A zero rollup is a truthful state, not a gap to hide: absence of interaction is not absence of relevance, and it is also not a relationship.

## 6. Identity resolution

Resolve in this order and never merge on name alone:

1. Verified email address.
2. Verified LinkedIn URL.
3. Normalized name plus current company.

Keep every merge's provenance. Store canonical people and companies with `dedup_keys`; a colliding dedup key means identities must merge, not coexist. Ambiguous matches are `needs_review` and never auto-merged or enriched. Enrichment of priority identities follows the existing waterfall in `gtm-engineering-system.md`; the graph build itself must not spend provider calls on non-priority contacts.

## 7. Edge derivation

Derive typed edges from evidence, never a generic `knows`:

| Evidence | Edge type | Default tier |
| --- | --- | --- |
| Two-way email threads | `email_thread` | A |
| Meetings held together | `meeting` | A |
| CRM engagement or documented placement | `engaged_by`, `placed_at`, `crm_activity` | A |
| LinkedIn connections export | `linkedin_connection` | C until reciprocated interaction is evidenced |
| Two-way LinkedIn messages (member-supplied) | `linkedin_message` | B |
| Public research | existing taxonomy in `relationship-intelligence.md` | per evidence tier rules |

Upsert edges by `(from, to, type, via)` keeping the strongest current evidence. Every edge carries `owner` (the member whose sources evidence it), `band`, `evidence_tier`, `strength_components`, `confidence`, `last_verified`, `activation_path`, and `risk`. All caps from `relationship-intelligence.md` apply: `Estimated` <= 79, `Unknown` <= 39, Tier D is never a usable relationship.

## 8. Reciprocity and rescoring

Strength stays the five-component 0-100 score from `relationship-intelligence.md`. For interaction-derived edges, compute the reciprocity and recency components deterministically from the ledger:

- **Reciprocity (0-10)**: from two-way thread count and meeting count with exponential recency decay; meetings weigh more than email threads. Zero recorded interactions means reciprocity 0.
- **Recency (0-20)**: from `last_interaction_at` age against the ingestion window.

The formula is pure, versioned in the store manifest, and recomputed on every refresh; a model never assigns these numbers directly. Present bands to the client as `strong` (80-100), `familiar` (60-79), `weak` (40-59), and `unknown` (0-39); the component breakdown stays in the audit data. A relationship does not become strong because the target is attractive, and an inferred overlap can never present as strong.

## 9. Pooling and sharing rules

- Every edge and every ledger record carries its owning member.
- Cross-member visibility is edge existence, type, band, and shared-context label only. Interaction detail (counts, dates, threads) is visible to the owner alone unless the owner explicitly shares it.
- `private` contacts never pool. Suppression and do-not-contact state propagates into paths, intros, and any outward mirror.
- Pooled searches answer "who on the team has a truthful route" without exposing how the owner knows the person beyond the edge label.
- When membership changes, re-run consent checks; a departing member's edges leave the pooled views.
