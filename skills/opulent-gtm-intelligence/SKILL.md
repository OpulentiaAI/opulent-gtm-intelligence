---
name: opulent-gtm-intelligence
description: Builds executable, evidence-backed GTM intelligence for named people, supplied lists, and bounded calendar cohorts. Uses the authenticated Context.dev runtime CLI, Opulent research/browser surfaces, relationship and signal analysis, a mandatory Nim-derived Next.js report, Dither Kit analytics, and policy-controlled system updates.
---

# Opulent GTM Intelligence

Produce a decision packet and a buildable client artifact. Context.dev is assumed installed, authenticated, and accessible through its runtime CLI. Do not replace Context with an invented tool surface, and do not ask the user to install it before inspecting the actual CLI.

## Reference-loading and routing matrix

Load the smallest complete set before acting.

| Trigger or decision | Mandatory references |
| --- | --- |
| Any run | `runtime-tools.md`, `research-workflow.md`, `delivery-contract.md` |
| Context-backed resolve, retrieval, extraction, monitoring, or scoring | `contextdev-execution.md` |
| One person, named people, a supplied/CRM list, or calendar-derived people | `people-scope-routing.md` |
| Signals, pre-call prep, prioritization, monitors, or recurring enrichment | `signal-intelligence.md` |
| Any company, person, candidate, account, event, or outreach decision | `relationship-intelligence.md` |
| Enrichment design, scheduled applications, evaluation, or CRM automation | `gtm-engineering-system.md` |
| Any client artifact or structured packet | `template-field-guide.md` |
| CRM, email, calendar, or storage mutation | `system-actions.md` |
| Merraine Group or Jeremy Sanchez | `merraine-client-context.md` |
| Merraine proof, examples, demonstrations, or relationship seeds | `merraine-public-examples.md` |

## Runtime decision table

Inspect installed command help and connector state before choosing commands. Never fabricate a subcommand.

| Condition | Decision |
| --- | --- |
| Context CLI is available and authenticated | Inspect `--help` and relevant subcommand help, then execute the exact Context API contract through the supported runtime command |
| Context CLI exists but is unauthenticated | Mark the Context step `blocked`; continue with non-Context discovery and corroboration; do not claim Context execution |
| Context CLI command surface differs from the reference | Use the installed surface only when it can preserve method, endpoint, params/body, tags, expected response, route, policy, and receipt; otherwise mark blocked |
| Context CLI is unavailable at runtime | Record the missing runtime dependency, use Opulent search/fetch/browser for evidence that does not require Context, and keep proposed Context operations unexecuted |
| Known person has a verified LinkedIn URL | Context people retrieval; this is enrichment, not discovery |
| Person must be discovered from criteria | Connected people-discovery/Clodo surface, then verify and resolve the selected identity |
| Static public URL is sufficient | Fetch/extract before browser escalation |
| Page is dynamic, authenticated, protected, or visually material | Browser fallback after cheaper routes fail |
| Mutation is requested | Enforce the write policy and confirmation boundary; verify by returned ID and read-after-write receipt |

The mandatory routing sequence is `resolve -> search/discover -> extract -> corroborate -> browser fallback -> analyze -> activate -> verify/deliver`. Skip a stage only when it is not applicable and record why.

## Operating procedure

