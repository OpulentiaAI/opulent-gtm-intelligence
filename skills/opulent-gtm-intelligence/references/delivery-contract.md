# Client Delivery Contract

Lead with the recent change, then the decision and its evidence.

## Default packet

1. **Change brief**: the three to five highest-leverage changes since the last touch, each with before/after state, score, and conversation implication.
2. **Executive brief**: five bullets covering the opportunity, why now, top targets, competitive implication, and recommended action.
3. **Data health**: identity resolution, coverage, duplicates, conflicts, staleness, and protected-field policy.
4. **Priority queue**: ranked companies and people with score, trigger, relationship path, evidence, angle, owner, and next action.
5. **Relationship intelligence**: typed one-hop and two-hop paths, evidence strength, activation plan, and risk.
6. **Signal ledger**: dated, scored, and expiring before/after changes that altered prioritization or conversation, bundled by account.
7. **Company and person dossiers**: detailed enrichment, provider provenance, unknowns, relationship context, and source links.
8. **Competitive view**: atomic matrix plus where the client wins, loses, and should reframe.
9. **Conversation kit**: opening line, three discovery questions, proof to use, objection response, and a safe call to action.
10. **Scheduled GTM applications**: versioned trigger, cursor, budget, review gate, metric, stop condition, and run state.
11. **Context execution ledger**: every Context-backed capability in natural language plus method, full endpoint, params/body, expected response, Opulent route, request tags, write policy, status, evidence, and receipt.
11. **CRM update ledger**: proposed or executed field diffs, policy, identifiers, and read-after-write verification.
12. **Monday-morning actions**: the smallest set of actions that moves the pipeline.
13. **Verification appendix**: sources, confidence, freshness, blocked sources, and system-write receipts.

Omit sections that do not support the decision.

## Priority queue columns

| Field | Requirement |
| --- | --- |
| Company or person | Canonical verified identity |
| Fit score | Component-based 0-100 score |
| Why now | Dated trigger or durable strategic reason |
| Evidence | Source link or app/file identifier |
| Confidence | `Verified`, `Estimated`, or `Unknown` |
| Angle | One personalized, evidence-backed reason to engage |
| Relationship path | Shortest truthful path, strength, and risk |
| Next action | Observable verb, owner, and timing |

## Conversation kit standard

Write the opener from facts the recipient would recognize. Avoid fake familiarity.

Use this shape:

- **Context**: one verified event, priority, or role responsibility.
- **Hypothesis**: the likely operational implication, labeled as a hypothesis.
- **Proof**: one client capability or relevant result.
- **Question**: a low-friction question that tests the hypothesis.
- **CTA**: a specific, reversible next step.

## Merraine two-sided map

For Merraine, produce a `Candidate x Company Intelligence Map` when the evidence supports it:

- target organizations with leadership or growth triggers;
- likely executive mandates or talent gaps;
- candidate archetypes and named candidates when lawful and verifiable;
- connection paths and shared context;
- a recommended search thesis or business-development angle; and
- unknowns that require recruiter judgment.

This map should demonstrate background work compounding into an edge for both business development and search execution.

## Structured packet shape

