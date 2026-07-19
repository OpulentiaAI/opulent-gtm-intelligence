# Next.js Intelligence Report Field Guide

Client artifacts must use `assets/report-app`, the bundled Nim-derived Next.js 15/React 19/Tailwind v4 application. The renderer copies it to a temporary directory, injects the packet, runs `npm ci` and `next build` with `output: "export"`, and copies only the static export to the destination.

```bash
python3 scripts/validate_intelligence_packet.py packet.json
python3 scripts/render_intelligence_report.py packet.json --output output/client-intelligence
```

Expected output includes `index.html`, `_next/` assets, and one `dossiers/<slug>/index.html` route for every account and person. No package installation or transient Next.js files may remain in the repository or output.

## Mandatory field map

| Packet field | Report surface |
| --- | --- |
| `client`, `objective`, `mode`, `generated_at` | Report masthead and metadata |
| `executive_brief[]` | First decision section |
| `data_health` | Data-health card and Dither Kit health analysis |
| `accounts[]`, `people[]` | Ranked key-rating cards and complete static dossiers |
| target `fit_score`, evidence, confidence, signals, relationships | Explainable rating card and Dither Kit rating distribution |
| `relationships[]` | Relationship ledger and relevant dossiers, with strength-component breakdowns, bands, and evidence tiers when present |
| `network_health` | Network-health section: member/consent list, source-discovery table with blocked reads verbatim, resolution and interaction stats, Dither Kit tier-coverage and band-distribution charts, store manifest line |
| `warm_paths[]` | Warm-path cards with per-hop edge chains; `no_verified_path` entries render explicitly and are never hidden |
| `intro_ledger[]` | Introduction ledger with consent, stage receipts, and policy; proposed or approved entries never styled as sent |
| `people[].interaction_rollup` | Person dossier interaction rollup; a zero rollup renders as the honest no-interaction state |
| `signals[]` and six score components | Signal ledger and Dither Kit component radar |
| confidence on targets/signals | Dither Kit statistical composition |
| `public_examples[]` | Public proof section |
| `conversation_kits[]` | Activation section |
| `competitors[]` | Competitive view |
| `unknowns[]` | Open-questions section |
| `applications[]` | Scheduled GTM application section |
| `discovery_scope` | Intake and Context budget section |
| `context_operations[]` | Natural-language and exact API execution ledger |
| `system_updates[]` | Governed field-diff ledger |
| packet scope, targets, operations, evidence, signals, relationships, scores, applications, updates | Agent execution timeline with packet-derived stage state |
| the same existing fields and explicit browser evidence | Workflow timeline for `resolve -> search/discover -> extract -> corroborate -> browser fallback -> analyze -> activate -> verify/deliver` |
| all nested `evidence[]` | Original record plus recursively derived source appendix |
| unrecognized/additional nested fields | Generic complete-record rendering; never silently dropped |

Every account and person dossier repeats the complete target record and target-specific signals, relationship paths, action, evidence, risks, and unknowns.

## Visual and interaction standard

- Preserve Nim's narrow reading measure, zinc-neutral light/dark palette, Geist-like system stack, large vertical rhythm, restrained motion, and rounded inset-ring cards.
- Let analytics and dense records expand to the responsive wide grid.
- Put the executive interpretation first, followed by `Analysis & Statistics`.
- Put the mandatory agent execution and workflow timelines directly after analytics and before detailed targets/ledgers.
- Render timelines as reusable responsive Nim cards on a restrained zinc rail. At 390px, stack status and content without horizontal overflow.
- Every timeline step uses only `complete`, `proposed`, `blocked`, or `not applicable`. Executed Context requires its receipt; verified writes require result, identifier, and read-after-write verification; browser fallback remains `not applicable` without explicit browser evidence.
- Call the agent view packet-derived execution provenance or observable workflow steps. Never expose or imply hidden chain-of-thought.
- Use real committed Dither Kit bar, radar, pie, or area components for key ratings, analysis, statistics, and health. Hand-built bars, faux CSS charts, canvas substitutes, and decorative chart-shaped markup are prohibited.
- Keep confidence, source URLs, route, policy, statuses, receipts, and before/after values visible.
- Never style `proposed`, `blocked`, or failed operations as active or verified.
- Render `missing` and `unauthenticated` ingestion sources distinctly with their blocked reads; never imply a source was ingested when it was not, and never style a proposed or approved introduction as sent.
- Preserve responsive, keyboard-accessible, light/dark, and print behavior.

## Dither Kit source contract

The app is a shadcn/Tailwind project with `components.json`. Dither Kit components live in `components/dither-kit/` and are owned source installed with:

```bash
npx @dither-kit/cli init --mode source --yes --no-input
npx @dither-kit/cli add area-chart bar-chart pie-chart radar-chart --yes --no-input
```

`dither-kit.json` is the mandatory lockfile. Update or diff through the official CLI; do not replace generated source with a local imitation.

## Delivery verification

1. Validate the packet.
2. Run template `typecheck` and `lint`.
3. Run the renderer's full production static export.
4. Confirm `index.html`, `_next/` assets, and the exact account/person dossier count.
5. Confirm all client artifacts are generated by the Nim report application and all analytics use committed Dither Kit components.
6. Inspect overview desktop, overview at exactly 390px, both timelines, and at least one dossier in a browser.
7. Confirm charts render from Dither Kit canvases and explain their deterministic packet inputs.
8. Confirm source links, Context contracts, application states, policy labels, field diffs, and receipts remain intact.
9. Confirm timeline status derivation is deterministic, proposed operations do not look complete, and absence does not become browser or delivery work.
