# grata-pp-cli

Token-efficient TypeScript CLI for the Grata company search, similar search, enrichment, and list APIs. Agent-native flags, compound sourcing commands, and a local mirror for offline compound queries. Printed in the style of [cli-printing-press](https://github.com/mvanhorn/cli-printing-press).

## Install

```bash
cd cli/grata-pp-cli
npm install   # no runtime deps - only for tooling
npm run build
```

The binary is `dist/index.js`. Symlink or alias it:

```bash
alias grata-pp-cli="node $(pwd)/dist/index.js"
```

## Auth

Set `GRATA_API_KEY` in your environment, or pass `--api-key=KEY` on every call. Get a token from your Grata admin account settings.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Company search by keywords and filters |
| `similar` | Similar-company search by seed domain or company_uid |
| `enrich` | Enrich a single company by domain or company_uid |
| `bulk-enrich` | Bulk enrich multiple companies |
| `lists` | Search existing lists |
| `list-create` | Create a new list |
| `list-modify` | Add or remove companies from a list |
| `sourcing-run` | Compound: search/similar -> enrich -> save to list -> mirror locally |
| `mirror-show` | Read a previously mirrored result set |
| `mirror-list` | List files in the local mirror |

## Compound Command: sourcing-run

The signature printing-press pattern - one call that does what would otherwise take 4-5 separate API round-trips:

```bash
grata-pp-cli sourcing-run \
  --terms="hvac,plumbing" \
  --hq-state=TX \
  --employees=10,200 \
  --list-name="Texas HVAC Targets" \
  --mirror-name=tx-hvac-001
```

This runs a company search, enriches each result, creates (or reuses) a Grata list, adds the companies to it, and saves the full result set to a local mirror file for offline compound queries later.

## Local Mirror

Results saved with `--mirror-name` are stored as JSON under `~/.grata-pp/mirror/` (override with `GRATA_PP_MIRROR` env). Read them back with `mirror-show` without any API calls.

## Output

Compact agent-friendly output by default. Pass `--json` for raw JSON.

## Test

```bash
npm run build && npm test
```

Tests run offline with no API key required - they verify arg parsing, filter building, mirror round-trips, and error paths.
