# Intelligence Template Field Guide

Use the bundled templates to deliver a polished executive brief and detailed dossiers without rebuilding layout on every run.

## Templates

- `assets/templates/intelligence-brief.html`: executive overview, priorities, relationship paths, public examples, signals, conversation kits, and source appendix.
- `assets/templates/enrichment-dossier.html`: one detailed account or person dossier with fit, timing, relationship intelligence, evidence, risks, and next action.

Render both with:

```bash
python3 scripts/render_intelligence_report.py packet.json --output output/client-intelligence
```

The command writes:

- `output/client-intelligence/index.html`
- `output/client-intelligence/dossiers/<slug>.html`

## Packet sections

| Section | Required fields | Purpose |
| --- | --- | --- |
| Executive brief | `executive_brief[]` | Put the decision and recommended move above the fold |
| Accounts | name, score, confidence, why-now, evidence, angle, next action | Rank business-development or market targets |
| People | name, score, confidence, why-now, evidence, angle, next action | Rank decision makers or candidates |
| Relationships | from, to, type, strength, confidence, evidence, activation path, risk | Show the shortest truthful route to action |
| Signals | title, date, impact, evidence | Explain what changed and why it matters now |
| Public examples | organization, relationship label, evidence, demonstration value | Add proven client-relevant context without overstating it |
| Conversation kits | target, context, hypothesis, proof, questions, CTA | Turn intelligence into a usable conversation |
| Sources | derived automatically from evidence | Make every important claim auditable |

## Enrichment detail

For accounts, include when known:

- canonical identity, website, sector, geography, size or stage;
- operating model, services, customers, leadership, and ownership;
- current triggers, hiring signals, transformation priorities, and risk;
- target roles, likely mandate, relationship paths, and contact provenance;
- fit component scores, confidence, evidence, angle, and next action.

For people or candidates, include when known:

- current role, remit, reporting line, tenure, and geography;
- prior relevant roles, domain depth, measurable impact, and public work;
- relationship paths, shared contexts, lawful contact route, and freshness;
- candidate thesis, likely motivations as hypotheses, risks, and verification tasks.

## Visual standard

- Use the template's navy, warm ivory, teal, and gold palette.
- Keep the executive decision within the first viewport.
- Use score bars and confidence pills rather than dense prose.
- Show relationship paths as explicit `from -> via -> to` cards.
- Keep source links visible in dossiers and compact in the overview.
- Preserve responsive and print layouts.
- Do not replace the template with an unstyled Markdown dump.

## Verification

Before delivery:

1. Run `validate_intelligence_packet.py`.
2. Render the report.
3. Search the HTML output for unresolved `{{...}}` tokens.
4. Open `index.html` and at least one dossier.
5. Confirm the examples and relationship labels match their sources.
6. Confirm the layout works at desktop and narrow widths.
