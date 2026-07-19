# Signal Intelligence: Recent Change as the Unit of Leverage

Static company and person data establishes context. A dated change creates a reason to act or a better question to ask. Build every priority view around the delta between a verified baseline and a current observation.

## Contents

1. Signal contract
2. Change-detection loop
3. Taxonomy and source plan
4. Scoring and expiry
5. Bundling and conversation design
6. Monitoring and CRM routing

## 1. Signal contract

Do not call a fact a signal until it answers all of these:

- **What changed?** Preserve `previous_state`, `current_state`, and a concise `delta`.
- **When did it change?** Record `observed_at`, `effective_at`, and `expires_at` separately.
- **Who is affected?** Resolve the account, relevant people, and relationship edges.
- **How well is it proven?** Preserve source kind, evidence, confidence, and a verification task.
- **Why does it matter to this client?** State offer relevance, magnitude, and `why_it_changes_the_call`.
- **What should happen next?** Provide a conversation angle, route, owner or application, and review policy.

Use this shape for every routed signal:

```json
{
  "type": "leadership_hire",
  "title": "New COO starts after missed operating target",
  "target": "Example Company",
  "observed_at": "2026-07-10T09:00:00-05:00",
  "effective_at": "2026-07-01",
  "expires_at": "2026-08-30",
  "previous_state": "COO role vacant",
  "current_state": "Named executive began as COO",
  "delta": "Vacant -> filled by an operator with turnaround experience",
  "source_kind": "first_party",
  "confidence": "Verified",
  "freshness_days": 9,
  "novelty": 18,
  "magnitude": 16,
  "relevance": 19,
  "actionability": 13,
  "evidence_quality": 15,
  "relationship_leverage": 7,
  "score": 88,
  "affected_people": ["New COO", "CEO"],
  "relationship_context": "Former client champion worked with the COO previously",
  "why_it_changes_the_call": "The conversation should test the new operating mandate, not repeat a generic company overview.",
  "conversation_angle": "Ask which operating constraint the COO was hired to change first.",
  "verification_task": "Confirm remit and start date on the company leadership page.",
  "route": "pre-call brief and account-owner review",
  "evidence": [{"url": "https://example.com/news", "date": "2026-07-01"}]
}
```

If a previous state cannot be proven, use `Unknown` and describe the observable event without inventing a delta. Do not assign an act-now score until the verification task resolves it.

## 2. Change-detection loop

Run `baseline -> observe -> diff -> normalize -> corroborate -> resolve -> score -> bundle -> route -> measure`.

1. **Baseline once.** Snapshot stable identity, offer, size, leadership, product, geography, competitors, relationship graph, and CRM state with field-level dates.
2. **Observe volatile surfaces.** Revisit only sources whose values can change: leadership, jobs, filings, earnings, product pages, pricing, status/security pages, reviews, partner pages, social posts, calendars, CRM activity, and inbox context.
3. **Diff before enriching.** Compare the observation with the last verified baseline. Store the changed fields and unchanged comparator.
4. **Normalize.** Map the event to a signal type, canonical account/person, effective date, and expiry policy.
5. **Corroborate.** Prefer the primary source. Use a second independent source for high-consequence performance, legal, security, or competitive claims.
6. **Resolve impact.** Identify affected decision makers, prior relationship history, current initiative, and the client-specific implication.
7. **Score and bundle.** Score the signal, suppress duplicates, and combine related changes into one account narrative.
8. **Route safely.** Draft the conversation angle, notification, task, or allowed CRM diff. Never let a score autonomously change a protected judgment field.
9. **Measure.** Record accepted/rejected signal, conversation outcome, opportunity impact, and reviewer correction.

Use the authenticated Context runtime CLI to execute `POST /monitors` for public-web baselines and preserve `context_monitor_id`, `context_run_id`, `context_change_id`, provider importance/confidence, before/after evidence, matched URLs, signature verification, and credit receipt. Inspect the installed CLI command surface first. If execution is blocked, preserve the proposed API contract and mark it blocked rather than implying success. Supported pairings are page/exact, sitemap/exact, and extract/semantic. The first run is baseline creation, not a change. Verify `X-Context-Signature`, route with `X-Context-Event`, and deduplicate with `X-Context-Id` before any enrichment or write.

Broad enrichment follows meaningful change. Do not repeatedly pay to refresh stable firmographics for an unchanged account.

## 3. Taxonomy and source plan

