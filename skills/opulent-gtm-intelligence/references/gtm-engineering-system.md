# GTM Engineering Operating System

Build compounding revenue workflows, not one-off research dumps. Treat the outcome as the unit of work and the prompt as one possible trigger.

## Contents

1. Opulent operating thesis
2. Record state machine
3. Data foundation and enrichment waterfall
4. People discovery and Clodo routing
5. Signal and relationship intelligence
6. Scheduled GTM applications
7. Autonomous CRM policy
8. Evaluation and learning loop
9. Source-derived patterns

## 1. Opulent operating thesis

The `GTM Engineering at Opulent` deck defines the system:

- Work across six layers: infrastructure, data, research, outbound, system, and strategy.
- Delegate an outcome, not a prompt. Accept chat, webhook, schedule, CRM event, email, spreadsheet, or human review as the trigger.
- Choose proof before production: ledger check, diff, browser record, reviewer signoff, or client-ready packet.
- Use signals to show relevant knowledge. Do not manufacture personalization.
- Make the system forkable, versioned, testable, and reusable.
- Centralize governed application logic and decentralize invocation. Let recruiters and sellers ask in chat, email, CRM, or Slack while the same versioned workflow runs underneath.
- Let cost collapse expand the work worth doing: every priority record can receive research, not only the top ten.
- Write results back into the systems the team already uses so intelligence compounds.

## 2. Record state machine

Move every company or person through explicit states:

`sourced -> resolved -> gated -> enriched -> modeled -> queued -> written -> activated -> measured`

Terminal or holding states are `rejected`, `suppressed`, `stale`, `blocked`, and `needs_review`.

Every record must carry:

- a canonical identity key;
- current state and previous state;
- source and source date for material fields;
- confidence and last verification time;
- owner, next action, and next refresh time;
- relationship and signal references;
- suppression and contact-permission state; and
- a run ID plus application version.

Never skip identity resolution before enrichment or a duplicate check before a write.

## 3. Data foundation and enrichment waterfall

Start with data health before activating a play:

1. Measure duplicate rate, stale-field rate, required-field coverage, unmatched identities, and protected human-owned fields.
2. Resolve companies by canonical domain plus CRM ID. Resolve people by verified profile, current company, verified email, or source ID.
3. Define field ownership. Human-verified values beat estimates. System-of-record values beat copies unless a newer verified source proves a change.
4. Build an ordered waterfall per field. Stop when the required confidence is reached.

Use this default waterfall:

1. Existing CRM and direct communications.
2. Context company resolution and cache prefetch for known domains or work emails.
3. First-party company, person, filing, event, or public-record source, shaped through Context fact-checked extraction when useful.
4. Connected Clodo-style people discovery or other licensed provider.
5. Opulent search and fetch for breadth and independent corroboration.
6. Browserbase browser for rendered, protected, paginated, or authenticated evidence.
7. Analyst inference, always labeled `Estimated` and never used as verified contact data.

For every provider attempt, record `provider`, `attempted_at`, `result`, `value`, `confidence`, `source`, `cost`, and `fresh_until`. Distinguish `not found`, `blocked`, `conflict`, and `not attempted`.

Enrich in progressive layers:

- **Identity**: canonical company, person, current role, domain, CRM IDs.
- **Foundation**: firmographics, geography, ownership, verified contact routes.
- **Unique data**: client-specific attributes that predict fit, expansion, churn, or talent relevance.
- **Signals**: dated changes and first-party activity.
- **Relationships**: direct and two-hop evidence, activation path, reciprocity, and risk.
- **Activation context**: message angle, proof, owner, route, and review gate.

Do not spend expensive enrichment calls on records that fail the gate. Test new waterfalls on a bounded sample before scaling.

## 4. People discovery and Clodo routing

Load `people-scope-routing.md` first. Route a named individual as `single_person`, supplied names/files/CRM views as `user_list`, and meeting attendees from an explicit calendar window as `calendar_derived`. Deduplicate before providers, share company results, and define the Context ceiling from eligible unique identities.

When Clodo or an equivalent people-discovery connector is available, use it for criteria that title filters cannot express:

- exact persona described in natural language;
- former employees, champions who moved, experts, niche candidates, or decision makers;
- current hiring, career, social, tool-evaluation, research, or regulatory signals; and
- contact or profile enrichment after the person passes the relevance gate.

