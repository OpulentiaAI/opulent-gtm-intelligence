#!/usr/bin/env python3
"""Exercise the skill from API-shaped source samples through rendered output."""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from email.utils import parseaddr
from pathlib import Path
from typing import Any


SKILL_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = SKILL_DIR / "fixtures"
SOURCE_DIR = FIXTURES_DIR / "source-api-samples"
STORE_DIR = FIXTURES_DIR / "representative-graph-store"
PACKET_PATH = FIXTURES_DIR / "representative-packet.json"
FORBIDDEN_STORE_KEYS = {
    "subject",
    "body",
    "title",
    "notes",
    "description",
    "message_content",
    "attendee_notes",
}


def load_json(name: str) -> Any:
    return json.loads((SOURCE_DIR / name).read_text())


def iso_from_milliseconds(value: str) -> str:
    instant = datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    return instant.isoformat().replace("+00:00", "Z")


def utc_iso(value: str) -> str:
    instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return instant.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def person_id_for_email(address: str) -> str:
    normalized = address.lower()
    mapping = {
        "principal@northstar.example": "person-northstar-principal",
        "dana.whitfield@example.com": "person-dana-whitfield",
    }
    if normalized not in mapping:
        raise AssertionError(f"Sample identity is not mapped: {normalized}")
    return mapping[normalized]


def gmail_interactions() -> list[dict[str, Any]]:
    fixture = load_json("gmail-messages.json")
    assert fixture["api_operation"] == "gmail.users.messages.get"
    owner_email = fixture["account"]["emailAddress"].lower()
    messages = fixture["messages"]
    directions_by_thread: dict[str, set[str]] = {}
    parsed: list[tuple[dict[str, Any], str, list[str]]] = []

    for message in messages:
        headers = {
            item["name"].lower(): item["value"]
            for item in message["payload"]["headers"]
        }
        sender = parseaddr(headers["from"])[1].lower()
        recipients = [
            parseaddr(value.strip())[1].lower()
            for value in headers["to"].split(",")
        ]
        direction = "outbound" if sender == owner_email else "inbound"
        directions_by_thread.setdefault(message["threadId"], set()).add(direction)
        parsed.append((message, sender, recipients))

    interactions = []
    for message, sender, recipients in parsed:
        direction = "outbound" if sender == owner_email else "inbound"
        external = [email for email in [sender, *recipients] if email != owner_email]
        assert len(set(external)) == 1
        participants = [person_id_for_email(sender)]
        participants.extend(
            person_id_for_email(recipient)
            for recipient in recipients
            if recipient != sender
        )
        interactions.append(
            {
                "kind": "email",
                "participants": participants,
                "direction": direction,
                "two_way": directions_by_thread[message["threadId"]]
                == {"outbound", "inbound"},
                "occurred_at": iso_from_milliseconds(message["internalDate"]),
                "thread_key": message["threadId"],
                "owner": person_id_for_email(owner_email),
                "source": "gmail",
            }
        )
    return interactions


def is_service_account(attendee: dict[str, Any]) -> bool:
    label = f"{attendee.get('displayName', '')} {attendee.get('email', '')}".lower()
    return any(token in label for token in (" bot", "recorder@", "noreply@", "service@"))


def calendar_interactions() -> tuple[list[dict[str, Any]], dict[str, int]]:
    fixture = load_json("google-calendar-events.json")
    assert fixture["api_operation"] == "calendar.events.list"
    owner_email = "principal@northstar.example"
    internal_domains = {"northstar.example"}
    exclusions = {
        "cancelled_event": 0,
        "internal": 0,
        "declined_attendee": 0,
        "room_or_resource": 0,
        "service_account": 0,
    }
    interactions: list[dict[str, Any]] = []

    for event in fixture["items"]:
        if event["status"] == "cancelled":
            exclusions["cancelled_event"] += 1
            continue
        eligible: list[str] = []
        for attendee in event.get("attendees", []):
            email = attendee["email"].lower()
            if attendee.get("resource"):
                exclusions["room_or_resource"] += 1
            elif is_service_account(attendee):
                exclusions["service_account"] += 1
            elif attendee.get("responseStatus") == "declined":
                exclusions["declined_attendee"] += 1
            elif email.partition("@")[2] in internal_domains:
                exclusions["internal"] += 1
            elif email != owner_email:
                eligible.append(email)
        for email in eligible:
            interactions.append(
                {
                    "kind": "meeting",
                    "participants": [
                        person_id_for_email(owner_email),
                        person_id_for_email(email),
                    ],
                    "direction": "mutual",
                    "two_way": True,
                    "occurred_at": utc_iso(event["start"]["dateTime"]),
                    "thread_key": event["id"],
                    "owner": person_id_for_email(owner_email),
                    "source": "calendar",
                }
            )
    return interactions, exclusions


