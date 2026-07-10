# Research, Prospecting, and Competitive Intelligence

## Contents

1. Build the baseline and data foundation
2. Detect recent changes
3. Discover candidates in waves
4. Gate before enrichment
5. Enrich through progressive waterfalls
6. Build signal and relationship intelligence
7. Score fit and timing
8. Build competitor intelligence
9. Design the activation play
10. Synthesize and learn

## Depth modes

| Mode | Use for | Typical evidence budget |
| --- | --- | --- |
| `quick` | Broad screening or a live call | Homepage, one current signal, one corroborating source |
| `deep` | Prioritized outbound, candidate outreach, or account planning | Official pages plus 3-6 external sources per priority target |
| `deeper` | Executive meeting, market map, or strategic positioning | Multi-lane research, primary-source spot checks, competitor matrix |

Choose the mode from the decision and number of targets. State the budget before research and stop when the completion criteria are met.

## 1. Build the baseline and data foundation

Confirm:

- client company and offer;
- ideal company profile and excluded categories;
- target roles or candidate archetypes;
- geography and timing;
- proof points and differentiators;
- known customers and competitors; and
- the decision the packet must support.

Inspect the system of record before discovery. Measure duplicates, unmatched people or companies, required-field coverage, staleness, suppressions, and protected human-owned fields. Define canonical identity keys and field ownership before proposing CRM updates.

Research the client with the same rigor as targets. A competitive matrix is invalid when the client row comes from memory.

## 2. Detect recent changes

Load `signal-intelligence.md`. Snapshot stable context once, then monitor volatile surfaces and compare each observation with the last verified baseline. Preserve `previous_state`, `current_state`, `delta`, effective date, observation date, expiry, evidence, and verification task.

Lead every prep brief with `What changed since last touch`. Use funding, headcount, biography, and firmographics as context; prioritize hires, departures, missed targets, product or pricing shifts, competitor moves, transformation programs, relationship activity, and other dated changes that alter the conversation.

Only unlock broad or expensive enrichment after a delta reaches the research threshold or a durable strategic reason independently justifies it.

## 3. Discover candidates in waves

Use distinct query waves so one search pattern does not define the universe.

Company waves:

1. Thesis: industry + size/stage + geography.
2. Lookalike: alternatives and adjacent companies to known strong fits.
3. Trigger: leadership changes, expansion, funding, new locations, hiring, M&A, compliance, or transformation initiatives.
4. Ecosystem: conferences, associations, partners, vendors, member directories, and awards.
5. Negative filter: remove directories, news articles, duplicates, existing customers, excluded categories, and stale entities.

People and candidate waves:

1. Current role and remit.
2. Prior relevant roles and domain depth.
3. Public work: talks, articles, interviews, boards, patents, or projects.
4. Relationship paths: shared institutions, events, associations, investors, partners, or verified mutual connections.
5. Freshness: role changes, promotions, public hiring signals, or recent activity.

Competitor waves:

1. `alternatives to {client}` and `{client} competitors`.
2. Precise category and outcome language.
3. `{client} vs`, `{seed competitor} vs`, and comparison-page titles.
4. Customer review, migration, pricing, and integration queries.
5. Category gate: `PASS`, `UNKNOWN`, or `REJECT` with a reason.

Deduplicate by canonical domain for companies and by verified profile plus current company for people.

## 4. Gate before enrichment

Enrich only candidates that can plausibly change the decision.

Company gate:

- verifiable product or service;
- ICP category fit;
- geography and scale fit;
- a normalized recent change with client-specific conversation value, or a durable strategic reason; and
- a lawful, credible route to a relevant person.

Person gate:

- current role verified;
- influence over the target outcome;
- relevant domain or functional experience;
- at least one public signal or clear role-based reason; and
- no suppression or do-not-contact conflict.

Competitor gate:

- same buyer and overlapping outcome;
- direct, adjacent, substitute, or status-quo category explicitly labeled;
- ambiguous or inaccessible pages surfaced as `UNKNOWN`, not silently rejected.

## 5. Enrich through progressive waterfalls

Load `gtm-engineering-system.md`. Keep lane and provider findings separate until synthesis.

1. Official surface: positioning, services, customers, locations, leadership, pricing, jobs, and proof.
2. Operational signals: expansion, technology, funding, partnerships, tenders, filings, hiring, and transformation.
3. People: current role, remit, background, public work, and verified contact paths.
4. External signal: news, interviews, reviews, discussions, conference appearances, and comparison pages with dates.
5. Competitive: differentiators, gaps, switching triggers, objections, and evidence-backed talk tracks.