Treat the returned rank as a discovery hypothesis. Preserve the search query, match rationale, underlying sources, freshness, and contact provenance. Verify any claim that drives outreach or CRM mutation.

Use the four-stage operating motion `Search -> Understand -> Enrich -> Reach`: preserve the plain-English ICP, rank with explainable fit and timing, enrich only passing identities, and activate through the existing system of record. Context makes the middle stages executable: `/brand/retrieve` resolves companies, `/people/retrieve` enriches known LinkedIn identities, `/web/extract` builds a fact-checked record, and `/monitors` keeps volatile evidence fresh. Every Context step must include the natural-language job and its exact API contract from `contextdev-execution.md`.

Use people discovery to feed and grade the CRM, not to create a second system of record. Deduplicate returned people before insert. Keep list membership and search rationale separate from durable person fields.

For calendar-derived people, keep the event and attendee provenance inside Opulent. Exclude self, internal participants, declined attendees, rooms, resources, distribution lists, and service accounts by default. Context receives only the minimum public identity input required for an approved lookup, never the calendar event payload.

## 5. Signal and relationship intelligence

Static data is context; recent change is conversation. Load `signal-intelligence.md`. Prefer client-specific deltas and compound multiple weak changes into one account-level view.

For each signal record:

- type, title, target, previous state, current state, normalized delta, observed date, effective date, and expiry;
- target company and relevant people;
- first-party or third-party source;
- novelty, magnitude, relevance, actionability, evidence-quality, and relationship-leverage components that add to a 100-point score;
- corroborating account, person, relationship, and CRM context;
- why it changes the call, conversation angle, verification task, activation route, and review policy; and
- outcome after activation.

Layer first-party activity with external changes when available. A job change becomes useful only after checking prior product use, new-company priorities, current stack, relationship history, and a truthful route to the person.

Bundle signals per account. Prefer one prioritized `What changed since last touch` digest over separate alerts that create noise. Load `relationship-intelligence.md` and attach the shortest truthful relationship path before routing a high-value signal. Refresh stable context only when its TTL expires; unlock deeper enrichment when a qualifying change appears.

## 6. Scheduled GTM applications

A GTM application is a versioned workflow that can run manually, on a schedule, or from an event. Define it before installing or activating it.

Required application contract:

- `name`, `version`, `objective`, and owner;
- trigger type: `manual`, `schedule`, `webhook`, `crm_event`, `calendar_event`, or `inbox_event`;
- schedule value and timezone when scheduled;
- input scope, canonical cursor, and deduplication key;
- ordered steps and per-step tool route;
- maximum records, tool calls, runtime, and spend;
- concurrency, lease, retry, and catch-up behavior;
- write policy and human review gate;
- output artifact and notification route;
- success metric and baseline;
- stop conditions and escalation owner; and
- last run ID, result, and next run.

Default to incremental runs from the last verified cursor. Use idempotency keys so retries do not duplicate records, tasks, alerts, or outreach. Pause on repeated authentication failures, error-budget breach, source drift, cost spike, or degraded precision.

Strong starter applications:

- inbound speed-to-intelligence: prefetch company identity, fact-check ICP and one recent change, attach relationship context, and write only safe verified fields;
- living natural-language pipeline: rerun a shared Clodo-style thesis, resolve and gate results, and add Context monitors only for passing accounts;
- leadership and mandate radar: monitor leadership, careers, board, and newsroom surfaces, then bundle meaningful changes into `What changed since last touch`;
- competitor displacement and closed-lost reheat: monitor pricing, product, comparison, documentation, and status changes that alter the original decision;
- two-sided search intelligence: run parallel company-mandate and candidate/expert pipelines, then connect them through verified relationship and timing evidence;

- pre-call account and relationship brief on calendar booking;
- weekly ICP and intent radar;
- champion job-change and relationship-path monitor;
- competitor mention and complaint monitor;
- CRM hygiene, dedupe, and stale-record refresh;
- stuck-stage and missing-next-step audit;
- closed-lost reheat that checks account history, open opportunities, departed champions, and net-new contacts before drafting a route back in;
- candidate or expert discovery refresh; and
- partner, referral, or event prospecting monitor.

Use Browserbase Functions or Opulent's native scheduler only when remote browser execution is required. Keep broad discovery on search and fetch.

## 7. Autonomous CRM policy

Use three policy levels:

### Autonomous safe fields