```json
{
  "client": "Example Client",
  "objective": "Build a prioritized account and candidate map",
  "mode": "deep",
  "generated_at": "2026-07-09T12:00:00Z",
  "executive_brief": ["..."],
  "data_health": {
    "records_reviewed": 120,
    "verified_field_coverage": 82,
    "duplicate_rate": 3,
    "stale_rate": 11,
    "conflicts": 4
  },
  "accounts": [
    {
      "name": "Example Health System",
      "website": "https://example.org",
      "fit_score": 84,
      "confidence": "Verified",
      "why_now": "Opened a new regional facility in June 2026",
      "evidence": [{"url": "https://example.org/news", "date": "2026-06-15"}],
      "angle": "Leadership capacity for the new region",
      "next_action": {"owner": "BD", "action": "Request an exploratory call", "when": "this week"}
    }
  ],
  "people": [],
  "relationships": [
    {
      "from": "Opulent team member",
      "to": "Example Health System",
      "type": "event_coattendance",
      "via": "Public leadership summit",
      "strength": 62,
      "confidence": "Verified",
      "last_verified": "2026-07-09",
      "evidence": [{"url": "https://example.org/event", "date": "2026-06-15"}],
      "activation_path": "Reference the summit theme without implying a personal meeting.",
      "risk": "Coattendance does not prove interaction."
    }
  ],
  "signals": [
    {
      "type": "leadership_hire",
      "title": "New operations leader started",
      "target": "Example Health System",
      "observed_at": "2026-07-09T12:00:00Z",
      "effective_at": "2026-07-01",
      "expires_at": "2026-08-30",
      "previous_state": "Role vacant",
      "current_state": "Named leader in role",
      "delta": "Vacant -> filled",
      "source_kind": "first_party",
      "confidence": "Verified",
      "freshness_days": 8,
      "novelty": 18,
      "magnitude": 15,
      "relevance": 19,
      "actionability": 13,
      "evidence_quality": 15,
      "relationship_leverage": 6,
      "score": 86,
      "affected_people": ["New operations leader"],
      "relationship_context": "No verified direct path",
      "why_it_changes_the_call": "The discussion should test the new operating mandate.",
      "conversation_angle": "Ask which operating constraint the leader was hired to change first.",
      "verification_task": "Confirm remit on the leadership page.",
      "route": "account-owner review",
      "evidence": [{"url": "https://example.org/news", "date": "2026-07-01"}]
    }
  ],
  "public_examples": [],
  "conversation_kits": [],
  "competitors": [],
  "unknowns": [],
  "applications": [
    {
      "name": "Weekly priority-account radar",
      "version": "1.0.0",
      "objective": "Surface newly qualified accounts and relationship paths",
      "owner": "GTM Operations",
      "status": "proposed",
      "trigger": {"type": "schedule", "value": "0 7 * * 1", "timezone": "America/Chicago"},
      "input_scope": "ICP-fit accounts with a new or changed signal",
      "cursor": "last_verified_signal_at",
      "idempotency_key": "account_id:signal_id:application_version",
      "steps": ["source", "resolve", "enrich", "model", "route", "verify"],
      "write_policy": "review_required",
      "review_gate": "GTM owner accepts account and angle before outreach",
      "metric": {"name": "accepted_opportunities", "baseline": 0, "target": 5},
      "budget": {"max_records": 50, "max_tool_calls": 300, "max_runtime_minutes": 20},
      "stop_conditions": ["precision below 80%", "three consecutive authentication failures"],
      "evidence": [{"url": "https://example.org/source", "date": "2026-07-09"}]
    }
  ],
  "context_operations": [
    {
      "natural_language_job": "Watch the target's public leadership and careers surfaces for a new executive, vacancy, or retained-search mandate and return before/after evidence.",
      "method": "POST",
      "endpoint": "https://api.context.dev/v1/monitors",
      "params": {},
      "body": {
        "name": "Target leadership and mandate radar",
        "target": {"type": "extract", "url": "https://example.com", "instructions": "Track leadership, vacancies, and search mandates.", "max_pages": 10},
        "change_detection": {"type": "semantic", "confidence_threshold": 0.8},
        "schedule": {"type": "interval", "frequency": 1, "unit": "days"},
        "tags": ["client:example", "app:mandate-radar", "run:run_123", "env:production"]
      },
      "expected_response": "A monitor identifier and webhook secret; later runs yield evidence-bearing change records.",
      "opulent_route": "Verify signed events, normalize the delta, add relationship context, score it, then propose a CRM-safe update.",
      "write_policy": "review_required",
      "status": "proposed",
      "evidence": [{"url": "https://docs.context.dev/monitoring/overview", "date": "2026-07-13"}]
    }
  ],
  "system_updates": [
    {
      "system": "CRM",
      "action": "update",
      "target": "Example Health System",
      "identifier": "crm-record-123",
      "idempotency_key": "crm-record-123:title:2026-07-09",
      "policy": "autonomous_safe_field",
      "fields": [
        {
          "field": "current_title",
          "before": "VP Operations",
          "after": "Chief Operating Officer",
          "confidence": "Verified",
          "evidence": [{"url": "https://example.org/leadership", "date": "2026-07-09"}]
        }
      ],
      "result": "verified",
      "verification": "Read back crm-record-123 after update"
    }
  ]
}
```

Validate this JSON with `scripts/validate_intelligence_packet.py`.

Render it with `scripts/render_intelligence_report.py`. Deliver the rendered overview and dossiers, not only the JSON.

## Quality bar

- Prefer ten strong targets over one hundred unranked names.
- Put the highest-leverage action in the first screen.
- Put `What changed since last touch` before static enrichment and make every routed signal show `before -> after`.
- Make every score explainable.
- Date every volatile signal.
- Show unknowns without apology.
- Show field-level provenance, conflicts, and freshness instead of a single generic enrichment badge.
- Separate client-ready prose from audit detail.
- Make the shortest truthful relationship path visible for every priority target.
- Distinguish `proposed`, `active`, `paused`, and `blocked` applications.
- Never render a Context operation as executed without a receipt containing a request or monitor/run/change identifier and verification result.
- Treat autonomous CRM writes as policy-controlled diffs with idempotency and read-after-write receipts.
- Use the bundled visual templates and inspect the output before delivery.
