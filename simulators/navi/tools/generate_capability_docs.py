"""Generate the user-facing 117-method capability matrix and limitation lists."""

from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from translator.version import __version__
CONFIG = ROOT / "config" / "backend_capabilities.json"
DOCS = ROOT / "docs"
FIELDS = (
    "method",
    "category",
    "backend_behavior_status",
    "sdk_contract_status",
    "ground_truth_status",
    "evidence_status",
    "physical_execution",
    "video_availability",
    "known_limitations",
)


def main() -> int:
    payload = json.loads(CONFIG.read_text(encoding="utf-8"))
    entries = sorted(payload["entries"], key=lambda item: item["method"])
    DOCS.mkdir(parents=True, exist_ok=True)
    rows = []
    for entry in entries:
        video = ROOT / "results" / "full_sdk_correction" / entry["method"] / "video.mp4"
        rows.append(
            {
                "method": entry["method"],
                "category": entry["category"],
                "backend_behavior_status": entry["backend_behavior_status"],
                "sdk_contract_status": entry["sdk_contract_status"],
                "ground_truth_status": entry["ground_truth_status"],
                "evidence_status": entry["evidence_status"],
                "physical_execution": str(entry["physical_execution"]).lower(),
                "video_availability": "AVAILABLE_IN_EVIDENCE_BUNDLE" if video.is_file() else "NONE",
                "known_limitations": "; ".join(entry["limitations"]) or "none",
            }
        )
    with (DOCS / "sdk_capabilities.csv").open(
        "w", encoding="utf-8", newline=""
    ) as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    lines = [
        "# Navi SDK Capability Matrix",
        "",
        f"Release: **v{__version__}**. Canonical methods: **{len(rows)}**.",
        "",
        "`status` in the source JSON is a deprecated compatibility field derived "
        "from the four dimensions below. It is not an independent completion claim.",
        "",
        "> 117/117 structured coverage does not mean that all 117 methods are fully "
        "equivalent to hardware.",
        "",
        "| Method | Category | Backend behavior | SDK contract | Ground Truth | Evidence | Physical | Video | Limitations |",
        "|---|---|---|---|---|---|:---:|---|---|",
    ]
    for row in rows:
        lines.append(
            f"| `{row['method']}` | {row['category']} | "
            f"`{row['backend_behavior_status']}` | `{row['sdk_contract_status']}` | "
            f"`{row['ground_truth_status']}` | `{row['evidence_status']}` | "
            f"{row['physical_execution']} | {row['video_availability']} | "
            f"{row['known_limitations']} |"
        )
    (DOCS / "sdk_capabilities.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    groups: dict[str, list[str]] = defaultdict(list)
    for entry in entries:
        groups[entry["status"]].append(entry["method"])
    (DOCS / "capability_status_counts.json").write_text(
        json.dumps(
            {
                "tool_version": __version__,
                "canonical_method_count": len(entries),
                "legacy_status_counts": {
                    key: len(value) for key, value in sorted(groups.items())
                },
                "methods_by_legacy_status": dict(sorted(groups.items())),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(rows)} capability rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
