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
