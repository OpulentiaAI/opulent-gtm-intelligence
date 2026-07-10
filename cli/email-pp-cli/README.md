# email-pp-cli

Optional Gmail fallback adapter. Opulent should prefer its connected email app or connector; use this CLI only when the runtime has an authenticated Gmail token but no direct connector.

## Install

```bash
cd cli/email-pp-cli
npm install
npm run build
```

Set `GMAIL_ACCESS_TOKEN` or pass `--token=TOKEN`.

Use `profile`, `messages`, and `message` for reads. Use `draft` by default for external communication. `send`, `draft-send`, and destructive actions must follow the runtime's authorization and confirmation rules.

`run-update-email` builds a concise Opulent GTM update with current status, completed work, verification evidence, open items, human review, and blocked items. Pass `--draft` unless sending was explicitly authorized.

After a write, capture and verify the draft or message ID. Pass `--json` for machine-readable output and `--mirror-name` for a local receipt.

## Test

```bash
npm run build && npm test
```
