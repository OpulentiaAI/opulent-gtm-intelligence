# Opulent GTM Intelligence

An Opulent-native skill for evidence-backed company research, multi-source account and candidate enrichment, relationship and signal intelligence, first-party network graphs with warm-path and introduction orchestration, competitive intelligence, scheduled GTM applications, meeting briefs, and policy-controlled CRM updates.

The network layer is self-contained: ingestion runs the connector discovery gate and reads whatever email, calendar, CRM, and export-file sources are actually available (metadata only — never message bodies or subjects), and the graph persists in a skill-owned workspace store validated by `scripts/validate_graph_store.py`. No specific CRM or vendor adapter is required.

The workflow uses Opulent's built-in `web_search` and `web_fetch` for broad research, Browserbase-backed `browser_*` tools for dynamic or authenticated sites, `computer_*` tools for local applications, and connected apps for CRM, email, calendar, and storage operations.

## Skill

The reusable skill lives at [`skills/opulent-gtm-intelligence`](skills/opulent-gtm-intelligence). Invoke it as:

```text
$opulent-gtm-intelligence
```

The Merraine client context is progressively disclosed only when the target is Merraine Group or Jeremy Sanchez.

## Validate

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/opulent-gtm-intelligence

python3 skills/opulent-gtm-intelligence/scripts/validate_intelligence_packet.py \
  path/to/packet.json

python3 skills/opulent-gtm-intelligence/scripts/validate_graph_store.py \
  path/to/workspace/graph

python3 skills/opulent-gtm-intelligence/scripts/render_intelligence_report.py \
  path/to/packet.json --output output/client-intelligence
```

The renderer produces a polished executive overview plus detailed account and person dossiers, data-health metrics, relationship paths, signal context, scheduled-application contracts, and an auditable CRM update ledger.

The optional Grata, Attio, and Gmail CLIs under `cli/` are fallback adapters. Prefer Opulent's native tools and connected apps when available.
