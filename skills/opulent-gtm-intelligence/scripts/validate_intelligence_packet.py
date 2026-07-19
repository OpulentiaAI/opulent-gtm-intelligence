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
DISCOVERY_MODES = {"single_person", "user_list", "calendar_derived", "network_history"}
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
ACTIVATION_MODES = {
    "direct_history",
    "warm_introduction",
    "shared_context",
    "value_first_cold",
    "monitor",
}
WARM_PATH_STATUS = {"path_found", "no_verified_path"}
INTRO_STATUS = {"proposed", "connector_approved", "sent", "completed", "declined"}
NETWORK_SOURCE_STATUS = {"available", "missing", "unauthenticated", "not_required"}


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

    rollup = item.get("interaction_rollup")
    if rollup is not None:
        validate_interaction_rollup(rollup, f"{location}.interaction_rollup", issues, warnings)


def validate_edge(
    item: Any, location: str, issues: list[str], warnings: list[str]
) -> None:
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

    confidence = item.get("confidence")
    if confidence not in CONFIDENCE:
        issues.append(f"{location}.confidence must be Verified, Estimated, or Unknown.")

    if not validate_iso_date(item.get("last_verified")):
        issues.append(f"{location}.last_verified must be an ISO 8601 date or timestamp.")

    validate_evidence(item.get("evidence"), location, issues, warnings)

    if isinstance(strength, (int, float)) and not isinstance(strength, bool):
        if confidence == "Estimated" and strength > 79:
            issues.append(f"{location}.strength cannot exceed 79 for Estimated confidence.")
        if confidence == "Unknown" and strength > 39:
            issues.append(f"{location}.strength cannot exceed 39 for Unknown confidence.")

    band = item.get("band")
    if band is not None:
        if band not in RELATIONSHIP_BANDS:
            issues.append(
                f"{location}.band must be one of: " + ", ".join(sorted(RELATIONSHIP_BANDS))
            )
        else:
            expected_band = band_for_strength(strength)
            if expected_band and band != expected_band:
                issues.append(
                    f"{location}.band must be {expected_band} for strength {strength:g}."
                )

    tier = item.get("evidence_tier")
    if tier is not None:
        if tier not in EVIDENCE_TIERS:
            issues.append(f"{location}.evidence_tier must be A, B, C, or D.")
        elif tier == "D" and isinstance(strength, (int, float)) and strength >= 40:
            issues.append(
                f"{location} is Tier D (no demonstrated interaction) and cannot score as a usable relationship."
            )

    components = item.get("strength_components")
    if components is not None:
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

    if strength and strength >= 80 and confidence != "Verified":
        warnings.append(f"{location} is scored as a direct path without Verified confidence.")


