"""Repeat representative deterministic SDK scenarios three times."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.smoke_test import _execute_source
from translator.version import __version__
SOURCE = """from agentech import Agentech

Agentech.stand()
Agentech.forward(speed_mps=0.10, duration_s=1.0)
Agentech.turn(angle_deg=15)
Agentech.forward(speed_mps=0.10, duration_s=1.0)
Agentech.stand_at_ease(time=1.0)
Agentech.sway(duration_s=1.0)
status = Agentech.get_status()
Agentech.return_to_home(facing_angle_deg=0)
"""


def _record(execution: Any, result: dict[str, Any]) -> dict[str, Any]:
    metrics = list(execution.command_metrics)
    forwards = [item for item in metrics if item["method"] == "forward"]
    mappings = list(execution.backend_mapping)
    return {
        "execution_status": execution.status,
        "backend_error_code": execution.error_code,
        "methods": [item["method"] for item in metrics],
        "stand_height": next(item for item in metrics if item["method"] == "stand")[
            "end_position"
        ]["z"],
        "forward_1": forwards[0]["body_frame_displacement"]["forward"],
        "turn_yaw": next(item for item in metrics if item["method"] == "turn")[
            "yaw_change"
        ],
        "forward_2": forwards[1]["body_frame_displacement"]["forward"],
        "static_action_profile": next(
            item["backend_mapping"]["profile"]
            for item in mappings
            if item.get("canonical_method") == "stand_at_ease"
        ),
        "periodic_action_profile": next(
            item["backend_mapping"]["profile"]
            for item in mappings
            if item.get("canonical_method") == "sway"
        ),
        "query_status": next(
            item["status"]
            for item in execution.query_results
            if item.get("method") == "get_status"
        ),
        "blocked_error": execution.error_code,
        "schema_version": result["schema_version"],
    }


def run(output: Path, config_dir: Path, seed: int = 0) -> dict[str, Any]:
    repeats = []
    for index in range(3):
        _, _, execution, result = _execute_source(
            SOURCE,
            config_dir=config_dir,
            seed=seed,
            output=output / f"repeat_{index + 1}",
        )
        repeats.append(_record(execution, result))
    reference = repeats[0]
    exact_fields = (
        "execution_status",
        "backend_error_code",
        "methods",
        "static_action_profile",
        "periodic_action_profile",
        "query_status",
        "blocked_error",
        "schema_version",
    )
    numeric_fields = ("stand_height", "forward_1", "turn_yaw", "forward_2")
    exact = all(
        all(record[field] == reference[field] for field in exact_fields)
        for record in repeats[1:]
    )
    numeric = all(
        all(abs(record[field] - reference[field]) <= 1e-9 for field in numeric_fields)
        for record in repeats[1:]
    )
    return {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": seed,
        "repeat_count": 3,
        "scenarios": [
            "stand",
            "forward",
            "turn",
            "turn_then_forward",
            "static_action",
            "periodic_action",
            "sensing",
            "blocked_method",
        ],
        "phase_and_status_consistent": exact,
        "metrics_within_tolerance": numeric,
        "numeric_tolerance": 1e-9,
        "mp4_byte_identity_required": False,
        "repeats": repeats,
        "status": "PASS" if exact and numeric else "FAIL",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "outputs" / "release_validation",
    )
    parser.add_argument("--config-dir", type=Path, default=ROOT / "config")
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args(argv)
    args.output.mkdir(parents=True, exist_ok=True)
    report = run(args.output / "determinism_runs", args.config_dir, args.seed)
    (args.output / "determinism.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    (args.output / "determinism.md").write_text(
        "\n".join(
            [
                "# Determinism Validation",
                "",
                f"Status: **{report['status']}**.",
                "",
                "- Fixed seed/input/config/model repeats: **3**.",
                "- Covered stand, forward, turn, turn-then-forward, one static "
                "action, one periodic action, sensing, and a blocked method.",
                f"- Phase and status consistency: "
                f"**{report['phase_and_status_consistent']}**.",
                f"- Numeric metrics within `1e-9`: "
                f"**{report['metrics_within_tolerance']}**.",
                "- MP4 byte identity was not required.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
