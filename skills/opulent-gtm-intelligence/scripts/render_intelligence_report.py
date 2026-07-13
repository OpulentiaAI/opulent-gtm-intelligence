#!/usr/bin/env python3
"""Build a validated packet with the static-export Next.js report application."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from validate_intelligence_packet import validate


SKILL_DIR = Path(__file__).resolve().parent.parent
REPORT_APP = SKILL_DIR / "assets" / "report-app"


def require_executable(name: str) -> str:
    executable = shutil.which(name)
    if not executable:
        raise RuntimeError(f"Required executable is unavailable: {name}")
    return executable


def run(command: list[str], cwd: Path, environment: dict[str, str]) -> None:
    print(f"+ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, env=environment, check=True)


def validate_packet(packet: Any) -> dict[str, Any]:
    issues, warnings = validate(packet)
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)
    if issues:
        joined = "\n".join(f"- {issue}" for issue in issues)
        raise ValueError(f"Packet validation failed:\n{joined}")
    if not isinstance(packet, dict):
        raise ValueError("Packet root must be a JSON object.")
    return packet


def build_report(packet: dict[str, Any], output_dir: Path) -> None:
    require_executable("npm")
    if not (REPORT_APP / "package-lock.json").is_file():
        raise RuntimeError(f"Report template is missing package-lock.json: {REPORT_APP}")

    environment = os.environ.copy()
    environment["NEXT_TELEMETRY_DISABLED"] = "1"
    environment["CI"] = "1"

    with tempfile.TemporaryDirectory(prefix="opulent-report-") as temporary:
        build_dir = Path(temporary) / "report-app"
        shutil.copytree(REPORT_APP, build_dir, ignore=shutil.ignore_patterns("node_modules", ".next", "out", "*.tsbuildinfo"))
        (build_dir / "data" / "packet.json").write_text(
            json.dumps(packet, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], build_dir, environment)
        run(["npm", "run", "build"], build_dir, environment)

        exported = build_dir / "out"
        if not (exported / "index.html").is_file():
            raise RuntimeError("Next.js build completed without an exported index.html.")
        dossier_count = len(packet.get("accounts", [])) + len(packet.get("people", []))
        exported_dossiers = (
            list((exported / "dossiers").glob("*/index.html"))
            if (exported / "dossiers").is_dir()
            else []
        )
        if len(exported_dossiers) != dossier_count:
            raise RuntimeError(
                f"Expected {dossier_count} dossier routes, found {len(exported_dossiers)}."
            )

        if output_dir.exists():
            shutil.rmtree(output_dir)
        shutil.copytree(exported, output_dir)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate and statically export an Opulent GTM intelligence report."
    )
    parser.add_argument("packet", help="Path to packet JSON.")
    parser.add_argument(
        "--output", required=True, help="Output directory for the exported report."
    )
    args = parser.parse_args()

    try:
        packet = validate_packet(json.loads(Path(args.packet).read_text(encoding="utf-8")))
        output_dir = Path(args.output).expanduser().resolve()
        build_report(packet, output_dir)
    except (OSError, ValueError, json.JSONDecodeError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"Exported overview: {output_dir / 'index.html'}")
    print(f"Exported dossiers: {output_dir / 'dossiers'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
