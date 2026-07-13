#!/usr/bin/env python3
"""Validate an Opulent GTM intelligence packet."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


MODES = {"quick", "deep", "deeper"}
CONFIDENCE = {"Verified", "Estimated", "Unknown"}
FINAL_RESULTS = {"verified", "drafted", "blocked", "skipped", "needs review"}
APPLICATION_STATUS = {"proposed", "active", "paused", "blocked"}
CONTEXT_OPERATION_STATUS = {"proposed", "executed", "failed", "blocked"}
CONTEXT_METHODS = {
    "/parse": "POST",
    "/web/scrape/markdown": "GET",
    "/web/crawl": "POST",
    "/web/extract": "POST",
    "/web/search": "POST",
    "/web/competitors": "GET",
    "/people/retrieve": "POST",
    "/brand/retrieve": "POST",
    "/brand/ai/query": "POST",
    "/brand/ai/product": "POST",
    "/brand/ai/products": "POST",
    "/utility/prefetch": "POST",
    "/web/naics": "GET",
    "/web/sic": "GET",
    "/web/screenshot": "GET",
    "/web/styleguide": "GET",
    "/web/fonts": "GET",
    "/monitors": "POST",
}
TRIGGER_TYPES = {
    "manual",
    "schedule",
    "webhook",
    "crm_event",
    "calendar_event",
    "inbox_event",
}
WRITE_POLICIES = {
    "autonomous_safe_field",
    "review_required",
    "draft_only",
    "blocked",
}
PROTECTED_FIELDS = {
    "opportunity_stage",
    "deal_value",
    "forecast_category",
    "owner",
    "suppression",
    "do_not_contact",
    "message_sent",
    "candidate_status",
}
RELATION_TYPES = {
    "works_at",
    "worked_at",
    "reports_to",
    "reported_to",
    "board_overlap",
    "colleague_overlap",
    "placed_at",
    "engaged_by",
    "client_claim",
    "partnered_with",
    "invested_in",
    "advised_by",
    "event_coattendance",
    "association_overlap",
    "education_overlap",
    "public_interaction",
    "introduced_by",
}
SIGNAL_TYPES = {
    "leadership_hire",
    "leadership_departure",
    "promotion",
    "champion_move",
    "board_change",
    "performance_change",
    "layoff",
    "competitive_move",
    "pricing_change",
    "product_launch",
    "product_deprecation",
    "outage",
    "security_incident",
    "hiring_cluster",
    "expansion",
    "contraction",
    "technology_change",
    "transformation_program",
    "funding",
    "merger_acquisition",
    "ownership_change",
    "regulatory_change",
    "legal_event",
    "relationship_activity",
    "search_mandate",
    "other",
}
SIGNAL_SOURCE_KINDS = {
    "first_party",
    "filing",
    "direct_communication",
    "licensed_provider",
    "third_party",
    "crm",
    "inbox",
    "calendar",
}
SIGNAL_SCORE_COMPONENTS = (
    "novelty",
    "magnitude",
    "relevance",
    "actionability",
    "evidence_quality",
    "relationship_leverage",
)
SIGNAL_COMPONENT_MAX = {
    "novelty": 20,
    "magnitude": 20,
    "relevance": 20,
    "actionability": 15,
    "evidence_quality": 15,
    "relationship_leverage": 10,
}


def is_url(value: Any) -> bool:
    return isinstance(value, str) and value.startswith(("https://", "http://"))


def validate_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def parse_iso_date(value: Any):
    if not validate_iso_date(value):
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()


def validate_evidence(
    evidence: Any, location: str, issues: list[str], warnings: list[str]
) -> None:
    if not isinstance(evidence, list) or not evidence:
        issues.append(f"{location} requires at least one evidence item.")
        return

    for index, item in enumerate(evidence):
        item_location = f"{location}.evidence[{index}]"
        if not isinstance(item, dict):
            issues.append(f"{item_location} must be an object.")
            continue
        if not any(item.get(key) for key in ("url", "app_id", "file_path", "thread_id")):
            issues.append(
                f"{item_location} requires url, app_id, file_path, or thread_id."
            )
        if item.get("url") and not is_url(item["url"]):
            issues.append(f"{item_location}.url must start with http:// or https://.")
        if not item.get("date"):
            warnings.append(f"{item_location} has no source date.")


def validate_target(
    item: Any, collection: str, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"{collection}[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    if not item.get("name"):
        issues.append(f"{location} is missing name.")

    score = item.get("fit_score")
    if not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score <= 100:
        issues.append(f"{location}.fit_score must be a number from 0 to 100.")

    confidence = item.get("confidence")
    if confidence not in CONFIDENCE:
        issues.append(f"{location}.confidence must be Verified, Estimated, or Unknown.")

    if not item.get("why_now"):
        warnings.append(f"{location} has no why_now signal or durable strategic reason.")

    validate_evidence(item.get("evidence"), location, issues, warnings)

    next_action = item.get("next_action")
    if not isinstance(next_action, dict):
        issues.append(f"{location}.next_action must be an object.")
    else:
        for key in ("owner", "action", "when"):
            if not next_action.get(key):
                issues.append(f"{location}.next_action is missing {key}.")

    for key in ("email", "phone"):
        if item.get(key) and not item.get(f"{key}_source"):
            issues.append(f"{location}.{key} requires {key}_source; guessed contact data is invalid.")

    if collection == "accounts" and confidence == "Unknown" and isinstance(score, (int, float)) and score > 30:
        warnings.append(f"{location} is Unknown but fit_score exceeds the 30-point evidence cap.")
    if collection == "people" and confidence == "Unknown" and isinstance(score, (int, float)) and score > 40:
        warnings.append(f"{location} is Unknown but fit_score exceeds the 40-point evidence cap.")


def validate_relationship(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"relationships[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in ("from", "to", "type", "activation_path", "risk"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    relation_type = item.get("type")
    if relation_type and relation_type not in RELATION_TYPES:
        issues.append(
            f"{location}.type must be one of: " + ", ".join(sorted(RELATION_TYPES))
        )

    strength = item.get("strength")
    if not isinstance(strength, (int, float)) or isinstance(strength, bool) or not 0 <= strength <= 100:
        issues.append(f"{location}.strength must be a number from 0 to 100.")

    if item.get("confidence") not in CONFIDENCE:
        issues.append(f"{location}.confidence must be Verified, Estimated, or Unknown.")

    if not validate_iso_date(item.get("last_verified")):
        issues.append(f"{location}.last_verified must be an ISO 8601 date or timestamp.")

    validate_evidence(item.get("evidence"), location, issues, warnings)

    if strength and strength >= 80 and item.get("confidence") != "Verified":
        warnings.append(f"{location} is scored as a direct path without Verified confidence.")


def validate_signal(
    item: Any,
    index: int,
    issues: list[str],
    warnings: list[str],
    as_of: Any = None,
) -> None:
    location = f"signals[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return
    for key in (
        "title",
        "target",
        "previous_state",
        "current_state",
        "delta",
        "relationship_context",
        "why_it_changes_the_call",
        "conversation_angle",
        "verification_task",
        "route",
    ):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    signal_type = item.get("type")
    if signal_type not in SIGNAL_TYPES:
        issues.append(
            f"{location}.type must be one of: " + ", ".join(sorted(SIGNAL_TYPES))
        )

    source_kind = item.get("source_kind")
    if source_kind not in SIGNAL_SOURCE_KINDS:
        issues.append(
            f"{location}.source_kind must be one of: "
            + ", ".join(sorted(SIGNAL_SOURCE_KINDS))
        )

    for key in ("observed_at", "effective_at", "expires_at"):
        if not validate_iso_date(item.get(key)):
            issues.append(f"{location}.{key} must be an ISO 8601 date or timestamp.")

    effective_date = parse_iso_date(item.get("effective_at"))
    expiry_date = parse_iso_date(item.get("expires_at"))
    as_of_date = parse_iso_date(as_of)
    if effective_date and expiry_date and expiry_date < effective_date:
        issues.append(f"{location}.expires_at cannot be before effective_at.")

    confidence = item.get("confidence")
    if confidence not in CONFIDENCE:
        issues.append(f"{location}.confidence must be Verified, Estimated, or Unknown.")

    freshness = item.get("freshness_days")
    if not isinstance(freshness, int) or isinstance(freshness, bool) or freshness < 0:
        issues.append(f"{location}.freshness_days must be a non-negative integer.")

    component_total = 0.0
    component_valid = True
    for key in SIGNAL_SCORE_COMPONENTS:
        value = item.get(key)
        maximum = SIGNAL_COMPONENT_MAX[key]
        if (
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not 0 <= value <= maximum
        ):
            issues.append(f"{location}.{key} must be a number from 0 to {maximum}.")
            component_valid = False
        else:
            component_total += float(value)

    score = item.get("score")
    if not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score <= 100:
        issues.append(f"{location}.score must be a number from 0 to 100.")
    elif component_valid and abs(float(score) - component_total) > 0.001:
        issues.append(
            f"{location}.score must equal the six score components ({component_total:g})."
        )

    affected_people = item.get("affected_people")
    if not isinstance(affected_people, list):
        issues.append(f"{location}.affected_people must be a list, even when empty.")

    if confidence == "Estimated" and isinstance(score, (int, float)) and score > 79:
        issues.append(f"{location}.score cannot exceed 79 for Estimated confidence.")
    if confidence == "Unknown" and isinstance(score, (int, float)) and score > 39:
        issues.append(f"{location}.score cannot exceed 39 for Unknown confidence.")
    if str(item.get("previous_state", "")).strip().lower() == "unknown" and isinstance(score, (int, float)) and score >= 80:
        issues.append(f"{location} cannot be act-now while previous_state is Unknown.")
    if expiry_date and as_of_date and expiry_date < as_of_date:
        if isinstance(score, (int, float)) and score >= 80:
            issues.append(f"{location} cannot be act-now after expires_at.")
        else:
            warnings.append(f"{location} is expired and should route to re-verification, not outreach.")

    validate_evidence(item.get("evidence"), location, issues, warnings)


def validate_public_example(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"public_examples[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return
    for key in ("organization", "relationship_label", "demonstration_value"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")
    validate_evidence(item.get("evidence"), location, issues, warnings)


def validate_conversation_kit(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"conversation_kits[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return
    for key in ("target", "context", "hypothesis", "proof", "cta"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")
    questions = item.get("questions")
    if not isinstance(questions, list) or len(questions) < 2:
        issues.append(f"{location}.questions must contain at least two discovery questions.")
    if "mutual" in str(item.get("context", "")).lower() and not item.get("relationship_edge"):
        warnings.append(f"{location} uses mutual-connection language without relationship_edge.")


def validate_data_health(item: Any, issues: list[str]) -> None:
    if item in (None, {}):
        return
    if not isinstance(item, dict):
        issues.append("data_health must be an object.")
        return

    records = item.get("records_reviewed")
    if not isinstance(records, int) or isinstance(records, bool) or records < 0:
        issues.append("data_health.records_reviewed must be a non-negative integer.")

    for key in ("verified_field_coverage", "duplicate_rate", "stale_rate"):
        value = item.get(key)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 100:
            issues.append(f"data_health.{key} must be a number from 0 to 100.")

    conflicts = item.get("conflicts")
    if not isinstance(conflicts, int) or isinstance(conflicts, bool) or conflicts < 0:
        issues.append("data_health.conflicts must be a non-negative integer.")


def validate_application(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"applications[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in (
        "name",
        "version",
        "objective",
        "owner",
        "input_scope",
        "cursor",
        "idempotency_key",
        "review_gate",
    ):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    status = item.get("status")
    if status not in APPLICATION_STATUS:
        issues.append(
            f"{location}.status must be one of: " + ", ".join(sorted(APPLICATION_STATUS))
        )

    trigger = item.get("trigger")
    if not isinstance(trigger, dict):
        issues.append(f"{location}.trigger must be an object.")
    else:
        trigger_type = trigger.get("type")
        if trigger_type not in TRIGGER_TYPES:
            issues.append(
                f"{location}.trigger.type must be one of: "
                + ", ".join(sorted(TRIGGER_TYPES))
            )
        if trigger_type != "manual" and not trigger.get("value"):
            issues.append(f"{location}.trigger.value is required for {trigger_type}.")
        if trigger_type == "schedule" and not trigger.get("timezone"):
            issues.append(f"{location}.trigger.timezone is required for schedules.")

    steps = item.get("steps")
    if not isinstance(steps, list) or not steps or not all(isinstance(step, str) and step for step in steps):
        issues.append(f"{location}.steps must contain at least one named step.")

    policy = item.get("write_policy")
    if policy not in WRITE_POLICIES:
        issues.append(
            f"{location}.write_policy must be one of: "
            + ", ".join(sorted(WRITE_POLICIES))
        )

    metric = item.get("metric")
    if not isinstance(metric, dict) or not metric.get("name") or "target" not in metric:
        issues.append(f"{location}.metric requires name and target.")

    budget = item.get("budget")
    if not isinstance(budget, dict) or not budget:
        issues.append(f"{location}.budget must be a non-empty object.")
    else:
        for key, value in budget.items():
            if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
                issues.append(f"{location}.budget.{key} must be a positive number.")

    stop_conditions = item.get("stop_conditions")
    if not isinstance(stop_conditions, list) or not stop_conditions:
        issues.append(f"{location}.stop_conditions must contain at least one condition.")

    validate_evidence(item.get("evidence"), location, issues, warnings)

    if status == "active":
        if not item.get("identifier"):
            issues.append(f"{location} is active without an installation identifier.")
        last_run = item.get("last_run")
        if not isinstance(last_run, dict) or not last_run.get("run_id") or not last_run.get("result"):
            issues.append(f"{location} is active without a verified last_run receipt.")


def validate_system_update(
    update: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"system_updates[{index}]"
    if not isinstance(update, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in ("system", "action", "target"):
        if not update.get(key):
            issues.append(f"{location} is missing {key}.")

    policy = update.get("policy")
    if policy not in WRITE_POLICIES:
        issues.append(
            f"{location}.policy must be one of: " + ", ".join(sorted(WRITE_POLICIES))
        )

    result = update.get("result")
    if result not in FINAL_RESULTS:
        issues.append(
            f"{location}.result must be one of: " + ", ".join(sorted(FINAL_RESULTS))
        )

    action = str(update.get("action", "")).lower()
    if action in {"create", "update"} and not update.get("idempotency_key"):
        issues.append(f"{location}.{action} requires idempotency_key.")

    fields = update.get("fields", [])
    if action in {"create", "update"} and (not isinstance(fields, list) or not fields):
        issues.append(f"{location}.{action} requires a non-empty fields list.")
        fields = []
    elif not isinstance(fields, list):
        issues.append(f"{location}.fields must be a list.")
        fields = []

    for field_index, field in enumerate(fields):
        field_location = f"{location}.fields[{field_index}]"
        if not isinstance(field, dict):
            issues.append(f"{field_location} must be an object.")
            continue
        if not field.get("field"):
            issues.append(f"{field_location} is missing field.")
        if "after" not in field:
            issues.append(f"{field_location} is missing after.")
        if field.get("confidence") not in CONFIDENCE:
            issues.append(f"{field_location}.confidence must be Verified, Estimated, or Unknown.")

        field_name = str(field.get("field", ""))
        if policy == "autonomous_safe_field":
            if field.get("confidence") != "Verified":
                issues.append(f"{field_location} must be Verified for autonomous_safe_field.")
            validate_evidence(field.get("evidence"), field_location, issues, warnings)
            if field_name in PROTECTED_FIELDS:
                issues.append(f"{field_location}.{field_name} is protected from autonomous writes.")
        elif field.get("evidence"):
            validate_evidence(field.get("evidence"), field_location, issues, warnings)

        if field_name in PROTECTED_FIELDS and result == "verified" and not update.get("approval"):
            issues.append(f"{field_location}.{field_name} was verified without approval evidence.")

    if result == "verified":
        if not update.get("identifier"):
            issues.append(f"{location} is verified without a returned identifier.")
        if not update.get("verification"):
            issues.append(f"{location} is verified without read-after-write evidence.")


def validate_context_operation(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"context_operations[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in (
        "natural_language_job",
        "method",
        "endpoint",
        "expected_response",
        "opulent_route",
        "write_policy",
        "status",
    ):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    endpoint = item.get("endpoint")
    prefix = "https://api.context.dev/v1"
    path = str(endpoint)[len(prefix):] if isinstance(endpoint, str) and endpoint.startswith(prefix) else ""
    if not path:
        issues.append(f"{location}.endpoint must start with {prefix}.")
    else:
        normalized = path
        if path.startswith("/monitors/"):
            if path.endswith("/run"):
                expected_method = "POST"
            else:
                expected_method = "GET"
        elif path.startswith("/monitors") and path != "/monitors":
            expected_method = "GET"
        else:
            expected_method = CONTEXT_METHODS.get(normalized)
        method = str(item.get("method", "")).upper()
        if expected_method and method != expected_method:
            issues.append(f"{location}.method must be {expected_method} for {path}.")
        if not expected_method:
            warnings.append(f"{location}.endpoint is not in the validated Context GTM endpoint set.")

    if not isinstance(item.get("params"), dict):
        issues.append(f"{location}.params must be an object, even when empty.")
    if not isinstance(item.get("body"), dict):
        issues.append(f"{location}.body must be an object, even when empty.")

    body = item.get("body") if isinstance(item.get("body"), dict) else {}
    tags = item.get("tags") if isinstance(item.get("tags"), list) else body.get("tags")
    if not isinstance(tags, list) or len(tags) < 3 or not all(isinstance(tag, str) and tag for tag in tags):
        issues.append(f"{location} requires at least three non-empty request tags in tags or body.tags.")

    policy = item.get("write_policy")
    if policy not in WRITE_POLICIES:
        issues.append(
            f"{location}.write_policy must be one of: " + ", ".join(sorted(WRITE_POLICIES))
        )

    status = item.get("status")
    if status not in CONTEXT_OPERATION_STATUS:
        issues.append(
            f"{location}.status must be one of: "
            + ", ".join(sorted(CONTEXT_OPERATION_STATUS))
        )
    if status == "executed":
        receipt = item.get("receipt")
        if not isinstance(receipt, dict):
            issues.append(f"{location} is executed without a receipt object.")
        else:
            if not any(receipt.get(key) for key in ("request_id", "monitor_id", "run_id", "change_id")):
                issues.append(f"{location}.receipt requires a request, monitor, run, or change identifier.")
            if not receipt.get("verification"):
                issues.append(f"{location}.receipt requires verification.")

    validate_evidence(item.get("evidence"), location, issues, warnings)


def validate(packet: Any) -> tuple[list[str], list[str]]:
    issues: list[str] = []
    warnings: list[str] = []

    if not isinstance(packet, dict):
        return ["Packet root must be a JSON object."], warnings

    for key in ("client", "objective"):
        if not packet.get(key):
            issues.append(f"Missing {key}.")

    if packet.get("mode") not in MODES:
        issues.append("mode must be quick, deep, or deeper.")

    if not validate_iso_date(packet.get("generated_at")):
        issues.append("generated_at must be an ISO 8601 timestamp.")

    brief = packet.get("executive_brief")
    if not isinstance(brief, list) or not brief:
        issues.append("executive_brief must be a non-empty list.")

    validate_data_health(packet.get("data_health"), issues)

    accounts = packet.get("accounts", [])
    people = packet.get("people", [])
    if not isinstance(accounts, list):
        issues.append("accounts must be a list.")
        accounts = []
    if not isinstance(people, list):
        issues.append("people must be a list.")
        people = []
    if not accounts and not people:
        issues.append("Packet requires at least one account or person.")

    for index, item in enumerate(accounts):
        validate_target(item, "accounts", index, issues, warnings)
    for index, item in enumerate(people):
        validate_target(item, "people", index, issues, warnings)

    relationships = packet.get("relationships", [])
    if not isinstance(relationships, list):
        issues.append("relationships must be a list.")
        relationships = []
    for index, item in enumerate(relationships):
        validate_relationship(item, index, issues, warnings)
    if packet.get("mode") in {"deep", "deeper"} and not relationships:
        warnings.append("Deep intelligence packet has no verified relationship edges.")

    seen_edges: set[tuple[Any, Any, Any, Any]] = set()
    for index, edge in enumerate(relationships):
        if not isinstance(edge, dict):
            continue
        identity = (edge.get("from"), edge.get("to"), edge.get("type"), edge.get("via"))
        if identity in seen_edges:
            warnings.append(f"relationships[{index}] duplicates an earlier edge.")
        seen_edges.add(identity)

    signals = packet.get("signals", [])
    if not isinstance(signals, list):
        issues.append("signals must be a list.")
        signals = []
    for index, item in enumerate(signals):
        validate_signal(item, index, issues, warnings, packet.get("generated_at"))

    public_examples = packet.get("public_examples", [])
    if not isinstance(public_examples, list):
        issues.append("public_examples must be a list.")
        public_examples = []
    for index, item in enumerate(public_examples):
        validate_public_example(item, index, issues, warnings)

    conversation_kits = packet.get("conversation_kits", [])
    if not isinstance(conversation_kits, list):
        issues.append("conversation_kits must be a list.")
        conversation_kits = []
    for index, item in enumerate(conversation_kits):
        validate_conversation_kit(item, index, issues, warnings)

    applications = packet.get("applications", [])
    if not isinstance(applications, list):
        issues.append("applications must be a list.")
        applications = []
    for index, item in enumerate(applications):
        validate_application(item, index, issues, warnings)

    context_operations = packet.get("context_operations", [])
    if not isinstance(context_operations, list):
        issues.append("context_operations must be a list.")
        context_operations = []
    for index, item in enumerate(context_operations):
        validate_context_operation(item, index, issues, warnings)

    updates = packet.get("system_updates", [])
    if not isinstance(updates, list):
        issues.append("system_updates must be a list.")
    else:
        for index, update in enumerate(updates):
            validate_system_update(update, index, issues, warnings)

    return issues, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate an Opulent GTM intelligence packet.")
    parser.add_argument("packet", help="Path to packet JSON.")
    args = parser.parse_args()

    try:
        packet = json.loads(Path(args.packet).read_text())
    except Exception as exc:
        print(f"ERROR: could not read packet: {exc}", file=sys.stderr)
        return 2

    issues, warnings = validate(packet)
    print(f"Validation: {'FAIL' if issues else 'PASS'}")
    if issues:
        print("\nBlocking issues:")
        for issue in issues:
            print(f"- {issue}")
    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
