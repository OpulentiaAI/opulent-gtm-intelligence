# Opulent Runtime Tool Routing

Use the cheapest tool that can produce reliable evidence. Context.dev is assumed installed, authenticated, and accessible through the runtime CLI; inspect its actual `--help` and relevant subcommand help before execution. Escalate only when the source requires it.

## Routing ladder

| Need | Preferred tool | Escalate when |
| --- | --- | --- |
| Resolve an inbound company, known domain, or work email | Runtime Context CLI executing `POST /utility/prefetch` then `POST /brand/retrieve` | Identity conflicts with CRM or the provider returns sparse data |
| Extract fact-checked ICP, initiative, buyer, or signal fields from public pages | Runtime Context CLI executing `POST /web/extract` with a client-specific JSON Schema and `factCheck: true` | A high-consequence claim needs corroboration or the page is authenticated/interaction-heavy |
| Maintain a before/after public-web baseline | Context `POST /monitors` with a supported target/detection pair | The source requires authentication, a browser action, or non-web system context |
| Enrich a known person with a verified LinkedIn URL | Context `POST /people/retrieve` | The person still needs discovery or current-role corroboration |
| Discover current sources, companies, people, events, or comparisons | `web_search` | The result needs page-level verification or an authenticated session |
| Read a known public URL as text | `web_fetch` | The page is JS-heavy, protected, incomplete, or interaction-dependent |
| Find a hyperspecific person or candidate from natural-language criteria | Connected Clodo or people-discovery tool | The result needs source verification, relationship context, or a fallback public search |
| Interact with a public or authenticated website | Browserbase-backed `browser_*` tools | The task depends on a local desktop app or local-only session |
| Run a browser-dependent application on a schedule or webhook | Opulent scheduler plus Browserbase function/session | Search or fetch can complete the work without a browser |
| Read or operate a local app | `computer_action`, `computer_batch`, or lower-level `computer_*` tools | A connector exposes the same data more directly |
| Read or write structured app data | The relevant connector/app tool | No connector is installed or authenticated |

Do not require the external `browse` CLI. Opulent already owns search, fetch, browser, computer, and connector surfaces.

Use the routing shape `resolve -> search/discover -> extract -> corroborate -> browser fallback`. Context resolves and structures public evidence; Opulent search/fetch broadens and corroborates; Browserbase handles rendering, protected pages, interaction, screenshots, and authenticated continuity. Do not pay browser latency for broad discovery.

## Context.dev

Load `contextdev-execution.md` before using Context. Inspect the installed CLI command surface rather than assuming command names. Every Context operation must expose the operator's natural-language job and exact API method, full endpoint, params/body, expected response, route, tags, write policy, status, and execution receipt. Use `POST /people/retrieve` only for a person whose LinkedIn URL is already known; use Clodo-style natural-language discovery to find people. Prefer `POST /web/extract` with `factCheck: true` for fields that affect scoring, outreach, or CRM. Use Context monitors for public before/after evidence and the Opulent scheduler for orchestration, bundling, relationship enrichment, notification, and governed writes.

If the Context CLI is unavailable or unauthenticated, mark the operation `blocked`, preserve the proposed exact contract, and continue through search/fetch/corroboration/browser only where those routes can produce truthful evidence. Never report fallback research as Context execution. The fixed escalation shape is `resolve -> search/discover -> extract -> corroborate -> browser fallback`.

## People discovery

Use Clodo or an equivalent connector for natural-language persona search, niche experts, former employees, champions who moved, decision makers, and candidates whose fit depends on messy multi-source criteria. Save the original query, result rationale, source set, freshness, and returned contact provenance. Treat rank as a hypothesis until the evidence that drives action is verified. Resolve known LinkedIn results through Context `/people/retrieve`, resolve their companies through `/brand/retrieve`, and fact-check action-driving fields before activation.

Before routing, load `people-scope-routing.md` and choose `single_person`, `user_list`, or `calendar_derived`. A named person gets a precision path. A list is deduplicated and grouped by company. A calendar cohort comes from an explicit time window and excludes self, internal attendees, declined attendees, rooms, resources, distribution lists, and service accounts by default. Never send private calendar content to a public-web provider.

## Search and fetch

Use `web_search` for breadth. Run independent query waves concurrently when the runtime supports it. Preserve title, URL, snippet, provider, and published date.

Use `web_fetch` for known public pages. Prefer official homepages, about pages, service pages, leadership pages, job pages, press releases, filings, trust pages, and documentation.

Use search snippets only to discover a source. Fetch or browse the source before promoting a claim to `Verified`.

## Browserbase browser

Use Browserbase through Opulent's native browser tools:

- `browser_start`: create the remote Browserbase session.
- `browser_navigate`: open a URL in the session.
- `browser_get_content`: read structured page content.
- `browser_extract`: extract targeted fields from a page.
- `browser_click`, `browser_type`, `browser_fill_form`: interact with page controls.
- `browser_screenshot` or `browser_screenshot_page`: capture visual evidence.
- `browser_get_live_view`: expose a live session for review or demo.
- `browser_get_logs`: inspect browser failures.
- `browser_get_downloads`: inspect downloaded artifacts.
- `browser_get_session` and `browser_list_sessions`: reuse or audit sessions.

Start one session per coherent authenticated workflow. Reuse it across pages to preserve cookies and reduce latency. Capture the final URL and a screenshot for visually material claims.

For repeatable scheduled browser work, prefer a deployed Browserbase function or Opulent-managed remote session with bounded inputs, versioned code, retry rules, and a run receipt. Do not deploy a function merely to wrap search or fetch.

Escalate from `web_fetch` to Browserbase when:

- rendered content is thin or missing;
- a page requires navigation, filters, pagination, or form interaction;
- a site presents bot protection or dynamic content;
- screenshots or visual comparison matter; or
- the task depends on an authenticated web session.

Do not use Browserbase merely because it is available. Search and fetch are faster for broad research.

## Computer tools

Use computer control for Outlook, local files, or other desktop apps only when a direct connector or API cannot supply the needed context. After every UI action, inspect fresh state before choosing the next action.

Reading is allowed within the requested scope. Before a UI action that sends a message, submits a form, changes permissions, deletes data, or transmits sensitive data, follow the runtime confirmation policy at action time.

## Connector and app discovery

Inspect available connectors before asking the user to configure anything. Prefer direct Outlook, CRM, calendar, storage, and spreadsheet connectors when available. If the connector is missing, continue with research that does not require it and report the exact blocked write or read.

Never fabricate tool names or assume a connector exists. Treat connection status as `available`, `missing`, `unauthenticated`, or `not required`.

## Structured data handoff

For large tables and documents, store the full artifact and return a bounded preview plus its handle or path. Carry forward the handle instead of resending the full body between steps.

Record for every consequential tool call:

- tool and purpose;
- source or target;
- timestamp;
- returned identifier or artifact path;
- verification result; and
- failure or retry status.
