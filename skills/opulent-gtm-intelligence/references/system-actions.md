# CRM, Email, Calendar, and Storage Actions

## Before any write

1. Confirm the target workspace, account, record, or thread.
2. Inspect existing records and recent activity to prevent duplicates.
3. Confirm the connection and authorization required by the runtime.
4. Show or retain the exact payload for consequential writes.
5. Follow the runtime's confirmation policy for sending, submitting, deleting, or transmitting sensitive data.

## CRM

Use the client's CRM as the system of record when connected. Match by domain, verified email, external ID, or record ID before creating anything.

Write:

- source and source date;
- confidence;
- fit score and component scores;
- why-now signal;
- contact role and verified path;
- next action, owner, and due date; and
- do-not-contact or suppression state.

Do not overwrite human-verified values with estimates. Verify every create or update by reading the record back.

Use the policy levels in `gtm-engineering-system.md`:

- `autonomous_safe_field`: deterministic, source-backed enrichment only;
- `review_required`: scoring, relationship judgment, ownership, pipeline, forecast, or conflicting values;
- `draft_only`: prepare the payload without writing; and
- `blocked`: missing connection, authorization, identifier, source, or policy.

Match before create. Compute a field-level diff before update. Add an idempotency key to every create or update so retries cannot duplicate records or tasks. Preserve protected fields including opportunity stage, deal value, forecast category, owner, suppression, do-not-contact, sent-message state, and candidate status unless the client has explicitly defined a narrower authorized policy.

For an autonomous field write, require `Verified` confidence, field evidence, source date, a non-conflicting target record, returned identifier, and read-after-write equality. Route conflicts to review instead of selecting the most convenient value.

## Email

Default to a draft unless sending is explicitly authorized. Ground every claim in the packet. Preserve the thread, recipients, and sender identity.

After creating or sending, capture draft ID or message ID, account, recipients, subject, and verification method.

### Introductions

Follow `warm-path-activation.md`. Additional boundaries:

- Record the connector's consent, with a date, before drafting language that names them or before placing anything in their mailbox.
- Place the draft in the connector's own mailbox when their email connector is available; otherwise deliver ready-to-paste draft text. Either way the entry is `draft_only`.
- Sending an introduction is always the connector's human action from their own account. The skill never sends one, and an intro entry under `draft_only` can never be recorded as `sent`.
- Track the intro lifecycle in `intro_ledger` with a receipt per stage. A proposed or approved introduction is never described as sent.
- Honor suppression and do-not-contact state for the target and the connector at every stage.

## Graph store

Writes to the skill-owned graph store (`network-graph-store.md`) are internal workspace writes: always allowed within the run's scope, always with provenance, dates, and dedup keys, and validated with `validate_graph_store.py` on persist. The store never receives message bodies or subjects. Mirroring store-derived fields outward to a discovered CRM is an ordinary CRM write under the policy levels above and is never required for the run to complete.

## Calendar

Confirm timezone, attendees, duration, and meeting purpose. Do not create or modify an event without the required authorization. Verify by reading back the event ID and final attendee list.

## File storage

Reuse the existing client folder. Store the final packet, source appendix, and export under a dated run folder. Avoid uploading sensitive research to a new third party without explicit authorization.

## Scheduled applications

Before installing or activating a scheduled or event-driven GTM application:

1. Record the name, version, owner, objective, trigger, timezone, scope, and cursor.
2. Set record, tool-call, runtime, and spend budgets.
3. Define idempotency, lease, concurrency, retry, catch-up, and duplicate behavior.
4. Declare the CRM write policy, protected fields, review gate, and notification route.
5. Run and inspect a bounded representative batch.
6. Define the metric, baseline, stop conditions, and escalation owner.
7. Capture the installed schedule or function ID, first run ID, next run, and verification result.

Use `proposed` when the application is designed but not installed. Use `active` only after the scheduler/function identifier and a verified run or installation receipt exist.

## Completion log

Record each action as:

```text
System | action | target | identifier | idempotency key | policy | verification | result
```

Use `verified`, `drafted`, `blocked`, `skipped`, or `needs review`. Never report an unverified write as complete.
