---
name: opulent-gtm-intelligence
description: Builds evidence-backed company research, account and candidate prospecting, competitive intelligence, meeting briefs, and CRM-ready next actions with Opulent's native search, fetch, Browserbase browser, computer, and connector tools. Use for target-account discovery, executive or candidate sourcing, prospect enrichment, buying-signal research, competitor matrices, battle cards, event prospecting, client demos, and any request to turn scattered web or app context into a verified GTM intelligence packet.
---

# Opulent GTM Intelligence

Turn research into an operator-ready decision packet. Optimize for the next conversation or action, not for a large pile of links.

## Load the right references

- Read `references/runtime-tools.md` before choosing tools or handling authenticated pages.
- Read `references/research-workflow.md` for discovery, enrichment, scoring, and competitor analysis.
- Read `references/delivery-contract.md` before producing the final packet.
- Read `references/system-actions.md` before CRM, email, calendar, or file-storage writes.
- Read `references/merraine-client-context.md` when the client, company, or contact is Merraine Group or Jeremy Sanchez.

## Core operating loop

1. Inspect existing workspace artifacts, prior research, CRM exports, email threads, client files, and saved packets. Reconcile before creating duplicate work.
2. State the decision the research must support: whom to target, whom to recruit, why now, how to differentiate, or what to do next.
3. Build or confirm a compact client profile: offer, ICP, geography, exclusions, proof points, known competitors, and desired output.
4. Select `quick`, `deep`, or `deeper` mode from `references/research-workflow.md`. Set a research budget and completion criteria before searching.
5. Run discovery waves across official sources, current signals, people, ecosystem adjacency, and comparisons. Search broadly, then gate candidates before expensive enrichment.
6. Enrich the selected companies and people. Keep official facts, external signals, and analyst judgment separate.
7. Score fit and timing from cited evidence. Use `Unknown` when evidence is missing; never turn an inference into a fact.
8. Synthesize the smallest useful client deliverable using `references/delivery-contract.md`.
9. Validate structured packets with `python3 scripts/validate_intelligence_packet.py <packet.json>`.
10. Perform requested system writes only after the relevant connection and authorization checks. Verify every write by reading it back.

## Evidence rules

- Attach a URL, app/thread identifier, or local file path to every material claim.
- Record source date and research date for time-sensitive facts.
- Label each field `Verified`, `Estimated`, or `Unknown`.
- Prefer first-party pages, filings, direct communications, and primary documents. Use directories and aggregators for discovery, then corroborate.
- Treat search snippets as leads, not final proof, unless the source page is inaccessible and the limitation is explicit.
- Never infer a company's product, industry, customer, or traction from design, framework, fonts, or generic marketing language.
- Never guess an email address, phone number, revenue, funding, hiring intent, or candidate interest.
- Cap company fit at 30/100 when the product or service cannot be verified.
- Cap person fit at 40/100 when current role or company cannot be verified.
- Give `false` and `not found` different meanings. Absence of evidence is `Unknown`.

## Human and external-action boundary

- Draft before sending unless the user explicitly authorized the external communication.
- Keep outreach claims traceable to the packet; do not invent familiarity or mutual connections.
- Require human review before bulk outreach, stage advancement based on judgment, or publishing competitive claims.
- Preserve opt-outs, suppressions, and do-not-contact status.
- Verify CRM, email, calendar, and file operations with returned IDs or read-after-write evidence.

## Completion criteria

Finish only when:

- the decision question is answered;
- every prioritized company and person has evidence, confidence, fit, timing, and a next action;
- competitor claims that drive positioning are spot-checked against primary sources;
- unknowns and blocked sources are visible;
- requested artifacts exist and pass validation; and
- requested system writes are verified or explicitly marked `drafted`, `blocked`, or `skipped`.