1. Inspect workspace artifacts, system-of-record exports, saved packets, available connectors, and the actual Context CLI command surface.
2. State the decision and select `single_person`, `user_list`, or `calendar_derived`. Normalize identities, group shared companies, set budgets, and enforce calendar privacy before any public-web call.
3. Confirm client offer, ICP, exclusions, geography, proof, competitors, desired output, protected fields, and system of record.
4. Audit data health: canonical identities, duplicates, coverage, conflicts, staleness, provenance, suppressions, and field ownership.
5. Choose `quick`, `deep`, or `deeper`; define evidence, call, time, and spend limits.
6. Establish a dated baseline. Use the routing sequence to detect recent deltas across first-party, people, ecosystem, and comparison surfaces.
7. For every Context capability, preserve the natural-language job and exact method, full endpoint, params, body, expected response, Opulent route, request tags, write policy, status, evidence, and execution receipt.
8. Gate before enrichment. Retrieve each verified person identity once, each canonical company once, and reuse extraction results. Never send private calendar payloads to Context.
9. Build typed relationship paths and account-level signal bundles. Keep baseline facts, observed changes, provider attempts, relationship edges, and analyst judgment distinct.
10. Score fit and timing from cited evidence. Preserve each score component and use `Unknown` when evidence is missing.
11. Define recurring applications with version, trigger, cursor, idempotency, budget, review gate, metric, stop conditions, and policy.
12. Map every packet field into the report. The mandatory client artifact is `assets/report-app`, a Nim-derived Next.js 15/React 19/Tailwind v4 static export.
13. Use committed official-source Dither Kit components for key ratings, target distribution, signal analysis, confidence/statistical composition, and data-health analytics. Deterministically derive analytics from existing packet fields.
14. Render both mandatory timelines immediately after analytics: an agent execution timeline and the enforced workflow route. Derive statuses only from packet fields, explicit operation status, evidence, and receipts. Use only `complete`, `proposed`, `blocked`, or `not applicable`; never infer browser work, executed Context, verified writes, build validation, or delivery from absence.
15. Describe the agent timeline as packet-derived execution provenance or observable workflow steps, never hidden chain-of-thought.
16. Run, in order:

   ```bash
   python3 scripts/validate_intelligence_packet.py <packet.json>
   python3 scripts/render_intelligence_report.py <packet.json> --output <directory>
   ```

17. Inspect the exported overview at desktop and mobile widths and inspect at least one account or person dossier. Check both timelines, statuses, responsive rails/cards, assets, links, charts, source URLs, application states, Context contracts, and update receipts.
18. Perform authorized writes only inside policy. Verify each mutation by identifier and read-after-write evidence.

## Evidence and scoring constraints

- Attach a URL, app/thread ID, or local file path to every material claim. Date volatile sources.
- Label confidence `Verified`, `Estimated`, or `Unknown`; absence is not `false`.
- Prefer primary sources. Search snippets are leads until corroborated.
- Never infer products, traction, contact details, intent, relationships, client status, or placements.
- Never call a static fact a signal. Require previous state, current state, dated delta, expiry, score components, implication, verification task, and route.
- Cap unverified company and person scores according to the validator. Do not exceed confidence bands for signals.
- Preserve relationship type, strength, confidence, evidence, freshness, activation plan, and risk.
- Preserve Context and system-action policy, status, tags, route, receipts, source links, and verification exactly.

## People and mutation boundaries

- Discovery and retrieval are different: use people discovery for criteria-based search; use Context people retrieval only after a LinkedIn identity is known.
- Deduplicate supplied lists and reuse company results. For calendar cohorts, bound calendar/timezone, exclude self/internal/declined/resource identities as configured, and never transmit event bodies, notes, links, IDs, or attendee lists to Context.
- Draft outreach unless external sending was explicitly authorized. Preserve opt-outs and do-not-contact state.
- Human review is mandatory for bulk outreach, judgment-based stage changes, protected fields, and published competitive claims.
- Do not describe a proposed operation as active, an attempted write as verified, or a baseline monitor run as a detected signal.

## Artifact requirements

- The structured packet must pass the validator without weakened checks.
- Every packet field must be visible in the overview, its appropriate ledger, the source appendix, or the complete account/person dossier.
- Every account and person must have a static dossier route.
- The agent execution and workflow timelines are mandatory, packet-derived, and status-honest. Executed Context requires an execution identifier plus verification receipt; verified writes require their existing result, identifier, and read-after-write verification. Browser fallback is `not applicable` without explicit browser evidence.
- Timeline derivation must remain pure, deterministic, and independent of current time. It must not expose or imply chain-of-thought.
- The renderer must use `npm ci` and a production Next.js static export, fail on install/build errors, and leave no `node_modules`, `.next`, or other transient build directories in the repository or output.
- Static token substitution, legacy standalone templates, unresolved template tokens, hand-built CSS charts, and faux chart markup are prohibited.
- Dither Kit source components and `dither-kit.json` must remain committed and must be installed/updated through `@dither-kit/cli` source mode.

## Completion gate

Finish only when the decision is answered; targets have evidence, confidence, fit, timing, relationship path, and next action; unknowns are explicit; Context contracts and mutation receipts are intact; both packet-derived timelines use honest states; validator, typecheck, lint, and full production export pass; no old template references remain; exported routes/assets resolve; and desktop, mobile, both timelines, and at least one dossier have been visually inspected.
