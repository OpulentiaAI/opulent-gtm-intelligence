# People Scope and Context Efficiency

Choose the intake mode before discovery or enrichment. The same workflow must handle one named person, a user-supplied cohort, people derived from a bounded calendar window, or a pooled first-party network history without turning every request into an expensive crawl.

## Contents

1. Scope contract
2. Single-person precision
3. User-supplied cohorts
4. Calendar-derived cohorts
5. Network-history cohorts
6. Context call planner
7. Identity, privacy, and failure policy

## 1. Scope contract

Add `discovery_scope` to the intelligence packet:

```json
{
  "mode": "single_person | user_list | calendar_derived | network_history",
  "source": "user_identified | uploaded_list | crm_view | outlook_calendar | other",
  "source_ref": "human-readable source or artifact/event handle",
  "objective": "The decision this cohort should support",
  "requested_count": 12,
  "candidate_count": 11,
  "deduplicated_count": 9,
  "eligible_count": 6,
  "unique_company_count": 4,
  "excluded_count": 3,
  "recurring": false,
  "identity_keys": ["linkedin_url", "work_email", "name_and_company"],
  "exclusions": ["internal attendee", "room or resource", "declined attendee"],
  "context_budget": {
    "max_people_retrievals": 6,
    "max_brand_retrievals": 4,
    "max_prefetches": 4,
    "max_extracts": 2,
    "max_monitor_creates": 0,
    "company_result_reuse": true,
    "skip_if_fresh": true,
    "cache_policy": "brand 30d; person until identity or role TTL expires; volatile pages decision-bounded"
  }
}
```

Counts describe the funnel:

`requested -> candidates -> deduplicated -> eligible -> enriched -> prioritized`

Preserve exclusion reasons by category. Do not silently drop a person. Use one canonical person key and one canonical company key before any provider call.

## 2. Single-person precision

Use when the user names one person or provides one profile, email, calendar attendee, or CRM record.

1. Resolve the person from existing CRM, inbox, calendar, supplied URL, or supplied work email before searching.
2. If a verified LinkedIn URL is known, use Context `POST /people/retrieve` once. Do not call it repeatedly for alternate spellings.
3. Resolve the current company once through cached CRM data or Context `POST /brand/retrieve`.
4. Use at most one Context `POST /web/extract` for the smallest missing decision schema: current role, company fit, recent change, buyer relevance, or public proof.
5. Use Opulent fetch for a known first-party page when full schema extraction is unnecessary.
6. Escalate to Clodo-style discovery only when the named person's identity or current role cannot be resolved. Escalate to Browserbase only for a dynamic or protected source.
7. Do not create a Context monitor unless the user asks for ongoing tracking or the packet defines a recurring application.

Default Context ceiling for a non-recurring single-person run:

- `people/retrieve`: 0-1;
- `brand/retrieve`: 0-1;
- `web/extract`: 0-1;
- monitor creates: 0.

Stop as soon as the decision question is answered. More pages do not make a one-person brief better.

## 3. User-supplied cohorts

Use when the user provides a list, file, CRM view, names several people, or identifies a group in prose.

1. Preserve the original row or source handle for traceability.
2. Normalize names, LinkedIn URLs, work emails, and company domains.
3. Deduplicate people by verified profile, then work email, then normalized name plus current company. Never merge on name alone.
4. Group the deduplicated people by canonical company domain.
5. Apply user exclusions, suppressions, internal-domain rules, and the person gate before Context.
6. Prefetch each eligible unique company domain once when latency matters.
7. Retrieve each unique company once and reuse the result across every person at that company.
8. Retrieve each known LinkedIn person at most once. Route people without known LinkedIn URLs to discovery or verification, not speculative Context calls.
9. Run fact-checked company extraction only for unique companies whose people pass the gate and whose missing fields affect the decision.
10. Rank after enrichment; do not enrich every row merely because it appeared in the list.

Return both the prioritized cohort and the audit counts: input, duplicate, excluded, unresolved, eligible, enriched, blocked, and prioritized.

## 4. Calendar-derived cohorts

Use a calendar connector to derive people when the user asks for meeting-based discovery, follow-up intelligence, network mining, pre-call preparation, or a cohort from prior/upcoming meetings.

### Calendar read contract

1. Read mailbox profile and timezone first when available.
2. Resolve the calendar scope and use an explicit ISO-8601 start and end. Never scan an unbounded calendar.
3. Use the calendar's bounded event-list operation for the window; fetch individual events only when attendee or organizer detail is incomplete.
4. Preserve calendar ID, event ID, organizer/attendee role, response status, meeting time, and extraction timestamp as private provenance.
5. Extract organizer and attendees according to the user's request. Do not assume all invitees attended.

`discovery_scope.calendar` must include:

```json
{
  "calendar_ids": ["default"],
  "window_start": "2026-07-01T00:00:00-05:00",
  "window_end": "2026-07-08T00:00:00-05:00",
  "timezone": "America/Chicago",
  "event_count": 18,
  "include_organizers": true,
  "include_required_attendees": true,
  "include_optional_attendees": false,
  "include_declined": false,
  "include_internal": false,
  "internal_domains": ["opulentia.ai"],
  "excluded_attendee_types": ["room", "resource", "distribution_list", "service_account"],
  "calendar_payload_sent_to_context": false
}
```

### Calendar eligibility rules

Exclude by default:

- the signed-in user;
- rooms, resources, distribution lists, bots, recording assistants, and service accounts;
- cancelled events;
- declined attendees when response state is available;
- internal-domain attendees unless the user asks for internal relationship intelligence;
- duplicate people across recurring occurrences or multiple meetings; and
- records already suppressed or marked do-not-contact.

