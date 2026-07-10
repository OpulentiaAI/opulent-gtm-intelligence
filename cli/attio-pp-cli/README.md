# attio-pp-cli

Optional fallback adapter for Attio record, list, and note operations. Opulent should prefer a connected Attio app or connector when available; use this CLI only when the runtime has an authenticated API key but no direct connector.

## Install

```bash
cd cli/attio-pp-cli
npm install
npm run build
```

Set `ATTIO_API_KEY` or pass `--api-key=KEY`.

## Commands

Use `list-objects`, `get-object`, `list-lists`, `list-records`, `find-record`, `create-record`, `update-record`, `list-notes`, and `create-note` for ordinary reads and writes. Destructive commands require `--confirm`.

`setup-check` verifies the optional Opulent GTM structure: `companies`, `people`, and `deals`; lists `Opulent GTM Intelligence` and `Relationship Coverage`; and the evidence, confidence, score, signal, ownership, and suppression fields used by the skill.

`ensure-structure` reports the exact missing objects, lists, and attributes. Inspect before creating and verify every write by reading it back.

Pass `--json` for machine-readable output. Use `--mirror-name` to save a local response for offline inspection.

## Test

```bash
npm run build && npm test
```
