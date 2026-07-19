# Warm Paths and Introduction Orchestration

Turn the pooled graph into the shortest truthful route to a conversation, and turn a truthful route into an introduction the connector actually approves. Never manufacture familiarity; the path exists to earn a better first question, not to fake a friendship.

## Contents

1. Path finder
2. Path output contract
3. Introduction workflow
4. Introduction ledger contract
5. "How do I know X" summaries
6. Safe language

## 1. Path finder

Run over the persisted graph store, per priority target:

1. Resolve the target to a canonical person or company node.
2. Collect one-hop candidates: member edges directly to the target. Rank before considering two hops.
3. Collect two-hop candidates only when every edge is independently evidenced: member -> connector -> target. **Two hops is the maximum.** Longer chains do not support an honest introduction.
4. Drop edges that fail the gate: `private` or suppressed contacts, Tier D evidence, stale `last_verified` beyond the edge type's freshness window, or band `unknown`.
5. Rank remaining paths by minimum edge strength, breaking ties by evidence tier, then recency.
6. Choose the activation mode per `relationship-intelligence.md`: `direct_history`, `warm_introduction`, `shared_context`, `value_first_cold`, or `monitor`.
7. When nothing survives the gate, emit an explicit `no_verified_path` entry with a fallback mode of `value_first_cold` or `monitor`. Silence is not an acceptable output; the absence of a path is a finding.
8. When the target itself is an unresolved persona (for example, "the CFO" with no verified identity), pair the `no_verified_path` entry with an `unknowns[]` item naming the identity gap and its verification task, so the packet distinguishes "no route to a known person" from "person not yet identified".

Constraints:

- A path's band and `min_edge_strength` come from its weakest edge. A strong first hop does not upgrade a weak second hop.
- `warm_introduction` requires Tier A or B evidence on every edge and no weak or unknown edge; otherwise downgrade to `shared_context` or `value_first_cold`.
- Team pooling means the requester and the connector may be different members. The connector's consent boundary in section 3 applies regardless of who requests.

## 2. Path output contract

One entry per priority target in `warm_paths[]`:

```json
{
  "target": "Jordan Lee",
  "target_company": "Acme Health",
  "objective": "Open the regional operating-leadership conversation.",
  "status": "path_found",
  "requester": "Member requesting access",
  "connector": "Person who owns the decisive relationship",
  "hops": 2,
  "band": "familiar",
  "min_edge_strength": 66,
  "evidence_tier": "B",
  "activation_mode": "warm_introduction",
  "edges": ["one fully evidenced edge object per hop"],
  "risk": "The exact fact that would make this path misleading.",
  "next_action": {"owner": "...", "action": "...", "when": "..."}
}
```

`no_verified_path` entries keep `target`, `objective`, `status`, the fallback `activation_mode`, `risk`, and `next_action`, and never carry edges. The validator enforces both shapes, band consistency with the weakest edge, and the two-hop ceiling.

## 3. Introduction workflow

The introduction is drafted by the skill, approved by the connector, and sent by the connector from their own account. The skill never sends an introduction.

1. **Propose.** Attach the chosen path and record an intro entry at `proposed`. Confirm the target is not suppressed or do-not-contact.
2. **Ask the connector.** Request permission before naming the connector externally — the existing rule in `relationship-intelligence.md`. Record consent with a date. No consent, no introduction; fall back to `shared_context` or `value_first_cold`.
3. **Draft.** Write the forwardable introduction using the conversation-kit shape from `delivery-contract.md`: verified context, labeled hypothesis, one proof, a low-friction question, a reversible CTA. Cite only evidence in the packet. Apply the safe-language table below.
4. **Place the draft.** When an email connector is available for the connector's own mailbox, create the draft there and record the draft ID — the default `draft_only` policy in `system-actions.md`. Otherwise deliver ready-to-paste draft text in the packet and record its location.
5. **Connector approves.** Record a `connector_approved` receipt with evidence (thread or message reference). Edits by the connector supersede the draft.
6. **Connector sends.** Sending is a human action from the connector's account. Record the `sent` receipt with the message identifier when the runtime can read it back; otherwise record the connector's confirmation as the receipt and say so.
7. **Close.** Record `completed` (reply or meeting) or `declined`. Feed the outcome into the evaluation loop.

Bulk introductions are always human-gated. An intro entry under `draft_only` policy can never reach `sent`; moving beyond drafts requires the explicit authorization boundary in `system-actions.md`.

## 4. Introduction ledger contract

One entry per introduction in `intro_ledger[]`:

```json
{
  "target": "Jordan Lee",
  "requester": "Northstar principal",
  "connector": "Dana Whitfield",
  "warm_path_ref": 0,
  "status": "proposed | connector_approved | sent | completed | declined",
  "policy": "draft_only",
  "consent": {"connector_consented": true, "date": "2026-07-14"},
  "draft_location": "Draft prepared in the connector's mailbox.",
  "draft_id": "draft-2201",
  "receipts": [{"stage": "connector_approved", "date": "2026-07-14", "evidence": "thread_id intro-approval-118"}],
  "risk": "The claim the introduction must not imply."
}
```

Validator-enforced honesty: `connector_approved` and beyond require consent; `sent`/`completed` require a `connector_approved` receipt, a `sent` receipt with evidence, an identifier, and a policy that permits sending. A proposed introduction is never described or rendered as sent.

## 5. "How do I know X" summaries

Per-contact summary composed only from Tier A ledger data and stored edges:

- interaction counts and kinds over the window, first and last touch, meeting count;
- the owning member(s) and sources;
- typed shared contexts (edges) with band and freshness; and
- the current activation mode and its risk.

Interaction detail appears only for the requesting owner; teammates receive edge existence, type, band, and shared-context labels. A contact with zero ledger interactions gets the honest answer — "no recorded first-party interaction; the route is X" — not a synthesized history.

## 6. Safe language

Use, in drafts and summaries:

- `Dana, you and I were on the Q2 advisory thread — would you be open to introducing me to ...`
- `Your team has four dated two-way threads with this person; the most recent was July 1.`
- `Both names appear on the same public event roster; that is context, not a relationship.`
- `No verified path exists; the honest route is a value-first note tied to the dated trigger.`

Avoid:

- `You know Jordan` when the evidence is overlap or coattendance.
- `Happy to make a warm intro` before the connector has consented.
- `We're close to their team` from pooled edges the speaker does not own.
- Any implication that a proposed or drafted introduction has been sent.