Do not infer attendance from invitation alone. Label the relationship as `calendar co-invite`, `organizer`, `accepted attendee`, or `meeting participant` only when the evidence supports that exact state. A calendar edge is relationship context, not proof of familiarity, endorsement, or a warm introduction.

### Data minimization

Never send the event title, body, notes, full attendee list, Teams URL, calendar ID, or event ID to Context. Context receives only the minimum public identity input required by the chosen endpoint, such as one verified LinkedIn URL, canonical company domain, or work email when permitted. Keep calendar provenance inside Opulent's private packet.

After eligibility and deduplication, use the same shared-company plan as a user list. For pre-call work, prioritize the next external meeting and stop when the meeting brief is complete. For network mining, apply a fit or relationship gate before any deep extraction.

## 5. Network-history cohorts

Use `network_history` when the user asks to build, refresh, or query the pooled first-party network. Load `network-graph-build.md` and `network-graph-store.md` first.

- Set `source` to match the actual ingestion route: `connected_accounts` when live connectors supplied the data, `uploaded_list` for an export-file-only drop (email metadata export, calendar export, LinkedIn CSV, CRM export), or `other` with an explanation for a mix. Set `source_ref` to the named member sources (for example, "Jeremy's connected Gmail, calendar, and LinkedIn export").
- Bound the run by an explicit ingestion window; the default is 24 months. Never scan unbounded history.
- Name each pooled member and record consent before their sources contribute. Start with one member and expand deliberately.
- Funnel counts describe unique network contacts after the exclusions: the signed-in member, internal domains, bulk and list senders, rooms, resources, distribution lists, service accounts, and suppressed records.
- Graph building is local work. The Context budget covers only priority identities that pass a gate — not the network at large. Retrieving every network contact through a provider is never justified.
- Calendar-derived interactions inside the window inherit every rule in section 4, including the data-minimization contract.
- A `network_history` packet requires `network_health` with the connector discovery statuses. A `missing` source is recorded and reported, never silently skipped or silently claimed.

## 6. Context call planner

Plan calls from unique identities, not input rows.

| Stage | Call ceiling | Skip condition | Reuse key |
| --- | --- | --- | --- |
| Person identity | one `POST /people/retrieve` per eligible unique verified LinkedIn URL | fresh person record already answers identity/current-role question | normalized LinkedIn URL |
| Company foundation | one `POST /brand/retrieve` per eligible unique company | fresh canonical company record exists | canonical domain |
| Company prefetch | one `POST /utility/prefetch` per cold unique domain | brand is already warm or latency is not user-facing | canonical domain |
| Decision extraction | one `POST /web/extract` per passing unique company and decision schema | required fields are fresh, fetch is sufficient, or company fails gate | domain + schema version + freshness window |
| Web discovery | bounded `POST /web/search` per discovery thesis, not per person | cohort already supplied and identities are resolvable | normalized thesis + freshness |
| Monitoring | one monitor per unique target/configuration | non-recurring request, low-priority target, or equivalent monitor exists | target + detection config + application version |

Apply these controls:

- Use a two-pass waterfall: cheap identity/gate, then decision-specific enrichment.
- Share company results across people and share one extracted schema across the cohort when the decision fields are identical.
- Set `maxAgeMs` from volatility: stable company identity can be reused; recent-signal extraction uses a bounded or zero cache age only when freshness changes the decision.
- Prefer `/web/scrape/markdown` or Opulent fetch for one known page; do not crawl when one page answers the question.
- Use `maxPages` and `maxDepth` as deliberate budgets. Begin small and increase only when the missing field names justify escalation.
- Use `factCheck: true` only on structured fields that affect scoring, outreach, or CRM; this is worth the added work but should not be applied to decorative research.
- Bound concurrency below the remaining rate limit, honor rate headers, and keep per-record failures isolated.
- Tag all calls with client, application, run, and environment; add `scope:single`, `scope:list`, or `scope:calendar` when tag limits allow.
- Record cache hit/miss, call count, credits, latency, result, and skip reason. Report calls per eligible person and credits per prioritized person.
- Do not create a monitor merely to make a one-time run look autonomous.

For a cohort with `P` eligible unique people, `C` eligible unique companies, and `G` companies that pass the deep-enrichment gate, the normal upper bound is:

- people retrievals `<= P` and only where a LinkedIn URL exists;
- brand retrievals `<= C`;
- prefetches `<= C` and only for cold, latency-sensitive domains;
- fact-checked extracts `<= G <= C`; and
- monitor creates `0` unless the workflow is explicitly recurring, then `<=` priority unique targets without an equivalent monitor.

## 7. Identity, privacy, and failure policy

- Preserve the user's supplied identity rather than replacing it with a provider guess.
- Mark ambiguous identity matches `needs_review`; do not enrich or merge them automatically.
- Keep internal, personal, suppressed, and sensitive records out of external provider calls unless the user explicitly places them in scope and the runtime policy permits it.
- A missing LinkedIn URL is not permission to guess one.
- A work email can resolve a company; it does not prove a person's current role.
- Treat partial cohort completion as normal. Return successful, skipped, blocked, and unresolved rows with reasons.
- Never let one Context failure abort the entire list. Retry only according to `contextdev-execution.md`, then continue within the declared budget.
- Preserve an idempotency key per canonical person, company, extraction schema, and application version so scheduled re-runs do not duplicate work.