Within each lane, enrich field by field from the system of record through first-party sources, connected providers, search/fetch, and Browserbase fallback. Stop when the required confidence is reached. Record every provider attempt, match value, conflict, source, date, freshness, and cost.

Add unique client-specific data points only after the data foundation is healthy. These should predict fit, timing, expansion, churn, candidate relevance, or relationship access; they should not be decorative research fields.

For hyperspecific people or candidates, use a connected Clodo-style people-discovery service when available. Preserve the natural-language query and verify the evidence behind any ranked match before activation.

For event prospecting, extract speakers or sponsors first, group by company, run the company gate, then enrich only people at passing companies.

## 6. Build signal and relationship intelligence

Load `relationship-intelligence.md`. Treat it as a required enrichment lane.

For each passing company and person:

1. Resolve canonical identities and current roles.
2. Search direct history, CRM activity, public engagements, placements, partners, board overlap, employer overlap, associations, events, and education.
3. Write typed edges with evidence, confidence, date, strength components, activation path, and risk.
4. Prefer one-hop paths. Use two hops only when both edges are independently verified.
5. Record `no verified path` instead of stretching weak evidence.
6. Rank the shortest truthful path alongside fit and timing.

Bundle related first-party and third-party changes at the account level. Add the before/after state, effective and observed dates, expiry, score components, affected people, relationship context, conversation angle, verification task, and activation policy. A common event such as funding or a job change is insufficient by itself; explain what changed for the decision maker and how it changes the next call.

## 7. Score fit and timing

Use a 100-point account score:

- ICP fit: 0-30
- current trigger or pain: 0-25
- decision-maker access: 0-15
- timing: 0-15
- evidence-backed personalization: 0-15

Use a 100-point person or candidate score:

- role or mandate fit: 0-30
- domain depth: 0-25
- current-company relevance: 0-15
- evidence of impact: 0-15
- timing and reachability: 0-15

Score each component separately. Add a one-sentence rationale and the evidence that changed the score. Do not reward narrative polish.

Priority bands:

- `80-100`: act now
- `60-79`: research or warm next
- `40-59`: nurture or monitor
- `0-39`: hold or reject

## 8. Build competitor intelligence

Create a shared atomic taxonomy before filling a matrix. Each row must be a yes/no or bounded comparison that means the same thing for every company.

For every strategic win or loss:

- verify the client's value;
- verify the named competitors' values;
- cite first-party evidence where possible; and
- rewrite the summary after any fact-check correction.

Build battle cards only from the verified research set. Include:

- where the client wins;
- where the client loses;
- landmine questions;
- likely objections and honest responses;
- switching triggers; and
- a talk track tied to the prospect's situation.

## 9. Design the activation play

When the work should repeat, define a GTM application from `gtm-engineering-system.md` before installing a schedule or webhook. Include trigger, input scope, incremental cursor, idempotency key, tool and spend budgets, concurrency, review gate, CRM policy, success metric, stop conditions, and escalation owner.

Run the smallest representative batch first. Read the outputs, measure false positives and write safety, then schedule only the version that passes.

## 10. Synthesize and learn

For each prioritized account or person, answer:

- Why this target?
- Why now?
- What evidence supports the angle?
- Who should engage?
- What should they say or ask?
- What is the next observable action?
- What is the shortest truthful relationship path, or why is there none?
- Which fields are safe to write autonomously, which require review, and which action needs explicit authorization?
- What result will teach the next scheduled run?

For executive-search and talent clients, connect both sides of the market:

- hiring-company signals and likely mandates;
- candidate pools and career-transition signals;
- shared sector, geography, institution, or transformation context; and
- the specific introduction, search thesis, or content angle that creates value.

## Completion packet

Produce both:

1. a structured JSON packet that passes `validate_intelligence_packet.py`; and
2. the polished HTML overview plus dossiers rendered from the bundled templates.

Before reporting completion, inspect the overview and one dossier, verify all relationship labels, and confirm that the rendered HTML contains no unresolved template tokens.

If the packet includes a GTM application or CRM updates, also inspect the application contract, protected-field policy, idempotency key, stop conditions, and verification receipt. Do not call a proposal active or a draft verified.
