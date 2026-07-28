"""Build conservative correction mappings from the frozen GT audit."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIT = (
    ROOT
    / "outputs"
    / "new_simulation_translate"
    / "full_sdk_audit"
    / "ground_truth_mapping_audit.json"
)
CONFIG = ROOT / "config" / "full_sdk_corrected_ground_truth.json"
REPORT = (
    ROOT
    / "outputs"
    / "new_simulation_translate"
    / "full_sdk_correction"
    / "ground_truth_corrections.md"
)

STATUS = {
    "DIRECT_EXACT_NAME": ("DIRECT_CONFIRMED", 0.95, True),
    "DIRECT_DOCUMENTED_LINK": ("DIRECT_CONFIRMED", 0.90, True),
    "LEGACY_CONFIRMED": ("LEGACY_CONFIRMED", 0.85, True),
    "SEMANTIC_INFERENCE": ("INFERRED", 0.55, False),
    "AMBIGUOUS": ("AMBIGUOUS", 0.30, False),
    "CONFLICT": ("CONFLICT", 0.10, False),
    "UNMATCHED": ("UNMATCHED", 0.0, False),
}


def main() -> int:
    source = json.loads(AUDIT.read_text(encoding="utf-8"))
    records = []
    for item in source["records"]:
        mapping_status, confidence, usable = STATUS[item["audit_quality"]]
        canonical = item.get("canonical_method")
        record = {
            "video_id": item["video"],
            "canonical_method": (
                canonical
                if mapping_status in {"DIRECT_CONFIRMED", "LEGACY_CONFIRMED"}
                else None
            ),
            "candidate_methods": [canonical] if canonical else [],
            "mapping_status": mapping_status,
            "confidence": confidence,
            "evidence": [
                f"audit_quality:{item['audit_quality']}",
                f"source:{item['source']}",
                f"basis:{item['matching_basis']}",
            ],
            "conflict": (
                item["matching_basis"] if mapping_status == "CONFLICT" else ""
            ),
            "implementation_usable": usable,
            "legacy_token": item.get("legacy_token"),
        }
        records.append(record)
    counts = Counter(item["mapping_status"] for item in records)
    payload = {
        "schema_version": "1.0-correction",
        "source": "frozen_full_sdk_ground_truth_mapping_audit",
        "policy": {
            "direct_implementation_sources": [
                "DIRECT_CONFIRMED",
                "LEGACY_CONFIRMED",
            ],
            "inferred_is_auxiliary_only": True,
            "ambiguous_conflict_unmatched_are_not_completion_proof": True,
            "many_to_many_candidates_allowed": True,
        },
        "counts": dict(counts),
        "implementation_usable_count": sum(
            item["implementation_usable"] for item in records
        ),
        "records": records,
    }
    CONFIG.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    REPORT.write_text(
        "\n".join(
            [
                "# Ground Truth Corrections",
                "",
                "The mapping quality counts do not improve without new vendor/source "
                "evidence. The correction is representational and prevents weak "
                "mappings from being used as exact completion proof.",
                "",
                "| Status | Before | After | Implementation usable |",
                "|---|---:|---:|:---:|",
                f"| DIRECT_CONFIRMED | 39 | {counts['DIRECT_CONFIRMED']} | yes |",
                f"| LEGACY_CONFIRMED | 24 | {counts['LEGACY_CONFIRMED']} | yes |",
                f"| INFERRED | 28 | {counts['INFERRED']} | auxiliary only |",
                f"| AMBIGUOUS | 28 | {counts['AMBIGUOUS']} | no |",
                f"| CONFLICT | 4 | {counts['CONFLICT']} | no |",
                f"| UNMATCHED | 17 | {counts['UNMATCHED']} | no |",
                "",
                f"Direct implementation-usable mappings: "
                f"**{payload['implementation_usable_count']}/140**.",
                "",
                "Canonical assignment is nullable; candidate lists preserve uncertainty "
                "instead of forcing every historical clip onto a current SDK method.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(payload["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
