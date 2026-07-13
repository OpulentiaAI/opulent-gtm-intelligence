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
| `relationships[]` | Relationship ledger and relevant dossiers |
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
| all nested `evidence[]` | Original record plus recursively derived source appendix |
| unrecognized/additional nested fields | Generic complete-record rendering; never silently dropped |

Every account and person dossier repeats the complete target record and target-specific signals, relationship paths, action, evidence, risks, and unknowns.

## Visual and interaction standard

- Preserve Nim's narrow reading measure, zinc-neutral light/dark palette, Geist-like system stack, large vertical rhythm, restrained motion, and rounded inset-ring cards.
- Let analytics and dense records expand to the responsive wide grid.
- Put the executive interpretation first, followed by `Analysis & Statistics`.
- Use real committed Dither Kit bar, radar, pie, or area components for key ratings, analysis, statistics, and health. Hand-built bars, faux CSS charts, canvas substitutes, and decorative chart-shaped markup are prohibited.
- Keep confidence, source URLs, route, policy, statuses, receipts, and before/after values visible.
- Never style `proposed`, `blocked`, or failed operations as active or verified.
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
5. Search source and docs for legacy template names or token-substitution instructions.
6. Inspect overview desktop, overview mobile, and at least one dossier in a browser.
7. Confirm charts render from Dither Kit canvases and explain their deterministic packet inputs.
8. Confirm source links, Context contracts, application states, policy labels, field diffs, and receipts remain intact.
