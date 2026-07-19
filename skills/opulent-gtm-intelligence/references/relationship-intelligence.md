# Relationship Intelligence

Build a truthful graph of people, organizations, shared contexts, and activation paths. Use the graph to find the most credible route into a conversation, not to manufacture familiarity.

## Contents

1. Graph model
2. Evidence tiers
3. Relationship strength
4. Discovery workflow
5. Activation paths
6. Relationship-safe language
7. Completion standard

## 1. Graph model

Model nodes as `person`, `organization`, `role`, `event`, `institution`, `investor`, `partner`, or `engagement`.

Use explicit edge types:

- `works_at` or `worked_at`
- `reports_to` or `reported_to`
- `board_overlap`
- `colleague_overlap`
- `placed_at`
- `engaged_by`
- `client_claim`
- `partnered_with`
- `invested_in`
- `advised_by`
- `event_coattendance`
- `association_overlap`
- `education_overlap`
- `public_interaction`
- `introduced_by`

Interaction-derived edge types from the first-party network build (`network-graph-build.md`):

- `email_thread`
- `meeting`
- `linkedin_connection`
- `linkedin_message`
- `crm_activity`

Do not collapse different edge types into `knows`. Each edge must preserve what is actually known.

Use this shape:

```json
{
  "from": "Jeremy Sanchez",
  "to": "Example Health System",
  "type": "event_coattendance",
  "via": "2026 healthcare leadership summit",
  "strength": 64,
  "confidence": "Verified",
  "last_verified": "2026-07-10",
  "evidence": [{"url": "https://example.org/event", "date": "2026-06-20"}],
  "activation_path": "Ask about the panel's workforce-transformation theme; do not imply a personal introduction.",
  "risk": "Attendance does not prove the parties met."
}
```

## 2. Evidence tiers

| Tier | Evidence | Allowed conclusion |
| --- | --- | --- |
| A | Direct communication, CRM activity, calendar, signed engagement, public board record | State the documented relationship precisely |
| B | First-party bio, company page, public job listing, event roster, press release | State the public association with source and date |
| C | Reputable third-party reporting or directory corroborated elsewhere | State as `Estimated` and explain the basis |
| D | Name similarity, inferred email, social proximity, co-membership without interaction | Do not treat as a usable relationship |

Require Tier A or B evidence before describing an organization as a client, placement, partner, or warm path.

## 3. Relationship strength

Score every usable edge from 0-100:

- Evidence quality: 0-30
- Recency: 0-20
- Relevance to the current objective: 0-25
- Access potential: 0-15
- Reciprocity or demonstrated interaction: 0-10

Bands, with the client-facing labels used in reports and pooled-network views:

- `80-100` — `strong`: direct and actionable
- `60-79` — `familiar`: credible context; validate before asking for an introduction
- `40-59` — `weak`: useful personalization or monitoring signal
- `0-39` — `unknown`: background only

Keep the component scores in the audit data. A relationship does not become strong because the target is strategically attractive.

For interaction-derived edges, compute recency and reciprocity deterministically from the interaction ledger rather than by judgment:

- **Reciprocity (0-10)**: two-way thread count and meeting count with exponential recency decay; meetings weigh more than email threads; one-way sends contribute zero. Zero recorded interactions means reciprocity 0.
- **Recency (0-20)**: age of `last_interaction_at` against the ingestion window.

The formula version is recorded in the graph store manifest and recomputed on every refresh. A model never assigns these two components directly. Confidence caps bind the total: `Estimated` edges cannot exceed 79 and `Unknown` edges cannot exceed 39, so an inferred overlap can never present as `strong`. Tier D evidence is never a usable relationship regardless of score.

## 4. Discovery workflow

1. Seed the graph with the existing graph store when one exists (`network-graph-store.md`), then the client team, current accounts, verified public engagements, candidates, partners, and known competitors.
2. Resolve each person to a current role and canonical organization.
3. Search first-party bios, public job listings, board minutes, event rosters, press releases, association pages, CRM history, and direct communications.
4. Generate one-hop paths first: client person -> target person or organization.
5. Generate two-hop paths only when every edge is independently evidenced: client person -> intermediary -> target.
6. Stop at two hops. Longer chains look impressive but rarely support an honest introduction.
7. Deduplicate edges by `(from, to, type, via)` and keep the strongest current evidence.
8. Identify relationship gaps: missing current role, stale edge, unverified intermediary, or no lawful contact route.

## 5. Activation paths

Choose one activation mode per priority target:

- **Direct history**: reference the documented engagement or conversation.
- **Warm introduction**: ask the verified intermediary for permission before naming them externally.
- **Shared context**: reference the event, institution, sector, or public work without implying a personal relationship.
- **Value-first cold**: use the target's current trigger and client proof when no relationship exists.
- **Monitor**: wait for a stronger signal when the path is too weak.

Write the recommended owner, action, timing, and fallback. Include the exact risk that would make the path misleading.

## 6. Relationship-safe language

Use:

- `Both organizations appeared on the same public event roster.`
- `Merraine publicly identified this organization in a search listing.`
- `A board record documents an interim leader provided by Merraine.`
- `This may support relevant context; it does not prove a personal relationship.`

Avoid:

- `You know ...` without direct evidence.
- `Our client ...` when the only evidence is an old placement or proposal.
- `Mutual connection` when people only share an employer, school, or event.
- `Warm intro available` until the intermediary and route are verified.

## 7. Completion standard

A relationship-intelligence run is complete only when each priority target has:

- a verified node identity;
- zero or more explicit edges, including `no verified path` when none exists;
- evidence tier, confidence, date, and strength components;
- the shortest truthful path;
- an activation plan and risk statement; and
- a next verification action for stale or ambiguous edges.
