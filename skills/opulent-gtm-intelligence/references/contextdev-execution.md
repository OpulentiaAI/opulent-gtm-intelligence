# Context.dev Execution for Top-of-Funnel Intelligence

Use Context.dev as Opulent's structured public-web execution layer. It resolves companies, enriches known people, searches and crawls the public web, extracts fact-checked JSON, parses documents, and maintains change baselines. It does not replace CRM truth, Clodo-style natural-language people discovery, Opulent corroboration, or Browserbase for authenticated and interaction-heavy work.

This reference was reconciled against Context's complete documentation corpus and published OpenAPI specification on 2026-07-13. The OpenAPI contract is the authority for methods, paths, and parameters; prose guides control routing, caching, retries, webhooks, and fair use.

## Mandatory operation contract

Never mention or schedule a Context capability as a vague verb such as `enrich with Context`. Write every proposed or executed operation in this human-readable form:

```yaml
natural_language_job: "Find recent public evidence that this account opened a new market, hired the buyer, or changed a product or price, then return only source-grounded fields."
method: POST
endpoint: https://api.context.dev/v1/web/extract
params: {}
body:
  url: https://example.com
  instructions: Find changes relevant to the named ICP and preserve their dates and source pages.
  schema: {type: object, properties: {changes: {type: array, items: {type: object}}}}
  factCheck: true
  maxPages: 10
  maxAgeMs: 0
  tags: [client:example, app:tof-enrichment, run:run_123, env:production]
expected_response: "Schema-shaped fields grounded in the crawled pages; unsupported values remain null or empty."
opulent_route: "Resolve identity, extract, corroborate high-consequence claims, score the delta, then propose allowed CRM diffs."
write_policy: review_required
status: proposed
receipt: null
```

The corresponding packet field is `context_operations[]`. It must preserve:

- `natural_language_job`, `method`, full `endpoint`, `params`, and `body`;
- `expected_response`, `opulent_route`, `write_policy`, and `status`;
- request `tags` naming client, application, run, and environment;
- evidence or an explicit statement that the call is only proposed;
- provider receipt, identifiers, credit usage, and verification when executed; and
- the downstream fields that are safe to write, require review, or are blocked.

Use natural language for the operator. Use the API contract for the runtime. Always provide both.

## Runtime and authentication

- Base URL: `https://api.context.dev/v1`
- Header: `Authorization: Bearer $CONTEXT_DEV_API_KEY`
- Keep `CONTEXT_DEV_API_KEY` server-side. Never embed or log it.
- Context secrets use the `ctxt_secret_` prefix.
- Pass `tags[]` or body `tags` on consequential calls. Use stable tags such as `client:<slug>`, `app:<slug>`, `run:<id>`, and `env:<name>`.
- Preserve response request identifiers and `key_metadata`, including provider credit data when returned.

## Endpoint decision map

| Natural-language job | Method and endpoint | Required and important parameters | GTM use |
| --- | --- | --- | --- |
| Search the current public web for accounts, initiatives, people, or changes matching a plain-English thesis | `POST /web/search` | body: `query`; optional `numResults` 10-100, `includeDomains`, `excludeDomains`, `freshness`, `country`, `queryFanout`, `markdownOptions`, `timeoutMS`, `tags` | Broad account and signal discovery; treat results as leads until verified |
| Extract an auditable record from a company or public page | `POST /web/extract` | body: `url`, JSON `schema`; optional `instructions`, `factCheck`, `followSubdomains`, `maxPages` 1-50, `maxDepth`, `pdf`, `includeFrames`, `maxAgeMs`, `waitForMs`, `stopAfterMs`, `timeoutMS`, `tags` | ICP qualification, trigger extraction, buyer and initiative fields; default `factCheck: true` for scoring or CRM |
| Crawl a public site into a research corpus | `POST /web/crawl` | body: `url`; optional `maxPages` 1-500, `maxDepth`, `urlRegex`, links/images, `useMainContentOnly`, `followSubdomains`, `pdf`, selectors, `maxAgeMs`, timing, `country`, `timeoutMS`, `tags` | Bounded discovery of leadership, customers, careers, products, docs, and proof |
| Read one known public page as markdown | `GET /web/scrape/markdown` | query: `url`; optional links/images, main-content flag, `pdf`, frames, selectors, `maxAgeMs`, `waitForMs`, `settleAnimations`, `headers`, `country`, `timeoutMS`, `tags` | Fast first-party verification; `maxAgeMs: 0` forces a fresh read |
| Parse a downloaded deck, PDF, DOCX, or other document | `POST /parse` | raw-byte body; query: `extension`, links/images, main-content flag, `ocr`, `pdf`, `tags` | Event lists, filings, board packets, case studies, and decks |
| Resolve and enrich a known LinkedIn person | `POST /people/retrieve` | body: `identifiers.linkedinUrl`; optional `timeoutMS`, `tags` | Known-person enrichment after discovery, not persona discovery |
| Resolve a company and foundational brand metadata | `POST /brand/retrieve` | one-of body `by_domain`, `by_name`, `by_email`, `by_ticker`, `by_direct_url`, or `by_transaction`; include identifier plus optional `maxAgeMs`, `timeoutMS`, `tags` | Canonical domain, company description, social and public routes, careers/blog/pricing/contact links |
| Warm company identity before a live enrichment path | `POST /utility/prefetch` | body: `type: brand`, `identifier.domain` or `identifier.email`; optional `timeoutMS`, `tags` | Free fire-and-forget cache warmup; never block the request on completion |
| Discover likely competitors to investigate | `GET /web/competitors` | query: `domain`, optional `numCompetitors` 1-10, `timeoutMS`, `tags` | Candidate competitor set only; verify category and first-party comparisons |
| Map a company to industry codes | `GET /web/naics`, `GET /web/sic` | query: `input`; optional min/max results; SIC also accepts `type`; `timeoutMS`, `tags` | Normalized segmentation and territory logic |
| Extract product or pricing intelligence | `POST /brand/ai/product`, `POST /brand/ai/products` | body includes page URL or domain; products supports `maxProducts` 1-12; optional `maxAgeMs`, `timeoutMS`, `tags` | Packaging, pricing, product families, displacement and renewal research |
| Capture a visual or design reference | `GET /web/screenshot`, `/web/styleguide`, `/web/fonts` | query includes target URL/domain and endpoint-specific options | Dossier polish and visual QA; never infer company facts from design |
| Maintain an exact or semantic baseline and emit diffs | `POST /monitors` plus monitor read/run endpoints | `name`, `target`, `change_detection`, `schedule`; optional `webhook`, `tags` | Always-fresh signal extraction, pricing/careers/leadership/product/change monitoring |

