#!/usr/bin/env python3
"""Validate a self-contained Opulent GTM network graph store directory.

The store is the skill-owned persistence layer for first-party network
intelligence: versioned workspace JSON artifacts that every run loads,
delta-updates, and re-validates. See references/network-graph-store.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


CONFIDENCE = {"Verified", "Estimated", "Unknown"}
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
    "email_thread",
    "meeting",
    "linkedin_connection",
    "linkedin_message",
    "crm_activity",
}
RELATIONSHIP_BANDS = {"strong", "familiar", "weak", "unknown"}
EVIDENCE_TIERS = {"A", "B", "C", "D"}
STRENGTH_COMPONENT_MAX = {
    "evidence_quality": 30,
    "recency": 20,
    "relevance": 25,
    "access": 15,
    "reciprocity": 10,
}
SOURCE_STATUS = {"available", "missing", "unauthenticated", "not_required"}
INTERACTION_KINDS = {"email", "meeting", "crm_activity", "linkedin_message"}
PRIVACY_LEVELS = {"private", "team", "masked"}
FORBIDDEN_INTERACTION_KEYS = {
    "subject",
    "body",
    "title",
    "notes",
    "description",
    "message_content",
    "attendee_notes",
}
REQUIRED_FILES = (
    "store-manifest.json",
    "people.json",
    "companies.json",
    "edges.json",
    "interactions.jsonl",
    "lists.json",
    "cursors.json",
)


def band_for_strength(strength: Any) -> str | None:
    if not isinstance(strength, (int, float)) or isinstance(strength, bool):
        return None
    if strength >= 80:
        return "strong"
    if strength >= 60:
        return "familiar"
    if strength >= 40:
        return "weak"
    return "unknown"


def validate_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def load_json(path: Path, issues: list[str]) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        issues.append(f"{path.name}: cannot parse JSON ({exc}).")
        return None


def validate_manifest(manifest: Any, issues: list[str]) -> None:
    location = "store-manifest.json"
    if not isinstance(manifest, dict):
        issues.append(f"{location} must be a JSON object.")
        return

    if not manifest.get("schema_version"):
        issues.append(f"{location} is missing schema_version.")
    if manifest.get("metadata_only") is not True:
        issues.append(
            f"{location}.metadata_only must be true; the store never carries message bodies or subjects."
        )
    for key in ("window_start", "window_end", "last_run_at"):
        if not validate_iso_date(manifest.get(key)):
            issues.append(f"{location}.{key} must be an ISO 8601 date or timestamp.")

    members = manifest.get("members")
    if not isinstance(members, list) or not members:
        issues.append(f"{location}.members must be a non-empty list.")
        members = []
    for index, member in enumerate(members):
        member_location = f"{location}.members[{index}]"
        if not isinstance(member, dict):
            issues.append(f"{member_location} must be an object.")
            continue
        for key in ("id", "name"):
            if not member.get(key):
                issues.append(f"{member_location} is missing {key}.")
        if member.get("consent") is not True:
            issues.append(
                f"{member_location}.consent must be true; a member cannot be pooled without consent."
            )
        if not isinstance(member.get("sources_connected"), list):
            issues.append(f"{member_location}.sources_connected must be a list.")

    sources = manifest.get("sources")
    if not isinstance(sources, list) or not sources:
        issues.append(f"{location}.sources must list every candidate source with a status.")
        sources = []
    for index, source in enumerate(sources):
        source_location = f"{location}.sources[{index}]"
        if not isinstance(source, dict):
            issues.append(f"{source_location} must be an object.")
            continue
        if not source.get("source"):
            issues.append(f"{source_location} is missing source.")
        status = source.get("status")
        if status not in SOURCE_STATUS:
            issues.append(
                f"{source_location}.status must be one of: " + ", ".join(sorted(SOURCE_STATUS))
            )
        ingested = source.get("ingested")
        if not isinstance(ingested, bool):
            issues.append(f"{source_location}.ingested must be true or false.")
        elif ingested and status != "available":
            issues.append(
                f"{source_location} cannot be ingested while status is {status}."
            )
        if status in {"missing", "unauthenticated"} and not source.get("blocked_read"):
            issues.append(f"{source_location} requires blocked_read for a blocked source.")

    runs = manifest.get("runs")
    if not isinstance(runs, int) or isinstance(runs, bool) or runs < 1:
        issues.append(f"{location}.runs must be a positive integer.")


def validate_people(people: Any, issues: list[str]) -> set[str]:
    ids: set[str] = set()
    if not isinstance(people, list):
        issues.append("people.json must be a list.")
        return ids
    dedup_keys: dict[str, str] = {}
    for index, person in enumerate(people):
        location = f"people[{index}]"
        if not isinstance(person, dict):
            issues.append(f"{location} must be an object.")
            continue
        identifier = person.get("id")
        if not identifier:
            issues.append(f"{location} is missing id.")
        elif identifier in ids:
            issues.append(f"{location}.id duplicates {identifier}.")
        else:
            ids.add(identifier)
        if not person.get("name"):
            issues.append(f"{location} is missing name.")
        if person.get("privacy") not in PRIVACY_LEVELS:
            issues.append(f"{location}.privacy must be private, team, or masked.")
        if person.get("identity_confidence") not in CONFIDENCE:
            issues.append(
                f"{location}.identity_confidence must be Verified, Estimated, or Unknown."
            )
        if not isinstance(person.get("suppressed"), bool):
            issues.append(f"{location}.suppressed must be true or false.")
        keys = person.get("dedup_keys")
        if not isinstance(keys, list) or not keys:
            issues.append(f"{location}.dedup_keys must be a non-empty list.")
            keys = []
        for key in keys:
            if key in dedup_keys:
                issues.append(
                    f"{location}.dedup_keys '{key}' collides with {dedup_keys[key]}; identities must be merged."
                )
            else:
                dedup_keys[key] = str(identifier)
        provenance = person.get("provenance")
        if not isinstance(provenance, list) or not provenance:
            issues.append(f"{location}.provenance must record where the identity came from.")
    return ids


def validate_companies(companies: Any, issues: list[str]) -> set[str]:
    ids: set[str] = set()
    if not isinstance(companies, list):
        issues.append("companies.json must be a list.")
        return ids
    for index, company in enumerate(companies):
        location = f"companies[{index}]"
        if not isinstance(company, dict):
            issues.append(f"{location} must be an object.")
            continue
        identifier = company.get("id")
        if not identifier:
            issues.append(f"{location} is missing id.")
        elif identifier in ids:
            issues.append(f"{location}.id duplicates {identifier}.")
        else:
            ids.add(identifier)
        if not company.get("name"):
            issues.append(f"{location} is missing name.")
        if not isinstance(company.get("dedup_keys"), list) or not company.get("dedup_keys"):
            issues.append(f"{location}.dedup_keys must be a non-empty list.")
    return ids


def validate_edges(
    edges: Any, node_ids: set[str], issues: list[str], warnings: list[str]
) -> int:
    if not isinstance(edges, list):
        issues.append("edges.json must be a list.")
        return 0
    seen: set[tuple[Any, Any, Any, Any]] = set()
    for index, edge in enumerate(edges):
        location = f"edges[{index}]"
        if not isinstance(edge, dict):
            issues.append(f"{location} must be an object.")
            continue
        for key in ("from", "to", "type", "via", "owner", "activation_path", "risk"):
            if not edge.get(key):
                issues.append(f"{location} is missing {key}.")
        for key in ("from", "to", "owner"):
            value = edge.get(key)
            if value and value not in node_ids:
                issues.append(f"{location}.{key} '{value}' does not resolve to a stored node.")
        identity = (edge.get("from"), edge.get("to"), edge.get("type"), edge.get("via"))
        if identity in seen:
            issues.append(f"{location} duplicates the edge upsert key (from, to, type, via).")
        seen.add(identity)

        if edge.get("type") not in RELATION_TYPES:
            issues.append(
                f"{location}.type must be one of: " + ", ".join(sorted(RELATION_TYPES))
            )
        strength = edge.get("strength")
        if not isinstance(strength, (int, float)) or isinstance(strength, bool) or not 0 <= strength <= 100:
            issues.append(f"{location}.strength must be a number from 0 to 100.")
        confidence = edge.get("confidence")
        if confidence not in CONFIDENCE:
            issues.append(f"{location}.confidence must be Verified, Estimated, or Unknown.")
        if isinstance(strength, (int, float)) and not isinstance(strength, bool):
            if confidence == "Estimated" and strength > 79:
                issues.append(f"{location}.strength cannot exceed 79 for Estimated confidence.")
            if confidence == "Unknown" and strength > 39:
                issues.append(f"{location}.strength cannot exceed 39 for Unknown confidence.")
        band = edge.get("band")
        if band not in RELATIONSHIP_BANDS:
            issues.append(f"{location}.band must be strong, familiar, weak, or unknown.")
        else:
            expected = band_for_strength(strength)
            if expected and band != expected:
                issues.append(f"{location}.band must be {expected} for strength {strength:g}.")
        tier = edge.get("evidence_tier")
        if tier not in EVIDENCE_TIERS:
            issues.append(f"{location}.evidence_tier must be A, B, C, or D.")
        elif tier == "D" and isinstance(strength, (int, float)) and strength >= 40:
            issues.append(
                f"{location} is Tier D and cannot score as a usable relationship."
            )
        components = edge.get("strength_components")
        if not isinstance(components, dict):
            issues.append(f"{location}.strength_components must be an object.")
        else:
            total = 0.0
            valid = True
            for key, maximum in STRENGTH_COMPONENT_MAX.items():
                value = components.get(key)
                if (
                    not isinstance(value, (int, float))
                    or isinstance(value, bool)
                    or not 0 <= value <= maximum
                ):
                    issues.append(
                        f"{location}.strength_components.{key} must be a number from 0 to {maximum}."
                    )
                    valid = False
                else:
                    total += float(value)
            if valid and isinstance(strength, (int, float)) and not isinstance(strength, bool):
                if abs(float(strength) - total) > 0.001:
                    issues.append(
                        f"{location}.strength must equal its five strength components ({total:g})."
                    )
        if not validate_iso_date(edge.get("last_verified")):
            issues.append(f"{location}.last_verified must be an ISO 8601 date or timestamp.")
        evidence = edge.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            issues.append(f"{location}.evidence requires at least one item.")
    return len(edges) if isinstance(edges, list) else 0


def validate_interactions(
    path: Path, person_ids: set[str], issues: list[str]
) -> int:
    try:
        lines = [line for line in path.read_text().splitlines() if line.strip()]
    except Exception as exc:
        issues.append(f"interactions.jsonl: cannot read ({exc}).")
        return 0
    for index, line in enumerate(lines):
        location = f"interactions[{index}]"
        try:
            item = json.loads(line)
        except Exception:
            issues.append(f"{location} is not valid JSON.")
            continue
        if not isinstance(item, dict):
            issues.append(f"{location} must be an object.")
            continue
        forbidden = FORBIDDEN_INTERACTION_KEYS.intersection(item.keys())
        if forbidden:
            issues.append(
                f"{location} carries forbidden content fields: " + ", ".join(sorted(forbidden))
            )
        if item.get("kind") not in INTERACTION_KINDS:
            issues.append(
                f"{location}.kind must be one of: " + ", ".join(sorted(INTERACTION_KINDS))
            )
        participants = item.get("participants")
        if not isinstance(participants, list) or len(participants) < 2:
            issues.append(f"{location}.participants must list at least two people.")
            participants = []
        for participant in participants:
            if participant not in person_ids:
                issues.append(
                    f"{location}.participants '{participant}' does not resolve to a stored person."
                )
        if not isinstance(item.get("two_way"), bool):
            issues.append(f"{location}.two_way must be true or false.")
        if not validate_iso_date(item.get("occurred_at")):
            issues.append(f"{location}.occurred_at must be an ISO 8601 timestamp.")
        if not item.get("thread_key"):
            issues.append(f"{location} is missing thread_key.")
        owner = item.get("owner")
        if not owner:
            issues.append(f"{location} is missing owner.")
        elif owner not in person_ids:
            issues.append(f"{location}.owner '{owner}' does not resolve to a stored person.")
        if not item.get("source"):
            issues.append(f"{location} is missing source.")
    return len(lines)


def validate_lists(lists: Any, node_ids: set[str], issues: list[str]) -> int:
    if not isinstance(lists, list):
        issues.append("lists.json must be a list.")
        return 0
    ids: set[str] = set()
    for index, entry in enumerate(lists):
        location = f"lists[{index}]"
        if not isinstance(entry, dict):
            issues.append(f"{location} must be an object.")
            continue
        identifier = entry.get("id")
        if not identifier:
            issues.append(f"{location} is missing id.")
        elif identifier in ids:
            issues.append(f"{location}.id duplicates {identifier}.")
        else:
            ids.add(identifier)
        if not entry.get("name"):
            issues.append(f"{location} is missing name.")
        if entry.get("kind") not in {"people", "companies"}:
            issues.append(f"{location}.kind must be people or companies.")
        members = entry.get("members")
        if not isinstance(members, list):
            issues.append(f"{location}.members must be a list, even when empty.")
            members = []
        for member in members:
            if member not in node_ids:
                issues.append(f"{location}.members '{member}' does not resolve to a stored node.")
        if not isinstance(entry.get("shared"), bool):
            issues.append(f"{location}.shared must be true or false.")
    return len(lists)


def validate_cursors(cursors: Any, manifest: Any, issues: list[str]) -> None:
    if not isinstance(cursors, dict):
        issues.append("cursors.json must be an object keyed by source.")
        return
    for source, cursor in cursors.items():
        location = f"cursors.{source}"
        if not isinstance(cursor, dict):
            issues.append(f"{location} must be an object.")
            continue
        if not cursor.get("cursor"):
            issues.append(f"{location} is missing cursor.")
        if not validate_iso_date(cursor.get("last_run_at")):
            issues.append(f"{location}.last_run_at must be an ISO 8601 timestamp.")
        if not cursor.get("status"):
            issues.append(f"{location} is missing status.")
    if isinstance(manifest, dict):
        ingested_sources = {
            source.get("source")
            for source in manifest.get("sources", [])
            if isinstance(source, dict) and source.get("ingested") is True
        }
        for source in ingested_sources:
            if source not in cursors:
                issues.append(
                    f"cursors.json is missing a cursor for ingested source '{source}'."
                )


def validate_store(store_dir: Path) -> tuple[list[str], list[str]]:
    issues: list[str] = []
    warnings: list[str] = []

    for name in REQUIRED_FILES:
        if not (store_dir / name).exists():
            issues.append(f"Missing required store file: {name}.")
    if issues:
        return issues, warnings

    manifest = load_json(store_dir / "store-manifest.json", issues)
    people = load_json(store_dir / "people.json", issues)
    companies = load_json(store_dir / "companies.json", issues)
    edges = load_json(store_dir / "edges.json", issues)
    lists = load_json(store_dir / "lists.json", issues)
    cursors = load_json(store_dir / "cursors.json", issues)

    validate_manifest(manifest, issues)
    person_ids = validate_people(people, issues)
    company_ids = validate_companies(companies, issues)
    node_ids = person_ids | company_ids

    edge_count = validate_edges(edges, node_ids, issues, warnings)
    interaction_count = validate_interactions(
        store_dir / "interactions.jsonl", person_ids, issues
    )
    list_count = validate_lists(lists, node_ids, issues)
    validate_cursors(cursors, manifest, issues)

    if isinstance(manifest, dict):
        counts = manifest.get("counts")
        if not isinstance(counts, dict):
            issues.append("store-manifest.json.counts must be an object.")
        else:
            actual = {
                "people": len(person_ids),
                "companies": len(company_ids),
                "edges": edge_count,
                "interactions": interaction_count,
                "lists": list_count,
            }
            for key, value in actual.items():
                declared = counts.get(key)
                if declared != value:
                    issues.append(
                        f"store-manifest.json.counts.{key} is {declared} but the store contains {value}."
                    )

    return issues, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a self-contained Opulent GTM network graph store directory."
    )
    parser.add_argument("store", help="Path to the graph store directory.")
    args = parser.parse_args()

    store_dir = Path(args.store)
    if not store_dir.is_dir():
        print(f"ERROR: {store_dir} is not a directory.", file=sys.stderr)
        return 2

    issues, warnings = validate_store(store_dir)
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
