# Self-Contained Network Graph Store

The skill owns its graph. Persistence is a set of versioned workspace JSON artifacts that every run loads, delta-updates, validates, and renders. No CRM, external database, or vendor system is required to hold the network; external systems are ingestion sources and optional, policy-controlled mirror targets only.

## Layout

Store the graph under a dated client workspace folder as `graph/`:

| File | Contents |
| --- | --- |
| `graph/store-manifest.json` | `schema_version`, `metadata_only: true`, client, window, members with consent, source discovery statuses, counts, `last_run_at`, `runs` |
| `graph/people.json` | Canonical people: `id`, `name`, `role`, `company_id`, `emails`, `linkedin_url`, `dedup_keys`, `privacy`, `identity_confidence`, `suppressed`, `provenance` |
| `graph/companies.json` | Canonical companies: `id`, `name`, `domains`, `dedup_keys`, `provenance` |
| `graph/edges.json` | Typed edges with `strength_components`, `band`, `evidence_tier`, `owner`, `confidence`, `last_verified`, `evidence`, `activation_path`, `risk` |
| `graph/interactions.jsonl` | Append-only metadata ledger from `network-graph-build.md` |
| `graph/lists.json` | Skill-owned lists: target accounts, candidate pools, watchlists |
| `graph/cursors.json` | Per-source incremental cursor, `last_run_at`, status |

`fixtures/representative-graph-store/` is the canonical example.

## Rules

- **Load before build.** Step 1 of the operating procedure already requires inspecting workspace artifacts and saved packets; an existing store is the baseline and the run applies deltas. Rebuild from scratch only when no store exists or the schema version requires migration, and record which happened.
- **Deterministic and auditable.** The ledger is append-only. Edge upserts key on `(from, to, type, via)` and keep the strongest current evidence. Every mutation carries provenance and dates. Scoring is recomputed by the pure formula, never hand-adjusted in place.
- **Metadata only.** The store never contains message bodies, subjects, titles, or notes. The store validator rejects forbidden content fields.
- **Validate on every persist:**

  ```bash
  python3 scripts/validate_graph_store.py <workspace>/graph
  ```

  A packet derived from the store must still pass `validate_intelligence_packet.py`; `network_health.store_manifest` links the packet to the store version that produced it.
- **Handles, not payloads.** Follow the structured-data handoff rule: carry the store path and bounded previews between steps, not full file bodies.
- **Cursors are the schedule contract.** Scheduled applications (`network-refresh`, `job-change-radar`, `dormant-reheat`) read and advance `graph/cursors.json`; idempotency keys derive from member, source, cursor, and application version.
- **Counts must reconcile.** Manifest counts equal actual file contents; `network_health` aggregates in the packet must be derived from the store, not estimated.

## Optional external mirror

If a CRM connector is discovered and the client wants a living copy in their system of record, mirror outward as a final projection:

- Mirror only rollups, bands, dated signals, and edge summaries — under the write policy in `gtm-engineering-system.md` (`autonomous_safe_field` for deterministic dated facts; `review_required` for anything interpretive).
- Idempotent upserts, field-level diffs, read-after-write verification, and receipts in the CRM update ledger, exactly as `system-actions.md` requires.
- The mirror is never the source of truth and its absence never blocks a run. A missing CRM is a recorded `blocked_read`, not a failure.
