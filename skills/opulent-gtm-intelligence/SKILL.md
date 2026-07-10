---
name: opulent-gtm-intelligence
description: Builds evidence-backed company research, account and candidate prospecting, relationship intelligence, competitive intelligence, meeting briefs, polished HTML dossiers, and CRM-ready next actions with Opulent's native search, fetch, Browserbase browser, computer, and connector tools. Use for target-account discovery, executive or candidate sourcing, prospect enrichment, relationship mapping, warm-path analysis, buying-signal research, competitor matrices, battle cards, event prospecting, client demos, and any request to turn scattered web or app context into a verified GTM intelligence packet.
---

# Opulent GTM Intelligence

Turn research into an operator-ready decision packet. Optimize for the next conversation or action, not for a large pile of links.

## Reference loading contract

Load the smallest complete reference set for the requested branch:

- Always read `references/runtime-tools.md`, `references/research-workflow.md`, and `references/delivery-contract.md`.
- Read `references/relationship-intelligence.md` for every company, person, candidate, account, event, or outreach run. Relationship paths are a core enrichment lane, not an optional appendix.
- Read `references/template-field-guide.md` before creating client-facing HTML, JSON, CSV, or CRM-ready output.
- Read `references/system-actions.md` only before CRM, email, calendar, or file-storage writes.
- Read `references/merraine-client-context.md` for Merraine Group or Jeremy Sanchez work.
- Also read `references/merraine-public-examples.md` when a Merraine deliverable needs client examples, proof, demonstration data, or relationship seeds.

## Core operating loop

1. Inspect existing workspace artifacts, prior research, CRM exports, email threads, client files, and saved packets. Reconcile before creating duplicate work.
2. State the decision the research must support: whom to target, whom to recruit, why now, how to differentiate, or what to do next.
3. Build or confirm a compact client profile: offer, ICP, geography, exclusions, proof points, known competitors, and desired output.
4. Select `quick`, `deep`, or `deeper` mode from `references/research-workflow.md`. Set a research budget and completion criteria before searching.
5. Run discovery waves across official sources, current signals, people, ecosystem adjacency, and comparisons. Search broadly, then gate candidates before expensive enrichment.
6. Enrich the selected companies and people. Keep official facts, external signals, relationship edges, and analyst judgment separate.
7. Build the relationship graph from verified one-hop and two-hop paths. Score evidence, recency, relevance, access, and reciprocity using `references/relationship-intelligence.md`.
8. Score fit and timing from cited evidence. Use `Unknown` when evidence is missing; never turn an inference into a fact.
9. Synthesize the smallest useful client deliverable using `references/delivery-contract.md` and the assets in `assets/templates/`.
10. Validate with `python3 scripts/validate_intelligence_packet.py <packet.json>`, then render with `python3 scripts/render_intelligence_report.py <packet.json> --output <directory>`.
11. Inspect the rendered `index.html` and at least one account/person dossier before delivery.
12. Perform requested system writes only after the relevant connection and authorization checks. Verify every write by reading it back.

## Evidence rules

- Attach a URL, app/thread identifier, or local file path to every material claim.
- Record source date and research date for time-sensitive facts.
- Label each field `Verified`, `Estimated`, or `Unknown`.
- Prefer first-party pages, filings, direct communications, and primary documents. Use directories and aggregators for discovery, then corroborate.
- Treat search snippets as leads, not final proof, unless the source page is inaccessible and the limitation is explicit.
- Never infer a company's product, industry, customer, or traction from design, framework, fonts, or generic marketing language.
- Never guess an email address, phone number, revenue, funding, hiring intent, or candidate interest.
- Never claim a warm introduction, mutual relationship, client status, or placement without relationship-specific evidence.
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
- relationship paths include type, strength, confidence, evidence, freshness, and a truthful activation plan;
- unknowns and blocked sources are visible;
- requested artifacts exist, pass validation, and render without unresolved template tokens; and
- requested system writes are verified or explicitly marked `drafted`, `blocked`, or `skipped`.