`POST /brand/ai/query` also provides structured company extraction through `specific_pages` and `data_to_extract[]`. Prefer `POST /web/extract` when an explicit JSON Schema and fact-check behavior make the result easier to audit.

## Core endpoint specifications

### Natural-language web discovery

Natural-language job: Search for public companies or recent events that satisfy the full ICP and timing thesis, not merely a title or industry filter.

```http
POST https://api.context.dev/v1/web/search
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{
  "query": "US hospital systems that announced a CEO transition or opened a permanent radiology leadership search in the last month",
  "numResults": 50,
  "freshness": "last_month",
  "country": "US",
  "queryFanout": true,
  "markdownOptions": {"enabled": true},
  "tags": ["client:merraine", "app:mandate-radar", "run:<run_id>", "env:production"]
}
```

Search supports familiar operators inside `query`. Use `includeDomains[]` for a controlled source set and `excludeDomains[]` for noisy directories. A search result is discovery evidence, not proof of the underlying claim.

### Fact-checked ICP and trigger extraction

Natural-language job: Visit the target's public site and return only the fields needed to decide fit, timing, buyer, and next action; leave unsupported values empty.

```http
POST https://api.context.dev/v1/web/extract
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{
  "url": "https://example.com",
  "instructions": "Find first-party evidence of the current offer, operating geography, relevant leadership, active initiatives, recent dated changes, careers growth, and public proof. Preserve source URLs and dates.",
  "schema": {
    "type": "object",
    "properties": {
      "canonical_company": {"type": ["string", "null"]},
      "icp_evidence": {"type": "array", "items": {"type": "object"}},
      "buyer_roles": {"type": "array", "items": {"type": "string"}},
      "recent_changes": {"type": "array", "items": {"type": "object"}},
      "unknowns": {"type": "array", "items": {"type": "string"}}
    }
  },
  "factCheck": true,
  "followSubdomains": false,
  "maxPages": 12,
  "maxDepth": 2,
  "maxAgeMs": 0,
  "stopAfterMs": 80000,
  "tags": ["client:<client>", "app:tof-enrichment", "run:<run_id>", "env:<environment>"]
}
```

`factCheck: true` is the default for fields that affect fit scores, outreach, or CRM. Unsupported fields remain null or empty. Preserve source pages from the response and corroborate performance, legal, security, regulatory, and competitive claims before activation.

### Known-person enrichment

Natural-language job: Enrich the person Clodo or another source already discovered, using the verified LinkedIn URL as the identity key.

```http
POST https://api.context.dev/v1/people/retrieve
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{
  "identifiers": {"linkedinUrl": "https://www.linkedin.com/in/<slug>"},
  "timeoutMS": 30000,
  "tags": ["client:<client>", "app:person-enrichment", "run:<run_id>", "env:<environment>"]
}
```

