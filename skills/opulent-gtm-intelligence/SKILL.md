---
name: opulent-gtm-intelligence
description: Builds executable, evidence-backed top-of-funnel and GTM intelligence with Context.dev, Opulent search and fetch, Browserbase, computer, scheduler, connectors, and Clodo-style natural-language discovery. Use for company and person enrichment, target-account or candidate discovery, relationship mapping, recent-signal extraction, change monitors, competitive intelligence, pre-call briefs, scheduled GTM applications, polished dossiers, and policy-controlled CRM updates.
---

# Opulent GTM Intelligence

Turn research into an operator-ready decision packet. Optimize for the next conversation or action, not for a large pile of links.

## Reference loading contract

Load the smallest complete reference set for the requested branch:

- Always read `references/runtime-tools.md`, `references/research-workflow.md`, and `references/delivery-contract.md`.
- Read `references/contextdev-execution.md` for every company or person enrichment, public-web extraction, lead-scoring, Context monitor, or top-of-funnel application. Every Context capability must include its natural-language job and exact API method, endpoint, and parameters.
- Read `references/gtm-engineering-system.md` for enrichment design, signals, scheduled applications, evaluation, or CRM automation.
- Read `references/signal-intelligence.md` for every signal, pre-call, account-prioritization, monitor, or recurring-enrichment run. A signal must prove a recent delta, not merely repeat static context.
- Read `references/relationship-intelligence.md` for every company, person, candidate, account, event, or outreach run. Relationship paths are a core enrichment lane, not an optional appendix.
- Read `references/template-field-guide.md` before creating client-facing HTML, JSON, CSV, or CRM-ready output.
- Read `references/system-actions.md` only before CRM, email, calendar, or file-storage writes.
- Read `references/merraine-client-context.md` for Merraine Group or Jeremy Sanchez work.
- Also read `references/merraine-public-examples.md` when a Merraine deliverable needs client examples, proof, demonstration data, or relationship seeds.

## Core operating loop

1. Inspect existing workspace artifacts, prior research, CRM exports, email threads, client files, and saved packets. Reconcile before creating duplicate work.
2. State the decision and bottleneck the workflow must support: whom to target or recruit, why now, how to differentiate, what to update, or what should run repeatedly.
3. Build or confirm a compact client profile: offer, ICP, geography, exclusions, proof points, known competitors, desired output, system of record, and protected fields.
4. Audit the data foundation. Resolve identities, deduplicate, measure coverage and staleness, and define field ownership before activation.
5. Select `quick`, `deep`, or `deeper` mode from `references/research-workflow.md`. Set record, tool-call, time, and spend budgets plus completion criteria.
6. Establish a dated baseline, then run diverse discovery waves across volatile first-party surfaces, current signals, people, ecosystem adjacency, and comparisons. Use Context's fact-checked extraction and monitors when available; express each call in natural language plus an API contract. Detect and normalize deltas before expensive enrichment.
7. Enrich records whose change or durable strategic reason passes the gate. Keep baseline facts, observed changes, provider attempts, relationship edges, and analyst judgment separate.
8. Build the relationship graph and bundle recent changes at the account level. Score novelty, magnitude, client relevance, persona actionability, evidence quality, relationship leverage, and expiry.
9. Score fit and timing from cited evidence. Use `Unknown` when evidence is missing; never turn an inference into a fact.
10. When recurring or event-driven work is useful, define a versioned GTM application with trigger, cursor, idempotency key, budget, review gate, metric, stop condition, and write policy.
11. Synthesize the client deliverable using `references/delivery-contract.md` and `assets/templates/`.
12. Validate with `python3 scripts/validate_intelligence_packet.py <packet.json>`, then render with `python3 scripts/render_intelligence_report.py <packet.json> --output <directory>`.
13. Inspect the overview and one dossier; when present, also inspect scheduled-application cards and the CRM update ledger before delivery.
14. Perform authorized writes only inside the declared policy. Verify each write by record ID and read-after-write evidence; learn from outcomes and corrections.

## Evidence rules

- Attach a URL, app/thread identifier, or local file path to every material claim.
- Record source date and research date for time-sensitive facts.
- Label each field `Verified`, `Estimated`, or `Unknown`.
- Prefer first-party pages, filings, direct communications, and primary documents. Use directories and aggregators for discovery, then corroborate.
- Treat search snippets as leads, not final proof, unless the source page is inaccessible and the limitation is explicit.
- Never infer a company's product, industry, customer, or traction from design, framework, fonts, or generic marketing language.
- Never guess an email address, phone number, revenue, funding, hiring intent, or candidate interest.
- Never claim a warm introduction, mutual relationship, client status, or placement without relationship-specific evidence.
- Never accept an enrichment provider's rank or value without preserving field-level provenance, freshness, and conflict status.
- Never write `use Context to enrich` without the operator's natural-language job, method, full endpoint, params/body, expected response, Opulent route, request tags, write policy, execution status, and receipt when executed.
- Never describe a proposed schedule or CRM update as active or verified without an installation/run identifier or read-after-write receipt.
- Never call a static fact a signal. Require a previous state, current state, dated delta, or mark the previous state `Unknown` and keep it out of the act-now band.
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
- enrichment coverage, conflicts, freshness, and field provenance are visible;
- every included scheduled application has an incremental cursor, idempotency, budget, review gate, metric, and stop condition;
- every executed CRM mutation has a policy level, field diff, returned identifier, and verification result;
- unknowns and blocked sources are visible;
- requested artifacts exist, pass validation, and render without unresolved template tokens; and
- requested system writes are verified or explicitly marked `drafted`, `blocked`, or `skipped`.