def linkedin_connection() -> dict[str, Any]:
    with (SOURCE_DIR / "linkedin-connections.csv").open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 1
    row = rows[0]
    connected_on = datetime.strptime(row["Connected On"], "%d %b %Y").date().isoformat()
    return {
        "person_id": person_id_for_email(row["Email Address"]),
        "name": f"{row['First Name']} {row['Last Name']}",
        "linkedin_url": row["URL"],
        "company": row["Company"],
        "role": row["Position"],
        "connected_on": connected_on,
    }


def assert_source_enrichment(store: Path) -> None:
    people = json.loads((store / "people.json").read_text())
    companies = json.loads((store / "companies.json").read_text())
    edges = json.loads((store / "edges.json").read_text())
    people_by_id = {person["id"]: person for person in people}
    companies_by_domain = {
        domain: company for company in companies for domain in company["domains"]
    }

    linked_in = linkedin_connection()
    dana = people_by_id[linked_in["person_id"]]
    assert dana["name"] == linked_in["name"]
    assert dana["role"] == linked_in["role"]
    assert dana["linkedin_url"] == linked_in["linkedin_url"]
    assert any(item["source"] == "linkedin_export" for item in dana["provenance"])

    context_person = load_json("context-people-retrieve.json")
    assert context_person["api_operation"] == "POST /v1/people/retrieve"
    jordan = people_by_id["person-jordan-lee"]
    assert jordan["name"] == context_person["person"]["name"]
    assert jordan["role"] == context_person["person"]["job_title"]
    assert jordan["linkedin_url"] == context_person["person"]["linkedin_url"]

    context_brand = load_json("context-brand-retrieve.json")
    assert context_brand["api_operation"] == "POST /v1/brand/retrieve"
    acme = companies_by_domain[context_brand["brand"]["domain"]]
    assert acme["name"] == context_brand["brand"]["name"]

    direct_edge_types = {
        edge["type"]
        for edge in edges
        if {edge["from"], edge["to"]}
        == {"person-northstar-principal", "person-dana-whitfield"}
    }
    assert "email_thread" in direct_edge_types
    assert "meeting" in direct_edge_types
    assert "linkedin_connection" in direct_edge_types


def assert_store_matches_api_samples(store: Path) -> dict[str, int]:
    gmail = gmail_interactions()
    calendar, exclusions = calendar_interactions()
    expected = gmail + calendar
    actual = [
        json.loads(line)
        for line in (store / "interactions.jsonl").read_text().splitlines()
        if line.strip()
    ]
    assert actual == expected
    assert len(gmail) == 4
    assert len(calendar) == 2
    assert exclusions == {
        "cancelled_event": 1,
        "internal": 1,
        "declined_attendee": 1,
        "room_or_resource": 1,
        "service_account": 1,
    }
    serialized_store = "\n".join(
        path.read_text() for path in store.iterdir() if path.is_file()
    ).lower()
    for sentinel in (
        "private sample subject",
        "private sample body",
        "private sample title",
        "private sample notes",
        "meet.example/private-link",
    ):
        assert sentinel not in serialized_store
    for interaction in actual:
        assert not FORBIDDEN_STORE_KEYS.intersection(interaction)
    assert_source_enrichment(store)
    return exclusions


def run(command: list[str], *, expect_success: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=SKILL_DIR.parent.parent,
        text=True,
        capture_output=True,
    )
    if expect_success and result.returncode:
        raise AssertionError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n"
            f"{result.stdout}\n{result.stderr}"
        )
    return result


def validate_skill_contract() -> None:
    skill = (SKILL_DIR / "SKILL.md").read_text()
    assert skill.startswith("---\nname: opulent-gtm-intelligence\n")
    assert "\ndescription:" in skill
    for reference in (
        "research-workflow.md",
        "contextdev-execution.md",
        "runtime-tools.md",
        "people-scope-routing.md",
        "network-graph-build.md",
        "network-graph-store.md",
        "warm-path-activation.md",
        "relationship-intelligence.md",
        "signal-intelligence.md",
        "gtm-engineering-system.md",
        "system-actions.md",
        "delivery-contract.md",
        "template-field-guide.md",
    ):
        assert (SKILL_DIR / "references" / reference).is_file()