Expected response surfaces include profile, education, experience, skills, URLs analyzed, source-attempt status, and metadata. This endpoint enriches a known person. Use a connected Clodo-style service for natural-language discovery such as `health-system CFOs who led a turnaround and recently changed jobs`.

### Company identity and cache warmup

Natural-language job: Resolve an inbound email or form domain to a canonical company and the public routes needed for enrichment.

```http
POST https://api.context.dev/v1/utility/prefetch
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{"type":"brand","identifier":{"domain":"example.com"},"tags":["client:<client>","app:inbound-prefetch","run:<run_id>","env:<environment>"]}
```

Then:

```http
POST https://api.context.dev/v1/brand/retrieve
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{"type":"by_domain","domain":"example.com","maxAgeMs":2592000000,"tags":["client:<client>","app:inbound-enrichment","run:<run_id>","env:<environment>"]}
```

Use `by_email` only for a work email; free and disposable providers are rejected. Useful returned routes include careers, blog, pricing, contact, privacy, and terms pages. Stable brand data can normally use a 30-day application TTL; volatile pages require a fresh or bounded read.

## Context monitors as signal infrastructure

Use only supported target/detection pairs:

- page target + exact detection;
- sitemap target + exact detection; or
- extract target + semantic detection.

The first run creates a baseline and reports no change. It is not a retroactive signal.

Natural-language job: Watch a company's leadership, careers, pricing, product, status, filing, or public-mandate surface and emit evidence-bearing changes that can change a conversation.

```http
POST https://api.context.dev/v1/monitors
Authorization: Bearer $CONTEXT_DEV_API_KEY
Content-Type: application/json

{
  "name": "Merraine target leadership and mandate radar",
  "target": {
    "type": "extract",
    "url": "https://example-health-system.org",
    "instructions": "Track named executive arrivals and departures, interim or permanent leadership vacancies, retained-search announcements, service-line expansion, and board-approved transformation work. Include the page and before/after evidence.",
    "schema": {
      "type": "object",
      "properties": {
        "leadership": {"type": "array", "items": {"type": "object"}},
        "mandates": {"type": "array", "items": {"type": "object"}},
        "initiatives": {"type": "array", "items": {"type": "object"}}
      }
    },
    "max_pages": 20,
    "max_depth": 2,
    "follow_subdomains": false
  },
  "change_detection": {"type": "semantic", "confidence_threshold": 0.8},
  "schedule": {"type": "interval", "frequency": 1, "unit": "days"},
  "webhook": {"url": "https://<opulent-runtime>/webhooks/context", "events": ["change.detected", "run.completed"]},
  "tags": ["client:merraine", "app:mandate-radar", "env:production"]
}
```

Monitor API surface:

- create/list: `POST /monitors`, `GET /monitors`;
- inspect/update/delete: `GET`, `PATCH`, `DELETE /monitors/{monitor_id}`;
- run history: `GET /monitors/{monitor_id}/runs`, `GET /monitors/runs`;
- changes: `GET /monitors/{monitor_id}/changes`, `GET /monitors/changes`, `GET /monitors/changes/{change_id}`;
- run now: `POST /monitors/{monitor_id}/run`;
- governance: `GET /monitors/credit-usage`, `GET /monitors/limits`.

Treat `run now` as asynchronous and verify in run history. Updating the target or change-detection configuration resets the baseline. Pause the monitor instead of silently deleting an investigation trail.

### Webhook verification

1. Read the raw request body before JSON parsing.
2. Parse `X-Context-Signature: t=<unix>,v1=<hex>`.
3. Compute HMAC-SHA256 over `"<t>.<rawBody>"` with the monitor webhook secret.
4. Compare in constant time and reject timestamps outside the runtime tolerance, normally five minutes.
5. Route using `X-Context-Event` and deduplicate with `X-Context-Id`.
6. Store `monitor_id`, `run_id`, `change_id`, signature result, delivery time, and provider credit receipt.

`change.detected` fires only when a change is found. `run.completed` fires after every completed run. Preserve exact diff/excerpts, sitemap URL additions/removals, or semantic importance/confidence/evidence. Semantic alert payloads remain diffs with evidence; the extraction schema shapes the baseline but does not replace the change record.

## Executable top-of-funnel plays

### 1. Inbound speed-to-intelligence

1. Natural language: `Resolve this form submitter's work domain, determine whether the company fits the ICP, identify the likely buyer, and surface one recent change that improves the first conversation.`
2. API: fire `POST /utility/prefetch` as soon as the domain arrives.
3. API: call `POST /brand/retrieve` by domain or work email.
4. API: call `POST /web/extract` with the client-specific ICP/trigger schema and `factCheck: true`.
5. Opulent: deduplicate against CRM, attach relationship edges and inbox/calendar history, corroborate the selected change, score it, and draft a short lead brief.
6. Write only verified identity, source, observed time, signal object, and last-enriched timestamp autonomously. Keep owner, stage, forecast, relationship strength, and outreach review-controlled.

