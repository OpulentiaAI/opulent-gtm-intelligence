# Opulent Runtime Tool Routing

Use the cheapest tool that can produce reliable evidence. Escalate only when the source requires it.

## Routing ladder

| Need | Preferred tool | Escalate when |
| --- | --- | --- |
| Discover current sources, companies, people, events, or comparisons | `web_search` | The result needs page-level verification or an authenticated session |
| Read a known public URL as text | `web_fetch` | The page is JS-heavy, protected, incomplete, or interaction-dependent |
| Interact with a public or authenticated website | Browserbase-backed `browser_*` tools | The task depends on a local desktop app or local-only session |
| Read or operate a local app | `computer_action`, `computer_batch`, or lower-level `computer_*` tools | A connector exposes the same data more directly |
| Read or write structured app data | The relevant connector/app tool | No connector is installed or authenticated |

Do not require the external `browse` CLI. Opulent already owns search, fetch, browser, computer, and connector surfaces.

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