def validate_privacy_rejection(temp_root: Path) -> None:
    unsafe_store = temp_root / "unsafe-store"
    shutil.copytree(STORE_DIR, unsafe_store)
    interactions_path = unsafe_store / "interactions.jsonl"
    first, *rest = interactions_path.read_text().splitlines()
    unsafe = json.loads(first)
    unsafe["subject"] = "This content must be rejected"
    interactions_path.write_text(
        "\n".join([json.dumps(unsafe), *rest]) + "\n"
    )
    result = run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts" / "validate_graph_store.py"),
            str(unsafe_store),
        ],
        expect_success=False,
    )
    assert result.returncode == 1
    assert "forbidden content fields: subject" in result.stdout


def validate_calendar_packet_rejection(temp_root: Path) -> None:
    unsafe_packet_path = temp_root / "unsafe-calendar-packet.json"
    packet = json.loads(PACKET_PATH.read_text())
    scope = packet["discovery_scope"]
    scope["mode"] = "calendar_derived"
    scope["source"] = "outlook_calendar"
    scope["calendar"] = {
        "calendar_ids": ["primary"],
        "window_start": "2026-05-01T00:00:00-05:00",
        "window_end": "2026-07-01T00:00:00-05:00",
        "timezone": "America/Chicago",
        "event_count": 5,
        "include_organizers": True,
        "include_required_attendees": True,
        "include_optional_attendees": False,
        "include_declined": False,
        "include_internal": False,
        "internal_domains": ["northstar.example"],
        "excluded_attendee_types": [
            "room",
            "resource",
            "distribution_list",
            "service_account",
        ],
        "calendar_payload_sent_to_context": True,
    }
    unsafe_packet_path.write_text(json.dumps(packet))
    result = run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts" / "validate_intelligence_packet.py"),
            str(unsafe_packet_path),
        ],
        expect_success=False,
    )
    assert result.returncode == 1
    assert "calendar_payload_sent_to_context must be false" in result.stdout


def validate_render(temp_root: Path) -> int:
    output = temp_root / "report"
    run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts" / "render_intelligence_report.py"),
            str(PACKET_PATH),
            "--output",
            str(output),
        ]
    )
    html_files = sorted(output.rglob("*.html"))
    assert (output / "index.html") in html_files
    assert len(html_files) >= 3
    for html_file in html_files:
        content = html_file.read_text()
        assert not re.search(r"\{\{[A-Z][A-Z0-9_ -]*\}\}", content)
    assert "Northstar Advisory" in (output / "index.html").read_text()
    return len(html_files)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Test API-shaped source ingestion, validation, and report rendering."
    )
    parser.add_argument(
        "--skip-report",
        action="store_true",
        help="Skip the npm-backed report render for a faster source-contract check.",
    )
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="opulent-e2e-") as temp:
        temp_root = Path(temp)
        validate_skill_contract()
        exclusions = assert_store_matches_api_samples(STORE_DIR)
        graph_result = run(
            [
                sys.executable,
                str(SKILL_DIR / "scripts" / "validate_graph_store.py"),
                str(STORE_DIR),
            ]
        )
        assert "Validation: PASS" in graph_result.stdout
        validate_privacy_rejection(temp_root)
        validate_calendar_packet_rejection(temp_root)
        packet_result = run(
            [
                sys.executable,
                str(SKILL_DIR / "scripts" / "validate_intelligence_packet.py"),
                str(PACKET_PATH),
            ]
        )
        assert "Validation: PASS" in packet_result.stdout
        rendered_pages = 0 if args.skip_report else validate_render(temp_root)

    summary = {
        "gmail_interactions": 4,
        "calendar_interactions": 2,
        "linkedin_connections": 1,
        "context_people_responses": 1,
        "context_brand_responses": 1,
        "calendar_exclusions": exclusions,
        "skill_contract": "passed",
        "privacy_rejection": "passed",
        "calendar_payload_rejection": "passed",
        "graph_validation": "passed",
        "packet_validation": "passed",
        "rendered_html_pages": rendered_pages,
    }
    print("E2E sample-source test: PASS")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