### 2. Plain-English ICP to a ranked, always-fresh pipeline

1. Preserve the operator's full natural-language persona or company thesis.
2. Use Clodo-style discovery when the thesis depends on messy person criteria; use `POST /web/search` when it depends on public accounts, pages, or events.
3. Resolve each account with `POST /brand/retrieve`; resolve known LinkedIn people with `POST /people/retrieve`.
4. Gate with a fact-checked `POST /web/extract` schema before contact enrichment.
5. Rank with visible ICP, timing, relationship, and evidence components.
6. Create Context monitors only for passing accounts and volatile surfaces. Route meaningful changes to the existing CRM rather than maintaining a separate list.

### 3. Hiring, leadership, and mandate radar

Monitor careers, leadership, newsrooms, board packets, and relevant sitemaps. For a high-value semantic change, fetch the full change record, corroborate its effective date, resolve affected people, attach the shortest truthful relationship path, and create `What changed since last touch`. Executive-search clients can run this on both sides: likely hiring mandates and candidates whose role, work, or company changed.

### 4. Competitor displacement and closed-lost reheat

Use `GET /web/competitors?domain=<domain>&numCompetitors=5` to generate a candidate set, then verify the category. Extract packaging and pricing through product endpoints or a fact-checked schema. Monitor pricing, comparison, changelog, documentation, and status surfaces. Reheat a closed-lost account only when a new verified change alters the original loss condition; do not recycle static competitor data as a signal.

### 5. Event, expert, and niche-person sourcing

Parse a public event PDF or page with `POST /parse`, `/web/scrape/markdown`, or `/web/extract`. Group speakers, experts, or sponsors by company and gate the companies. Use Clodo-style natural-language search for people whose fit depends on publications, systems built, credentials, or prior mandates. Use `/people/retrieve` only after a LinkedIn identity is known. Preserve the query, match rationale, sources, and enrichment receipt.

### 6. Team-wide living pipeline

Store each reusable natural-language search as a versioned application. Share canonical records, not exported copies. Use Context monitors to keep public deltas fresh and Opulent schedules/webhooks to bundle, score, notify, and write safe diffs. Track query precision, accepted signals, meetings, placements or pipeline, credits per accepted lead, false positives, and reviewer corrections.

These plays take inspiration from Clodo's public `Search -> Understand -> Enrich -> Reach` motion and customer patterns: hyperspecific natural-language queries, repeated searches becoming live pipelines, multi-signal account timing, shared CRM-centered data, and parallel company/person sourcing. They are workflow patterns, not copied performance claims.

## Caching, retry, cost, and error policy

- Cache stable brand identity for about 30 days, product data for about 7 days, and NAICS/SIC until the underlying classification changes.
- For volatile signal surfaces, use `maxAgeMs: 0` when freshness is necessary or a bounded window that matches the decision.
- Retry only `429`, `408`, and `500`. Honor `Retry-After` for `429`; otherwise use exponential backoff with jitter.
- Do not retry `401`, `422`, or input-validation failures. Treat inaccessible and not-found sites as explicit outcomes, not empty success.
- Read `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; throttle before exhausting the plan.
- A `200` can still be sparse. Preserve `Unknown`; never manufacture missing facts.
- Management calls for monitors are free; monitor runs and extraction/crawl work consume credits according to the current plan and endpoint. Query `GET /monitors/credit-usage` and `GET /monitors/limits` rather than hard-coding a volatile allowance.
- Budget credits per stage and stop expensive enrichment when the gate fails.

## Legal and fair-use boundary

Respect source terms, robots directives, privacy and data-protection rules, contact permissions, and the client's lawful purpose. Do not imply a brand endorsement, alter protected brand assets without permission, or use public data deceptively. Do not locally cache assets that the provider contract forbids caching. Preserve suppressions and never turn a public profile into inferred personal contact data.

## Source index

- Full Context docs index: `https://docs.context.dev/llms.txt`
- Full combined Context corpus: `https://docs.context.dev/llms-full.txt`
- Published OpenAPI: `https://app.stainless.com/api/spec/documented/context.dev/openapi.documented.yml`
- Context monitoring guide: `https://docs.context.dev/monitoring/overview`
- Context web extract guide: `https://docs.context.dev/web-extract/overview`
- Context best practices: `https://docs.context.dev/guides/best-practices`
- Context fair use: `https://docs.context.dev/guides/fair-use`
- Clodo sales prospecting: `https://clodo.ai/clodo-for-sales`
- Clodo sourcing: `https://clodo.ai/sourcing-and-placement`
- Clodo customer patterns: `https://clodo.ai/customers/acctual`, `https://clodo.ai/customers/flagright`, `https://clodo.ai/customers/usnews`, `https://clodo.ai/customers/eragon`
