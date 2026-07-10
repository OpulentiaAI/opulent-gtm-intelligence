# Opulent GTM Intelligence

An Opulent-native skill for evidence-backed company research, account and candidate prospecting, competitive intelligence, meeting briefs, and CRM-ready next actions.

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

python3 skills/opulent-gtm-intelligence/scripts/render_intelligence_report.py \
  path/to/packet.json --output output/client-intelligence
```

The renderer produces a polished executive overview plus detailed account and person dossiers with relationship paths, evidence, activation plans, and risks.

The optional Grata, Attio, and Gmail CLIs under `cli/` are fallback adapters. Prefer Opulent's native tools and connected apps when available.