| Family | High-leverage changes | Preferred surfaces | Default expiry |
| --- | --- | --- | --- |
| People | hire, departure, promotion, champion move, board change | company leadership/news, filing, direct profile | 45-90 days |
| Performance | missed quarter, guidance change, margin pressure, layoffs, churn evidence | filing, earnings release/call, official notice | next reporting cycle |
| Competition | new entrant, displacement, pricing shift, new comparison, complaint cluster | competitor site, pricing, reviews, customer evidence | 30-60 days |
| Product | launch, deprecation, roadmap shift, outage, security incident | changelog, docs, status/security page | 14-60 days |
| Operating | hiring cluster, facility, geography, vendor or stack change, transformation program | jobs, procurement, partner page, official news | 45-120 days |
| Capital | funding, M&A, ownership, investor or board change | filing, official announcement | 60-120 days |
| Regulatory | rule, sanction, litigation, compliance deadline | regulator, court, official filing | event-specific |
| Relationship | meeting, reply, introduction, event interaction, dormant thread, prior placement | CRM, inbox, calendar, verified public interaction | 14-45 days |

Funding, headcount, and biography remain baseline context unless their change creates a client-specific implication. A generic funding announcement is not conversation-ready until the system identifies what the capital enables, who owns it, and why that matters now.

## 4. Scoring and expiry

Score evidence, not prose. Total six components for a 100-point signal score:

- novelty/recency: 0-20;
- magnitude of the change: 0-20;
- relevance to the client's offer or search thesis: 0-20;
- persona-level actionability: 0-15;
- evidence quality: 0-15; and
- relationship leverage: 0-10.

Use these bands:

- `80-100`: act now; place above the fold and route to an owner;
- `60-79`: research or warm next; close the named verification gap;
- `40-59`: monitor; retain in the change ledger without creating noise;
- `0-39`: context only; do not alert.

Apply these controls:

- cap an `Estimated` signal at 79;
- cap an `Unknown` signal at 39;
- do not route a high-consequence claim from a single weak third-party source;
- decay or expire signals automatically; and
- distinguish `new`, `updated`, `unchanged`, `stale`, `retracted`, and `conflicted`.

The scoring component values must add to `score`. Do not use an unexplained model score.

## 5. Bundling and conversation design

One signal can be noise. A sequence can reveal a mandate. Bundle changes by canonical account and decision window:

`missed quarter + COO hire + finance transformation jobs + competitor displacement`

Render the bundle as:

1. `What changed since last touch`;
2. `Before -> after` for each material change;
3. the evidence and confidence;
4. the account-level interpretation, explicitly labeled when inferred;
5. the shortest truthful relationship path;
6. the question this changes; and
7. the next observable action.

Do not turn a sensitive event into a presumptive pitch. Use the signal to ask a better question. Prefer language such as `I noticed`, `Has this changed`, and `How are you approaching` over `You must need`.

## 6. Monitoring and CRM routing

Define each signal monitor as a versioned GTM application with:

- watched entities and volatile fields;
- last verified cursor and source-specific refresh cadence;
- canonical signal ID and deduplication window;
- expiry/decay policy;
- score threshold and bundle window;
- enrichment budget that unlocks only after a qualifying delta;
- human review gate for interpretation and outreach;
- allowed CRM fields, idempotency key, and read-after-write verification;
- precision, acceptance, meeting, and pipeline metrics; and
- stop conditions for source drift, alert fatigue, cost spike, or poor precision.

Safe autonomous CRM fields include the dated signal object, evidence URL, observed time, expiry, and last-enriched timestamp when identity and confidence are verified. Strategic interpretation, relationship strength, opportunity stage, owner, forecast, and outbound remain review-controlled or authorization-controlled.

### Job-change radar

The highest-leverage people signal over a pooled first-party network is a tracked contact changing roles. Define it as a versioned scheduled application over the graph store:

- **Watchlist**: placed candidates, past and current client contacts, champions, and every contact on a `strong` or `familiar` edge. The watchlist derives from the graph store, not from a manual list.
- **Detection route**: Context monitors on leadership and team pages for watchlist companies, plus scheduled `people/retrieve` re-verification for watchlist people with verified LinkedIn URLs, plus Clodo-style "former employees of X" sweeps when a departure is suspected. Respect the planner ceilings; the watchlist gates who is worth a provider call.
- **Delta contract**: `previous_state` is the stored role with its `last_verified` date; `current_state` is the newly observed role. Emit a `champion_move`, `leadership_hire`, or `leadership_departure` signal with expiry 45-90 days. The relationship-leverage component comes from the existing edge band.
- **Dual routing**: a job change on a warm edge routes twice — as a conversation opportunity at the new company (the relationship travels with the person) and as a vacancy or mandate hypothesis at the old company. Both routes carry the shortest truthful path and the verification task.
- **Honesty**: a stale profile is not a departure. Require first-party or provider corroboration before scoring above 60, and never mark the radar's baseline pass as detected change.

Use Jamie Reach's July 1, 2026 observation as the operating thesis: static data is context; recent changes are conversation. Source: `https://x.com/jamiejreach/status/2072274862962606268`.
