---
name: opulent-gtm-intelligence
description: Evidence-backed GTM intelligence. Use when the user wants company or person research, account or candidate enrichment, a meeting brief, signal or competitor tracking, a relationship graph built from their own email/calendar/LinkedIn/CRM, warm-intro paths, or a client-ready intelligence report.
---

# Opulent GTM Intelligence

Answer a GTM decision with evidence. Every material claim carries a source and a confidence label (`Verified`, `Estimated`, or `Unknown`); every action taken leaves a receipt; anything not done is reported as `proposed` or `blocked`, in that vocabulary. Absence of evidence is context, not a finding.

## Default run

Most requests complete with these six steps and no extra files:

1. **Scope.** Name the decision being supported and the output: a reader-first brief (default) or a client report artifact (only when the user asks for a deliverable). State the people scope — one person, a supplied list, a calendar window, or the first-party network.
   *Done when: decision, output, and scope are stated in one short block.*
2. **Inventory.** Check what already exists: workspace graph store, saved packets, connected apps, Context CLI. Use what is `available`; record every absent source as `missing` or `unauthenticated` with the exact blocked read, and continue. Setup requests come after results, never before.
   *Done when: every candidate source has a status.*
3. **Research.** Cheapest tool first: cache and CRM → Context/`web_search`/`web_fetch` → browser only for dynamic, protected, or visual sources. One retrieval per unique person and per unique company; reuse results across the cohort.
   *Done when: the decision's material fields are Verified, or their gaps are named.*
4. **Analyze.** Score fit, timing, and relationships as component sums (components stay in the output). `Estimated` caps at 79, `Unknown` at 39. Distinguish a static fact from a dated change; only the change is a signal.
   *Done when: every score decomposes and every claim has its source and date.*
5. **Deliver reader-first.** Prose brief, then "do this next" actions (owner, action, when, one-clause why), then connections and paths in plain sentences, then dashboards where useful. The audit trail — contracts, budgets, receipts — comes after the decision content, never interleaved.
   *Done when: a reader could act without opening the audit trail.*
6. **Write back (when asked).** Drafts by default. A verified write needs a record match, an idempotency key, and read-after-write evidence; otherwise report it `drafted`, `proposed`, or `blocked`.
   *Done when: every mutation appears in the completion log with its receipt or its blocker.*

## Branches

Open a reference only when its trigger fires; each is self-contained for its branch.

| When the run involves | Open |
| --- | --- |
| Deep or multi-wave research design | `references/research-workflow.md` |
| Executing Context.dev endpoints, monitors, or webhooks | `references/contextdev-execution.md` |
| Tool routing edge cases, browser escalation, connector states | `references/runtime-tools.md` |
| Cohort budgets, calendar privacy, network-history scope | `references/people-scope-routing.md` |
| Building or refreshing the first-party network graph | `references/network-graph-build.md`, `references/network-graph-store.md` |
| Warm paths, introduction requests, "how do I know X" | `references/warm-path-activation.md` |
| Relationship edge types, tiers, strength scoring | `references/relationship-intelligence.md` |
| Signal contracts, change detection, job-change radar | `references/signal-intelligence.md` |
| Scheduled applications, enrichment waterfalls, CRM policy | `references/gtm-engineering-system.md` |
| CRM, email, calendar, storage, or intro mutations | `references/system-actions.md` |
| Merraine Group or Jeremy Sanchez | `references/merraine-client-context.md` |

## Client report artifact

Only when the user asks for a shareable report. Open `references/delivery-contract.md` and `references/template-field-guide.md`, build the packet, then:

```bash
python3 scripts/validate_graph_store.py <workspace>/graph   # when a graph store exists
python3 scripts/validate_intelligence_packet.py <packet.json>
python3 scripts/render_intelligence_report.py <packet.json> --output <directory>
```

*Done when: both validators pass, the export renders, and the overview plus one dossier have been inspected at desktop and mobile widths.*

## Guardrails

- Email ingestion is metadata only — participants, timestamps, thread keys. Bodies and subjects stay out of stores, packets, and provider calls.
- Pooling a member's network and naming a connector both require recorded consent.
- Introductions are drafted for the connector to send from their own account; sending is always a human action.
- Report statuses from records: `complete` needs a receipt, `proposed`/`blocked` say so plainly, and fallback work is never described as the tool it replaced.