def validate_relationship(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    validate_edge(item, f"relationships[{index}]", issues, warnings)


def validate_interaction_rollup(
    item: Any, location: str, issues: list[str], warnings: list[str]
) -> None:
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    counts: dict[str, int] = {}
    for key in ("interactions_12mo", "two_way_threads", "meetings"):
        value = item.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            issues.append(f"{location}.{key} must be a non-negative integer.")
        else:
            counts[key] = value
    if (
        "interactions_12mo" in counts
        and "two_way_threads" in counts
        and counts["two_way_threads"] > counts["interactions_12mo"]
    ):
        issues.append(f"{location}.two_way_threads cannot exceed interactions_12mo.")

    for key in ("first_interaction_at", "last_interaction_at"):
        value = item.get(key)
        if value is not None and not validate_iso_date(value):
            issues.append(f"{location}.{key} must be null or an ISO 8601 date.")

    for key in ("owners", "sources"):
        if not isinstance(item.get(key), list):
            issues.append(f"{location}.{key} must be a list, even when empty.")

    reciprocity = item.get("reciprocity_score")
    if (
        not isinstance(reciprocity, (int, float))
        or isinstance(reciprocity, bool)
        or not 0 <= reciprocity <= 10
    ):
        issues.append(f"{location}.reciprocity_score must be a number from 0 to 10.")
    if counts.get("interactions_12mo") == 0 and isinstance(reciprocity, (int, float)) and reciprocity > 0:
        issues.append(
            f"{location}.reciprocity_score must be 0 when no interactions are recorded."
        )

    forbidden = {"subject", "body", "notes", "message_content"}
    present = forbidden.intersection(item.keys())
    if present:
        issues.append(
            f"{location} must never carry interaction content fields: " + ", ".join(sorted(present))
        )


def validate_network_health(
    item: Any, issues: list[str], warnings: list[str]
) -> None:
    location = "network_health"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    if item.get("metadata_only") is not True:
        issues.append(
            f"{location}.metadata_only must be true; message bodies and subjects are never ingested."
        )

    for key in ("window_start", "window_end"):
        if not validate_iso_date(item.get(key)):
            issues.append(f"{location}.{key} must be an ISO 8601 date or timestamp.")
    window_start = parse_iso_date(item.get("window_start"))
    window_end = parse_iso_date(item.get("window_end"))
    if window_start and window_end and window_end < window_start:
        issues.append(f"{location}.window_end cannot be before window_start.")

    members = item.get("members")
    if not isinstance(members, list) or not members:
        issues.append(f"{location}.members must be a non-empty list of pooled members.")
        members = []
    for index, member in enumerate(members):
        member_location = f"{location}.members[{index}]"
        if not isinstance(member, dict):
            issues.append(f"{member_location} must be an object.")
            continue
        if not member.get("name"):
            issues.append(f"{member_location} is missing name.")
        if member.get("consent") is not True:
            issues.append(
                f"{member_location}.consent must be true; a member cannot be pooled without consent."
            )
        if not isinstance(member.get("sources_connected"), list):
            issues.append(f"{member_location}.sources_connected must be a list.")

    sources = item.get("sources")
    if not isinstance(sources, list) or not sources:
        issues.append(
            f"{location}.sources must list every candidate source with its discovery status."
        )
        sources = []
    for index, source in enumerate(sources):
        source_location = f"{location}.sources[{index}]"
        if not isinstance(source, dict):
            issues.append(f"{source_location} must be an object.")
            continue
        if not source.get("source"):
            issues.append(f"{source_location} is missing source.")
        status = source.get("status")
        if status not in NETWORK_SOURCE_STATUS:
            issues.append(
                f"{source_location}.status must be one of: "
                + ", ".join(sorted(NETWORK_SOURCE_STATUS))
            )
        ingested = source.get("ingested")
        if not isinstance(ingested, bool):
            issues.append(f"{source_location}.ingested must be true or false.")
        elif ingested and status != "available":
            issues.append(
                f"{source_location} cannot be ingested while status is {status}; never claim a source that was not read."
            )
        if status in {"missing", "unauthenticated"} and not source.get("blocked_read"):
            issues.append(
                f"{source_location} requires blocked_read describing the exact blocked ingestion."
            )
        interactions = source.get("interactions_ingested")
        if interactions is not None and (
            not isinstance(interactions, int) or isinstance(interactions, bool) or interactions < 0
        ):
            issues.append(f"{source_location}.interactions_ingested must be a non-negative integer.")

    for key in (
        "people_resolved",
        "companies_resolved",
        "interactions_total",
        "edges_total",
    ):
        value = item.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            issues.append(f"{location}.{key} must be a non-negative integer.")

    for key in ("identity_resolution_rate", "two_way_share"):
        value = item.get(key)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 100:
            issues.append(f"{location}.{key} must be a number from 0 to 100.")

    edges_total = item.get("edges_total")
    for key, allowed in (
        ("edge_tier_coverage", EVIDENCE_TIERS),
        ("band_distribution", RELATIONSHIP_BANDS),
    ):
        distribution = item.get(key)
        if not isinstance(distribution, dict):
            issues.append(f"{location}.{key} must be an object.")
            continue
        total = 0
        valid = True
        for bucket, value in distribution.items():
            if bucket not in allowed:
                issues.append(f"{location}.{key}.{bucket} is not a valid bucket.")
                valid = False
            elif not isinstance(value, int) or isinstance(value, bool) or value < 0:
                issues.append(f"{location}.{key}.{bucket} must be a non-negative integer.")
                valid = False
            else:
                total += value
        if (
            valid
            and isinstance(edges_total, int)
            and not isinstance(edges_total, bool)
            and total != edges_total
        ):
            issues.append(f"{location}.{key} must sum to edges_total ({edges_total}).")

    manifest = item.get("store_manifest")
    if not isinstance(manifest, dict):
        issues.append(f"{location}.store_manifest must be an object.")
    else:
        for key in ("schema_version", "path"):
            if not manifest.get(key):
                issues.append(f"{location}.store_manifest is missing {key}.")
        if not validate_iso_date(manifest.get("last_run_at")):
            issues.append(f"{location}.store_manifest.last_run_at must be an ISO 8601 timestamp.")


def validate_warm_path(
    item: Any, index: int, issues: list[str], warnings: list[str]
) -> None:
    location = f"warm_paths[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in ("target", "objective", "risk"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    status = item.get("status")
    if status not in WARM_PATH_STATUS:
        issues.append(
            f"{location}.status must be one of: " + ", ".join(sorted(WARM_PATH_STATUS))
        )

    mode = item.get("activation_mode")
    if mode not in ACTIVATION_MODES:
        issues.append(
            f"{location}.activation_mode must be one of: " + ", ".join(sorted(ACTIVATION_MODES))
        )

    next_action = item.get("next_action")
    if not isinstance(next_action, dict):
        issues.append(f"{location}.next_action must be an object.")
    else:
        for key in ("owner", "action", "when"):
            if not next_action.get(key):
                issues.append(f"{location}.next_action is missing {key}.")

    if status == "no_verified_path":
        if mode in {"direct_history", "warm_introduction"}:
            issues.append(
                f"{location} has no verified path and cannot use a relationship-based activation mode."
            )
        if item.get("edges"):
            issues.append(f"{location} cannot carry edges while status is no_verified_path.")
        return

    for key in ("requester", "connector"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    hops = item.get("hops")
    if hops not in (1, 2):
        issues.append(f"{location}.hops must be 1 or 2; longer chains do not support honest introductions.")

    edges = item.get("edges")
    if not isinstance(edges, list) or not edges:
        issues.append(f"{location}.edges must contain the evidenced path edges.")
        edges = []
    if hops in (1, 2) and edges and len(edges) != hops:
        issues.append(f"{location}.edges must contain exactly {hops} edge(s).")

    strengths: list[float] = []
    tiers: list[str] = []
    bands: list[str] = []
    for edge_index, edge in enumerate(edges):
        edge_location = f"{location}.edges[{edge_index}]"
        validate_edge(edge, edge_location, issues, warnings)
        if isinstance(edge, dict):
            strength = edge.get("strength")
            if isinstance(strength, (int, float)) and not isinstance(strength, bool):
                strengths.append(float(strength))
            if edge.get("evidence_tier") in EVIDENCE_TIERS:
                tiers.append(edge["evidence_tier"])
            if edge.get("band") in RELATIONSHIP_BANDS:
                bands.append(edge["band"])

    min_strength = item.get("min_edge_strength")
    if strengths and len(strengths) == len(edges):
        expected_min = min(strengths)
        if (
            not isinstance(min_strength, (int, float))
            or isinstance(min_strength, bool)
            or abs(float(min_strength) - expected_min) > 0.001
        ):
            issues.append(
                f"{location}.min_edge_strength must equal the weakest edge strength ({expected_min:g})."
            )
        band = item.get("band")
        expected_band = band_for_strength(expected_min)
        if band is not None and expected_band and band != expected_band:
            issues.append(f"{location}.band must be {expected_band} for its weakest edge.")

    if mode == "warm_introduction":
        if tiers and len(tiers) == len(edges):
            if any(tier not in {"A", "B"} for tier in tiers):
                issues.append(
                    f"{location} warm_introduction requires Tier A or B evidence on every edge."
                )
        else:
            issues.append(
                f"{location} warm_introduction requires evidence_tier on every edge."
            )
        if bands and any(band in {"weak", "unknown"} for band in bands):
            issues.append(
                f"{location} warm_introduction cannot rest on a weak or unknown edge; validate the path first."
            )


def validate_intro_entry(
    item: Any,
    index: int,
    warm_path_count: int,
    issues: list[str],
    warnings: list[str],
) -> None:
    location = f"intro_ledger[{index}]"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in ("target", "requester", "connector", "risk"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    status = item.get("status")
    if status not in INTRO_STATUS:
        issues.append(
            f"{location}.status must be one of: " + ", ".join(sorted(INTRO_STATUS))
        )

    policy = item.get("policy")
    if policy not in WRITE_POLICIES:
        issues.append(
            f"{location}.policy must be one of: " + ", ".join(sorted(WRITE_POLICIES))
        )

    ref = item.get("warm_path_ref")
    if ref is not None and (
        not isinstance(ref, int) or isinstance(ref, bool) or not 0 <= ref < warm_path_count
    ):
        issues.append(f"{location}.warm_path_ref must index an entry in warm_paths.")

    consent = item.get("consent")
    consented = isinstance(consent, dict) and consent.get("connector_consented") is True
    if status in {"connector_approved", "sent", "completed"} and not consented:
        issues.append(
            f"{location} cannot reach {status} without consent.connector_consented true."
        )
    if isinstance(consent, dict) and consent.get("connector_consented") is True and not consent.get("date"):
        issues.append(f"{location}.consent requires a date.")

    receipts = item.get("receipts")
    if not isinstance(receipts, list):
        issues.append(f"{location}.receipts must be a list, even when empty.")
        receipts = []
    stages = {
        receipt.get("stage")
        for receipt in receipts
        if isinstance(receipt, dict) and receipt.get("stage")
    }
    for receipt_index, receipt in enumerate(receipts):
        receipt_location = f"{location}.receipts[{receipt_index}]"
        if not isinstance(receipt, dict):
            issues.append(f"{receipt_location} must be an object.")
            continue
        for key in ("stage", "date", "evidence"):
            if not receipt.get(key):
                issues.append(f"{receipt_location} is missing {key}.")

    if status in {"connector_approved", "sent", "completed"} and "connector_approved" not in stages:
        issues.append(f"{location}.{status} requires a connector_approved receipt.")
    if status in {"sent", "completed"}:
        if "sent" not in stages:
            issues.append(f"{location}.{status} requires a sent receipt with evidence.")
        if not item.get("message_id") and not item.get("draft_id"):
            issues.append(f"{location}.{status} requires a message_id or draft_id identifier.")
        if policy == "draft_only":
            issues.append(
                f"{location} cannot be {status} under draft_only policy; sending requires explicit authorization."
            )
    if status in {"proposed", "connector_approved"} and not item.get("draft_location"):
        warnings.append(f"{location} has no draft_location for the pending introduction draft.")


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


def validate_discovery_scope(
    item: Any, issues: list[str], warnings: list[str]
) -> None:
    location = "discovery_scope"
    if not isinstance(item, dict):
        issues.append(f"{location} must be an object.")
        return

    for key in ("mode", "source", "source_ref", "objective"):
        if not item.get(key):
            issues.append(f"{location} is missing {key}.")

    mode = item.get("mode")
    if mode not in DISCOVERY_MODES:
        issues.append(
            f"{location}.mode must be one of: " + ", ".join(sorted(DISCOVERY_MODES))
        )

    count_keys = (
        "requested_count",
        "candidate_count",
        "deduplicated_count",
        "eligible_count",
        "unique_company_count",
        "excluded_count",
    )
    counts: dict[str, int] = {}
    for key in count_keys:
        value = item.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            issues.append(f"{location}.{key} must be a non-negative integer.")
        else:
            counts[key] = value

    if all(key in counts for key in count_keys):
        if not (
            counts["requested_count"]
            >= counts["candidate_count"]
            >= counts["deduplicated_count"]
            >= counts["eligible_count"]
        ):
            issues.append(
                f"{location} counts must descend requested -> candidate -> deduplicated -> eligible."
            )
        if counts["unique_company_count"] > counts["eligible_count"]:
            issues.append(f"{location}.unique_company_count cannot exceed eligible_count.")
        if counts["excluded_count"] != counts["deduplicated_count"] - counts["eligible_count"]:
            issues.append(
                f"{location}.excluded_count must equal deduplicated_count minus eligible_count."
            )
        if mode == "single_person" and any(
            counts[key] > 1
            for key in ("requested_count", "candidate_count", "deduplicated_count", "eligible_count")
        ):
            issues.append(f"{location} single_person counts cannot exceed one person.")

    if not isinstance(item.get("recurring"), bool):
        issues.append(f"{location}.recurring must be true or false.")

    identity_keys = item.get("identity_keys")
    if not isinstance(identity_keys, list) or not identity_keys or not all(
        isinstance(value, str) and value for value in identity_keys
    ):
        issues.append(f"{location}.identity_keys must contain at least one identity key.")

    exclusions = item.get("exclusions")
    if not isinstance(exclusions, list):
        issues.append(f"{location}.exclusions must be a list.")

    budget = item.get("context_budget")
    if not isinstance(budget, dict):
        issues.append(f"{location}.context_budget must be an object.")
        budget = {}
    budget_keys = (
        "max_people_retrievals",
        "max_brand_retrievals",
        "max_prefetches",
        "max_extracts",
        "max_monitor_creates",
    )
    budget_values: dict[str, int] = {}
    for key in budget_keys:
        value = budget.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            issues.append(f"{location}.context_budget.{key} must be a non-negative integer.")
        else:
            budget_values[key] = value
    for key in ("company_result_reuse", "skip_if_fresh"):
        if budget.get(key) is not True:
            issues.append(f"{location}.context_budget.{key} must be true.")
    if not budget.get("cache_policy"):
        issues.append(f"{location}.context_budget.cache_policy is required.")

    if "eligible_count" in counts and "max_people_retrievals" in budget_values:
        if budget_values["max_people_retrievals"] > counts["eligible_count"]:
            issues.append(
                f"{location}.context_budget.max_people_retrievals cannot exceed eligible_count."
            )
    if "unique_company_count" in counts:
        for key in ("max_brand_retrievals", "max_prefetches", "max_extracts"):
            if key in budget_values and budget_values[key] > counts["unique_company_count"]:
                issues.append(
                    f"{location}.context_budget.{key} cannot exceed unique_company_count."
                )
    if mode == "single_person":
        for key in ("max_people_retrievals", "max_brand_retrievals", "max_prefetches", "max_extracts"):
            if budget_values.get(key, 0) > 1:
                issues.append(f"{location}.context_budget.{key} cannot exceed one in single_person mode.")
    if item.get("recurring") is False and budget_values.get("max_monitor_creates", 0) != 0:
        issues.append(
            f"{location}.context_budget.max_monitor_creates must be zero for non-recurring work."
        )

    calendar = item.get("calendar")
    if mode == "calendar_derived":
        if not isinstance(calendar, dict):
            issues.append(f"{location}.calendar is required for calendar_derived mode.")
            return
        for key in ("window_start", "window_end"):
            if not validate_iso_date(calendar.get(key)):
                issues.append(f"{location}.calendar.{key} must be an ISO 8601 timestamp.")
        if not calendar.get("timezone"):
            issues.append(f"{location}.calendar.timezone is required.")
        calendar_ids = calendar.get("calendar_ids")
        if not isinstance(calendar_ids, list) or not calendar_ids:
            issues.append(f"{location}.calendar.calendar_ids must be a non-empty list.")
        event_count = calendar.get("event_count")
        if not isinstance(event_count, int) or isinstance(event_count, bool) or event_count < 0:
            issues.append(f"{location}.calendar.event_count must be a non-negative integer.")
        for key in (
            "include_organizers",
            "include_required_attendees",
            "include_optional_attendees",
            "include_declined",
            "include_internal",
        ):
            if not isinstance(calendar.get(key), bool):
                issues.append(f"{location}.calendar.{key} must be true or false.")
        if not isinstance(calendar.get("internal_domains"), list):
            issues.append(f"{location}.calendar.internal_domains must be a list.")
        excluded_types = calendar.get("excluded_attendee_types")
        if not isinstance(excluded_types, list) or not {
            "room",
            "resource",
            "distribution_list",
            "service_account",
        }.issubset(set(excluded_types)):
            issues.append(
                f"{location}.calendar.excluded_attendee_types must include room, resource, distribution_list, and service_account."
            )
        if calendar.get("calendar_payload_sent_to_context") is not False:
            issues.append(
                f"{location}.calendar.calendar_payload_sent_to_context must be false."
            )
    elif calendar not in (None, {}):
        warnings.append(f"{location}.calendar is ignored outside calendar_derived mode.")


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


def validate_context_usage_against_scope(
    operations: list[Any], scope: Any, issues: list[str]
) -> None:
    if not isinstance(scope, dict):
        return
    budget = scope.get("context_budget")
    if not isinstance(budget, dict):
        return

    endpoint_budgets = {
        "/people/retrieve": "max_people_retrievals",
        "/brand/retrieve": "max_brand_retrievals",
        "/utility/prefetch": "max_prefetches",
        "/web/extract": "max_extracts",
        "/monitors": "max_monitor_creates",
    }
    counts = {key: 0 for key in endpoint_budgets.values()}
    seen: dict[tuple[str, str], int] = {}
    prefix = "https://api.context.dev/v1"

    for index, operation in enumerate(operations):
        if not isinstance(operation, dict) or operation.get("status") in {"failed", "blocked"}:
            continue
        endpoint = operation.get("endpoint")
        if not isinstance(endpoint, str) or not endpoint.startswith(prefix):
            continue
        path = endpoint[len(prefix):]
        budget_key = endpoint_budgets.get(path)
        if not budget_key:
            continue
        counts[budget_key] += 1

        body = operation.get("body") if isinstance(operation.get("body"), dict) else {}
        if path == "/people/retrieve":
            identity = (body.get("identifiers") or {}).get("linkedinUrl") if isinstance(body.get("identifiers"), dict) else None
        elif path == "/brand/retrieve":
            identity = json.dumps(
                {key: body.get(key) for key in ("type", "domain", "email", "name", "ticker", "url") if body.get(key)},
                sort_keys=True,
            )
        elif path == "/utility/prefetch":
            identity = json.dumps(body.get("identifier", {}), sort_keys=True)
        elif path == "/web/extract":
            identity = json.dumps(
                {"url": body.get("url"), "schema": body.get("schema")}, sort_keys=True
            )
        else:
            identity = json.dumps(
                {
                    "target": body.get("target"),
                    "change_detection": body.get("change_detection"),
                    "schedule": body.get("schedule"),
                },
                sort_keys=True,
            )

        if identity:
            signature = (path, str(identity).lower())
            if signature in seen:
                issues.append(
                    f"context_operations[{index}] duplicates context_operations[{seen[signature]}] for the same canonical Context target/configuration."
                )
            else:
                seen[signature] = index

    for budget_key, used in counts.items():
        limit = budget.get(budget_key)
        if isinstance(limit, int) and not isinstance(limit, bool) and used > limit:
            issues.append(
                f"Context operation ledger uses {used} {budget_key} calls but discovery_scope allows {limit}."
            )


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

    discovery_scope = packet.get("discovery_scope")
    if discovery_scope is not None:
        validate_discovery_scope(discovery_scope, issues, warnings)

    network_health = packet.get("network_health")
    if network_health is not None:
        validate_network_health(network_health, issues, warnings)
    if (
        isinstance(discovery_scope, dict)
        and discovery_scope.get("mode") == "network_history"
        and network_health is None
    ):
        issues.append(
            "network_history mode requires network_health with member consent and source discovery statuses."
        )

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

    warm_paths = packet.get("warm_paths", [])
    if not isinstance(warm_paths, list):
        issues.append("warm_paths must be a list.")
        warm_paths = []
    for index, item in enumerate(warm_paths):
        validate_warm_path(item, index, issues, warnings)

    intro_ledger = packet.get("intro_ledger", [])
    if not isinstance(intro_ledger, list):
        issues.append("intro_ledger must be a list.")
        intro_ledger = []
    for index, item in enumerate(intro_ledger):
        validate_intro_entry(item, index, len(warm_paths), issues, warnings)

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
    if context_operations and discovery_scope is None:
        issues.append(
            "Context-backed person or company work requires discovery_scope with intake counts and a unique-identity call budget."
        )
    validate_context_usage_against_scope(context_operations, discovery_scope, issues)

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