Write only deterministic, source-backed fields such as canonical URL, verified current title, firmographic field, dated signal, enrichment timestamp, or source reference. Require a record match, idempotency key, field-level diff, `Verified` confidence, and read-after-write evidence.

### Review required

Queue human judgment for account score, relationship strength, strategic angle, opportunity recommendation, owner change, stage change, forecast classification, deal value, candidate disposition, and any conflict with a human-verified value.

### Explicit authorization required

Require the runtime's action-time authorization for sending outreach, submitting forms or applications, creating meetings, changing permissions, deleting records, or transmitting sensitive data.

Treat these fields as protected from autonomous writes unless the client explicitly defines a narrower policy: `opportunity_stage`, `deal_value`, `forecast_category`, `owner`, `suppression`, `do_not_contact`, `message_sent`, and `candidate_status`.

Every write must include:

- system, action, target, record identifier, and idempotency key;
- before and after values;
- field confidence, evidence, and source date;
- policy level and approving actor when required;
- returned identifier and read-after-write verification; and
- result: `verified`, `drafted`, `blocked`, `skipped`, or `needs review`.

## 8. Evaluation and learning loop

Treat every production workflow as an experiment:

1. Choose the frequent, revenue-gating, rule-bound bottleneck.
2. Define the baseline and success metric.
3. Build a narrow workflow.
4. Run a 25-50 record sample or the smallest representative live batch.
5. Review outputs by hand and measure false positives, false negatives, and write safety.
6. Schedule only the version that passes.
7. Feed outcomes, corrections, and rejected updates back into the next run.

Track:

- enrichment coverage and verified-field coverage;
- duplicate, conflict, and staleness rates;
- accepted-opportunity and accepted-update rate;
- false-positive and false-negative rate;
- cost and latency per accepted record;
- time saved, meetings booked, reply rate, pipeline, or placement progress; and
- relationship-path activation and outcome.

Cache stable facts, bound tool calls, and allocate fair queues across clients. Change one material rule at a time and keep it only when a held-out scenario or production metric improves. Never let an automation repeat at full cost without learning from prior runs.

## 9. Source-derived patterns

Use these as design references, then adapt them to Opulent's runtime:

- Browserbase skills: company research, gating before enrichment, Plan-Research-Synthesize, bounded depth, event triage, atomic competitor matrices, high-stakes fact checks, and deployable browser functions: `https://github.com/browserbase/skills/tree/main/skills`
- Clodo: natural-language people discovery, live signal capture, contact enrichment, CRM feeding, and repeated persona searches: `https://clodo.ai/`, `https://clodo.ai/api`, `https://clodo.ai/customers/acctual`
- Clay: data foundation -> data modeling -> data activation, centralized functions for decentralized chat invocation, multi-provider waterfalls, custom signal bundles, small-batch tests, schedules, closed-lost reheat, and CRM write-back: `https://www.clay.com/blog/gtm-engineering`, `https://www.clay.com/blog/functions`, `https://www.clay.com/blog/signals`, `https://www.clay.com/blog/how-clay-uses-clay-from-inside-claude-and-chatgpt`, `https://www.clay.com/use-cases/crm-enrichment`, `https://www.clay.com/guides/how-to-do-gtm-engineering`
- Field Theory bookmark corpus: pre-call enrichment chain `https://x.com/fivosaresti/status/2072032494912704777`; bounded tools and caching `https://x.com/LangChain/status/2069769261778686044`; forkable Browserbase company research `https://x.com/JaySahnan/status/2047730585313980499`; signal-driven outbound `https://x.com/JaySahnan/status/2047368906420220237`; automation/event-driven sessions with auditability `https://x.com/dabit3/status/2057892146481414301`; cost-aware scheduled automation `https://x.com/maskaravivek/status/2060562913778160093`; an agent spine rather than point-automation sprawl `https://x.com/vasuman/status/2044453946199314648`; and eval-driven self-improvement `https://x.com/archiexzzz/status/2033258540312510702`.
- Signal-first pre-call thesis: static enrichment is context while recent changes create conversation; prioritize hires, performance shifts, and competitive moves: `https://x.com/jamiejreach/status/2072274862962606268`.
- Nim visual reference: narrow reading column, quiet zinc palette, rounded inset-ring surfaces, restrained typography, responsive layout, and dark mode adapted to Opulent's richer report shapes: `https://github.com/ibelick/nim`, `https://nim-fawn.vercel.app`.
