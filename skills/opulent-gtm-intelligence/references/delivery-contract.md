# Client Delivery Contract

Lead with the decision, then show the evidence.

## Default packet

1. **Executive brief**: five bullets covering the opportunity, why now, top targets, competitive implication, and recommended action.
2. **Priority queue**: ranked companies and people with score, trigger, evidence, angle, owner, and next action.
3. **Signal ledger**: dated events that changed prioritization.
4. **Company and person dossiers**: concise findings, unknowns, and source links.
5. **Competitive view**: atomic matrix plus where the client wins, loses, and should reframe.
6. **Conversation kit**: opening line, three discovery questions, proof to use, objection response, and a safe call to action.
7. **Monday-morning actions**: the smallest set of actions that moves the pipeline.
8. **Verification appendix**: sources, confidence, freshness, blocked sources, and system-write receipts.

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
  "competitors": [],
  "unknowns": [],
  "system_updates": []
}
```

Validate this JSON with `scripts/validate_intelligence_packet.py`.

## Quality bar

- Prefer ten strong targets over one hundred unranked names.
- Put the highest-leverage action in the first screen.
- Make every score explainable.
- Date every volatile signal.
- Show unknowns without apology.
- Separate client-ready prose from audit detail.
