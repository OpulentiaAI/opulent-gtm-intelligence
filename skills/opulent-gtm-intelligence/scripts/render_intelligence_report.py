#!/usr/bin/env python3
"""Render an Opulent GTM packet as a polished overview and enrichment dossiers."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any, Iterable


SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = SKILL_DIR / "assets" / "templates"


def esc(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    return html.escape(str(value), quote=True)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "dossier"


def render_template(path: Path, replacements: dict[str, str]) -> str:
    output = path.read_text()
    for key, value in replacements.items():
        output = output.replace("{{" + key + "}}", value)
    unresolved = sorted(set(re.findall(r"\{\{[A-Z0-9_]+\}\}", output)))
    if unresolved:
        raise ValueError(f"Unresolved template tokens in {path.name}: {', '.join(unresolved)}")
    return output


def evidence_label(item: dict[str, Any]) -> tuple[str, str]:
    if item.get("url"):
        return str(item["url"]), str(item["url"])
    for key, prefix in (("thread_id", "Thread"), ("app_id", "App"), ("file_path", "File")):
        if item.get(key):
            return f"{prefix}: {item[key]}", ""
    return "Evidence", ""


def evidence_html(items: Any) -> str:
    if not isinstance(items, list) or not items:
        return '<p class="empty">No evidence recorded.</p>'
    rows = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label, url = evidence_label(item)
        date = f" · {esc(item.get('date'))}" if item.get("date") else ""
        note = f" — {esc(item.get('note'))}" if item.get("note") else ""
        if url:
            rows.append(f'<li><a href="{esc(url)}" target="_blank" rel="noreferrer">{esc(label)}</a>{date}{note}</li>')
        else:
            rows.append(f"<li>{esc(label)}{date}{note}</li>")
    return '<ul class="evidence">' + "".join(rows) + "</ul>"


def confidence_pill(value: Any) -> str:
    label = str(value or "Unknown")
    css = label.lower() if label in {"Verified", "Estimated", "Unknown"} else "unknown"
    return f'<span class="pill {css}">{esc(label)}</span>'


def score_html(score: Any) -> str:
    number = max(0, min(100, int(score or 0)))
    return f'<div class="score"><div class="score-top"><span>{number}</span><span>/100</span></div><div class="bar"><span style="width:{number}%"></span></div></div>'


def action_text(action: Any) -> str:
    if not isinstance(action, dict):
        return "No next action recorded."
    parts = [action.get("action"), action.get("owner"), action.get("when")]
    return " · ".join(str(part) for part in parts if part)


def target_relationship(edges: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    candidates = [edge for edge in edges if edge.get("from") == name or edge.get("to") == name]
    return max(candidates, key=lambda edge: int(edge.get("strength", 0)), default=None)


def compact_path(edge: dict[str, Any] | None) -> str:
    if not edge:
        return '<span class="subtle">No verified path</span>'
    via = edge.get("via") or str(edge.get("type", "relationship")).replace("_", " ")
    return f'<span class="subtle">{esc(edge.get("from"))} → {esc(via)} → {esc(edge.get("to"))} · {esc(edge.get("strength", 0))}</span>'


def priority_rows(targets: list[dict[str, Any]], edges: list[dict[str, Any]]) -> str:
    if not targets:
        return '<tr><td colspan="5" class="empty">No priority targets recorded.</td></tr>'
    rows = []
    for target in sorted(targets, key=lambda item: int(item.get("fit_score", 0)), reverse=True):
        name = str(target.get("name", "Unnamed"))
        kind = str(target.get("kind", "target")).title()
        dossier = f'dossiers/{slugify(name)}.html'
        rows.append(
            "<tr>"
            f'<td><a class="name" href="{dossier}">{esc(name)}</a><div class="subtle">{esc(kind)} · {confidence_pill(target.get("confidence"))}</div></td>'
            f"<td>{score_html(target.get('fit_score'))}</td>"
            f"<td>{esc(target.get('why_now') or 'No current signal recorded.')}</td>"
            f"<td>{compact_path(target_relationship(edges, name))}</td>"
            f"<td>{esc(action_text(target.get('next_action')))}</td>"
            "</tr>"
        )
    return "".join(rows)


def relationship_cards(edges: list[dict[str, Any]]) -> str:
    if not edges:
        return '<div class="panel empty">No verified relationship paths recorded.</div>'
    cards = []
    for edge in sorted(edges, key=lambda item: int(item.get("strength", 0)), reverse=True):
        strength = max(0, min(100, int(edge.get("strength", 0))))
        via = edge.get("via") or str(edge.get("type", "relationship")).replace("_", " ")
        cards.append(
            '<article class="panel card">'
            f'<div>{confidence_pill(edge.get("confidence"))} <span class="subtle">{esc(str(edge.get("type", "relationship")).replace("_", " "))}</span></div>'
            f'<div class="path"><span class="node">{esc(edge.get("from"))}</span><span class="arrow">→</span><span class="via">{esc(via)}</span><span class="arrow">→</span><span class="node">{esc(edge.get("to"))}</span></div>'
            f'<div class="score-top"><span>Relationship strength</span><span>{strength}/100</span></div><div class="bar"><span style="width:{strength}%"></span></div>'
            f'<p><strong>Activation:</strong> {esc(edge.get("activation_path") or "Validate before use.")}</p>'
            f'<div class="risk"><strong>Risk:</strong> {esc(edge.get("risk") or "No risk statement recorded.")}</div>'
            "</article>"
        )
    return "".join(cards)


def signal_cards(signals: Any) -> str:
    if not isinstance(signals, list) or not signals:
        return '<div class="panel empty">No dated signals recorded.</div>'
    cards = []
    for signal in signals:
        if not isinstance(signal, dict):
            continue
        cards.append(
            '<article class="panel card signal">'
            f'<div class="subtle">{esc(signal.get("date") or "Undated")}</div>'
            f'<h3>{esc(signal.get("title") or "Signal")}</h3>'
            f'<p>{esc(signal.get("impact") or signal.get("description") or "")}</p>'
            f'{evidence_html(signal.get("evidence"))}'
            "</article>"
        )
    return "".join(cards)


def public_example_cards(examples: Any) -> str:
    if not isinstance(examples, list) or not examples:
        return '<div class="panel empty">No public engagement examples included.</div>'
    cards = []
    for example in examples:
        if not isinstance(example, dict):
            continue
        cards.append(
            '<article class="panel card example">'
            f'<div class="subtle">{esc(example.get("relationship_label") or "Public evidence")}</div>'
            f'<h3>{esc(example.get("organization") or example.get("name") or "Organization")}</h3>'
            f'<p>{esc(example.get("demonstration_value") or example.get("summary") or "")}</p>'
            f'{evidence_html(example.get("evidence"))}'
            "</article>"
        )
    return "".join(cards)


def conversation_cards(kits: Any) -> str:
    if not isinstance(kits, list) or not kits:
        return '<div class="panel empty">No conversation kits included.</div>'
    cards = []
    for kit in kits:
        if not isinstance(kit, dict):
            continue
        questions = kit.get("questions") if isinstance(kit.get("questions"), list) else []
        question_html = "".join(f"<li>{esc(question)}</li>" for question in questions)
        cards.append(
            '<article class="panel card kit">'
            f'<div class="subtle">{esc(kit.get("target") or "Target")}</div>'
            f'<h3>{esc(kit.get("context") or "Conversation path")}</h3>'
            f'<blockquote>{esc(kit.get("hypothesis") or "")}</blockquote>'
            f'<p><strong>Proof:</strong> {esc(kit.get("proof") or "")}</p>'
            f'<ol class="questions">{question_html}</ol>'
            f'<p><strong>CTA:</strong> {esc(kit.get("cta") or "")}</p>'
            "</article>"
        )
    return "".join(cards)


def data_health_cards(data: Any) -> str:
    if not isinstance(data, dict) or not data:
        return '<div class="panel empty">No data-health audit included.</div>'
    fields = [
        ("records_reviewed", "records reviewed", ""),
        ("verified_field_coverage", "verified coverage", "%"),
        ("duplicate_rate", "duplicate rate", "%"),
        ("stale_rate", "stale rate", "%"),
        ("conflicts", "field conflicts", ""),
    ]
    cards = []
    for key, label, suffix in fields:
        if key not in data:
            continue
        cards.append(
            '<article class="panel health-card">'
            f'<strong>{esc(data.get(key))}{suffix}</strong>'
            f'<span>{esc(label)}</span>'
            "</article>"
        )
    return "".join(cards) or '<div class="panel empty">No data-health metrics included.</div>'


def application_cards(applications: Any) -> str:
    if not isinstance(applications, list) or not applications:
        return '<div class="panel empty">No scheduled or event-driven applications proposed.</div>'
    cards = []
    for application in applications:
        if not isinstance(application, dict):
            continue
        trigger = application.get("trigger") if isinstance(application.get("trigger"), dict) else {}
        trigger_text = str(trigger.get("type") or "manual").replace("_", " ")
        if trigger.get("value"):
            trigger_text += f" · {trigger.get('value')}"
        if trigger.get("timezone"):
            trigger_text += f" · {trigger.get('timezone')}"
        metric = application.get("metric") if isinstance(application.get("metric"), dict) else {}
        metric_text = metric.get("name") or "Metric not defined"
        if "target" in metric:
            metric_text += f" → {metric.get('target')}"
        budget = application.get("budget") if isinstance(application.get("budget"), dict) else {}
        budget_text = " · ".join(
            f"{str(key).replace('_', ' ')}: {value}" for key, value in budget.items()
        ) or "No budget recorded"
        steps = application.get("steps") if isinstance(application.get("steps"), list) else []
        step_text = " → ".join(str(step) for step in steps) or "No steps recorded"
        stops = application.get("stop_conditions") if isinstance(application.get("stop_conditions"), list) else []
        stop_html = "".join(f"<li>{esc(stop)}</li>" for stop in stops)
        status = str(application.get("status") or "proposed")
        cards.append(
            '<article class="panel card application">'
            f'<div class="app-head"><span class="status {esc(status)}">{esc(status)}</span>'
            f'<span class="subtle">v{esc(application.get("version") or "unversioned")}</span></div>'
            f'<h3>{esc(application.get("name") or "GTM application")}</h3>'
            f'<p>{esc(application.get("objective") or "")}</p>'
            f'<dl class="app-spec"><dt>Trigger</dt><dd>{esc(trigger_text)}</dd>'
            f'<dt>Scope</dt><dd>{esc(application.get("input_scope") or "Not recorded")}</dd>'
            f'<dt>Cursor</dt><dd>{esc(application.get("cursor") or "Not recorded")}</dd>'
            f'<dt>Steps</dt><dd>{esc(step_text)}</dd>'
            f'<dt>Write policy</dt><dd>{esc(str(application.get("write_policy") or "unknown").replace("_", " "))}</dd>'
            f'<dt>Review gate</dt><dd>{esc(application.get("review_gate") or "Not recorded")}</dd>'
            f'<dt>Metric</dt><dd>{esc(metric_text)}</dd>'
            f'<dt>Budget</dt><dd>{esc(budget_text)}</dd></dl>'
            f'<div class="stop"><strong>Stop conditions</strong><ul>{stop_html}</ul></div>'
            f'{evidence_html(application.get("evidence"))}'
            "</article>"
        )
    return "".join(cards)


def system_update_rows(updates: Any) -> str:
    if not isinstance(updates, list) or not updates:
        return '<tr><td colspan="5" class="empty">No CRM or system updates recorded.</td></tr>'
    rows = []
    for update in updates:
        if not isinstance(update, dict):
            continue
        fields = update.get("fields") if isinstance(update.get("fields"), list) else []
        diffs = []
        for field in fields:
            if not isinstance(field, dict):
                continue
            before = esc(field.get("before") if "before" in field else "∅")
            after = esc(field.get("after") if "after" in field else "∅")
            diffs.append(
                f'<div class="diff"><strong>{esc(field.get("field") or "field")}</strong>'
                f'<span>{before} → {after}</span></div>'
            )
        diff_html = "".join(diffs) or '<span class="subtle">No field diff recorded</span>'
        result = str(update.get("result") or "needs review")
        rows.append(
            "<tr>"
            f'<td><strong>{esc(update.get("system") or "System")}</strong><div class="subtle">{esc(update.get("action") or "action")}</div></td>'
            f'<td>{esc(update.get("target") or "Unknown")}</td>'
            f'<td>{diff_html}</td>'
            f'<td><span class="status {esc(result.replace(" ", "-"))}">{esc(result)}</span><div class="subtle">{esc(str(update.get("policy") or "unknown").replace("_", " "))}</div></td>'
            f'<td>{esc(update.get("identifier") or "No identifier")}<div class="subtle">{esc(update.get("verification") or "Not verified")}</div></td>'
            "</tr>"
        )
    return "".join(rows)


def iter_evidence(packet: dict[str, Any]) -> Iterable[dict[str, Any]]:
    collections = [
        "accounts",
        "people",
        "relationships",
        "signals",
        "public_examples",
        "competitors",
        "applications",
        "system_updates",
    ]
    for key in collections:
        values = packet.get(key, [])
        if not isinstance(values, list):
            continue
        for value in values:
            if not isinstance(value, dict):
                continue
            evidence = value.get("evidence", [])
            if isinstance(evidence, list):
                for item in evidence:
                    if isinstance(item, dict):
                        yield item
            if key == "system_updates":
                fields = value.get("fields", [])
                if isinstance(fields, list):
                    for field in fields:
                        if not isinstance(field, dict):
                            continue
                        field_evidence = field.get("evidence", [])
                        if isinstance(field_evidence, list):
                            for item in field_evidence:
                                if isinstance(item, dict):
                                    yield item


def source_appendix(packet: dict[str, Any]) -> str:
    seen: set[str] = set()
    rows = []
    for item in iter_evidence(packet):
        label, url = evidence_label(item)
        identity = url or label
        if identity in seen:
            continue
        seen.add(identity)
        date = f"<div class=\"subtle\">Source date: {esc(item.get('date'))}</div>" if item.get("date") else ""
        if url:
            body = f'<a href="{esc(url)}" target="_blank" rel="noreferrer">{esc(label)}</a>'
        else:
            body = esc(label)
        rows.append(f'<div class="source">{body}{date}</div>')
    return "".join(rows) or '<div class="empty">No sources recorded.</div>'


def enrichment_html(target: dict[str, Any]) -> str:
    details = target.get("enrichment")
    if not isinstance(details, dict):
        details = {}
    defaults = {
        "Type": target.get("kind"),
        "Website": target.get("website"),
        "Sector": target.get("sector"),
        "Geography": target.get("geography"),
    }
    rows = []
    for key, value in {**defaults, **details}.items():
        if value in (None, "", [], {}):
            continue
        if isinstance(value, list):
            value = ", ".join(str(item) for item in value)
        rows.append(f"<dt>{esc(str(key).replace('_', ' '))}</dt><dd>{esc(value)}</dd>")
    return "".join(rows) or "<dt>Status</dt><dd>Detailed enrichment is not yet available.</dd>"


def dossier_relationships(edges: list[dict[str, Any]], name: str) -> str:
    relevant = [edge for edge in edges if edge.get("from") == name or edge.get("to") == name]
    if not relevant:
        return '<p class="empty">No verified relationship path. Use value-first outreach or continue research.</p>'
    rows = []
    for edge in sorted(relevant, key=lambda item: int(item.get("strength", 0)), reverse=True):
        strength = max(0, min(100, int(edge.get("strength", 0))))
        via = edge.get("via") or str(edge.get("type", "relationship")).replace("_", " ")
        rows.append(
            '<div class="edge">'
            f'<div class="path"><span class="node">{esc(edge.get("from"))}</span><span class="arrow">→</span><span class="via">{esc(via)}</span><span class="arrow">→</span><span class="node">{esc(edge.get("to"))}</span></div>'
            f'<div class="bar"><span style="width:{strength}%"></span></div>'
            f'<p><strong>{strength}/100 · {esc(edge.get("confidence") or "Unknown")}</strong> — {esc(edge.get("activation_path") or "Validate before use.")}</p>'
            f'<div class="risk">{esc(edge.get("risk") or "No risk statement recorded.")}</div>'
            "</div>"
        )
    return "".join(rows)


def dossier_risks(target: dict[str, Any]) -> str:
    risks = target.get("risks")
    unknowns = target.get("unknowns")
    values = []
    if isinstance(risks, list):
        values.extend(risks)
    if isinstance(unknowns, list):
        values.extend(unknowns)
    if not values:
        return '<p class="empty">No risks or unknowns recorded.</p>'
    return "<ul>" + "".join(f"<li>{esc(value)}</li>" for value in values) + "</ul>"


def render_dossiers(packet: dict[str, Any], output_dir: Path, edges: list[dict[str, Any]]) -> None:
    dossier_dir = output_dir / "dossiers"
    dossier_dir.mkdir(parents=True, exist_ok=True)
    template = TEMPLATE_DIR / "enrichment-dossier.html"
    for kind, values in (("account", packet.get("accounts", [])), ("person", packet.get("people", []))):
        if not isinstance(values, list):
            continue
        for target in values:
            if not isinstance(target, dict):
                continue
            name = str(target.get("name") or "Unnamed")
            subtitle = target.get("subtitle") or target.get("role") or target.get("sector") or target.get("website") or "Enrichment dossier"
            replacements = {
                "NAME": esc(name),
                "KIND": esc(kind),
                "SUBTITLE": esc(subtitle),
                "CONFIDENCE": esc(target.get("confidence") or "Unknown"),
                "SCORE": esc(target.get("fit_score") or 0),
                "GENERATED_AT": esc(packet.get("generated_at") or "Unknown"),
                "WHY_NOW": esc(target.get("why_now") or "No current signal recorded."),
                "ANGLE": esc(target.get("angle") or "No recommended angle recorded."),
                "ENRICHMENT": enrichment_html(target),
                "RELATIONSHIPS": dossier_relationships(edges, name),
                "NEXT_ACTION": f'<div class="action">{esc(action_text(target.get("next_action")))}</div>',
                "RISKS": dossier_risks(target),
                "EVIDENCE": evidence_html(target.get("evidence")),
            }
            rendered = render_template(template, replacements)
            (dossier_dir / f"{slugify(name)}.html").write_text(rendered)


def render_report(packet: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    edges = [edge for edge in packet.get("relationships", []) if isinstance(edge, dict)] if isinstance(packet.get("relationships"), list) else []
    targets = []
    for kind, values in (("account", packet.get("accounts", [])), ("person", packet.get("people", []))):
        if isinstance(values, list):
            for value in values:
                if isinstance(value, dict):
                    targets.append({**value, "kind": kind})

    brief_items = packet.get("executive_brief") if isinstance(packet.get("executive_brief"), list) else []
    brief_html = "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in brief_items) + "</ul>"
    strong_paths = sum(1 for edge in edges if int(edge.get("strength", 0)) >= 80)
    applications = packet.get("applications", []) if isinstance(packet.get("applications"), list) else []
    updates = packet.get("system_updates", []) if isinstance(packet.get("system_updates"), list) else []
    verified_updates = sum(1 for update in updates if isinstance(update, dict) and update.get("result") == "verified")
    kpis = [
        (len(targets), "priority targets"),
        (len(edges), "relationship edges"),
        (len(applications), "GTM applications"),
        (verified_updates, "verified writes"),
        (strong_paths, "direct paths"),
    ]
    kpi_html = "".join(f'<div class="kpi"><strong>{value}</strong><span>{esc(label)}</span></div>' for value, label in kpis[:4])

    replacements = {
        "CLIENT": esc(packet.get("client") or "Client intelligence"),
        "OBJECTIVE": esc(packet.get("objective") or "Prioritized intelligence and next actions"),
        "MODE": esc(packet.get("mode") or "deep"),
        "GENERATED_AT": esc(packet.get("generated_at") or "Unknown"),
        "EXECUTIVE_BRIEF": brief_html,
        "KPI_CARDS": kpi_html,
        "DATA_HEALTH_CARDS": data_health_cards(packet.get("data_health")),
        "PRIORITY_ROWS": priority_rows(targets, edges),
        "RELATIONSHIP_CARDS": relationship_cards(edges),
        "SIGNAL_CARDS": signal_cards(packet.get("signals")),
        "PUBLIC_EXAMPLES": public_example_cards(packet.get("public_examples")),
        "CONVERSATION_KITS": conversation_cards(packet.get("conversation_kits")),
        "APPLICATION_CARDS": application_cards(applications),
        "SYSTEM_UPDATE_ROWS": system_update_rows(updates),
        "SOURCE_APPENDIX": source_appendix(packet),
    }
    rendered = render_template(TEMPLATE_DIR / "intelligence-brief.html", replacements)
    (output_dir / "index.html").write_text(rendered)
    render_dossiers(packet, output_dir, edges)


def main() -> int:
    parser = argparse.ArgumentParser(description="Render an Opulent GTM intelligence report.")
    parser.add_argument("packet", help="Path to a validated packet JSON file.")
    parser.add_argument("--output", required=True, help="Output directory for index.html and dossiers.")
    args = parser.parse_args()

    packet = json.loads(Path(args.packet).read_text())
    if not isinstance(packet, dict):
        raise SystemExit("Packet root must be a JSON object.")
    output_dir = Path(args.output).expanduser().resolve()
    render_report(packet, output_dir)
    print(f"Rendered overview: {output_dir / 'index.html'}")
    print(f"Rendered dossiers: {output_dir / 'dossiers'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
