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


def validate_signal(item: Any, index: int, issues: list[str], warnings: list[str]) -> None:
    location = f"signals[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return
    for key in ("title", "date", "impact"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")
    if item.get("date") and not validate_iso_date(item.get("date")):
        issues.append(f"{location}.date must be an ISO 8601 date or timestamp.")
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
        validate_signal(item, index, issues, warnings)

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

    updates = packet.get("system_updates", [])
    if not isinstance(updates, list):
        issues.append("system_updates must be a list.")
    else:
        for index, update in enumerate(updates):
            if not isinstance(update, dict):
                issues.append(f"system_updates[{index}] must be an object.")
                continue
            if update.get("result") not in FINAL_RESULTS:
                issues.append(
                    f"system_updates[{index}].result must be one of: "
                    + ", ".join(sorted(FINAL_RESULTS))
                )
            if update.get("result") == "verified" and not update.get("verification"):
                issues.append(f"system_updates[{index}] is verified without verification evidence.")

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
