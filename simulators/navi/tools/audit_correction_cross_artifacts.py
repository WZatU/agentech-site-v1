"""Cross-check corrected capability, matrix, results, mapping and video provenance."""

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results" / "full_sdk_correction"
REPORT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"


def main() -> int:
    capability_payload = json.loads(
        (ROOT / "config" / "backend_capabilities.json").read_text(encoding="utf-8")
    )
    capabilities = {
        entry["method"]: entry for entry in capability_payload["entries"]
    }
    with (RESULTS / "sdk_method_matrix.csv").open(
        encoding="utf-8", newline=""
    ) as stream:
        matrix = {
            row["canonical_method"]: row for row in csv.DictReader(stream)
        }
    rows = []
    for method, capability in capabilities.items():
        matrix_row = matrix[method]
        result = json.loads(
            (RESULTS / method / "result.json").read_text(encoding="utf-8")
        )["full_sdk_acceptance"]
        mapping = json.loads(
            (RESULTS / method / "backend_mapping.json").read_text(encoding="utf-8")
        )
        mapping_expected = result["backend_mapping_expected"]
        checks = {
            "matrix_legacy_status_match": (
                matrix_row["backend_status"] == capability["status"]
            ),
            "result_legacy_status_match": (
                result["backend_capability_status"] == capability["status"]
            ),
            "four_axis_match": all(
                [
                    matrix_row["backend_behavior_status"]
                    == capability["backend_behavior_status"],
                    matrix_row["sdk_contract_status"]
                    == capability["sdk_contract_status"],
                    matrix_row["ground_truth_evidence_status"]
                    == capability["ground_truth_status"],
                    matrix_row["evidence_status"]
                    == capability["evidence_status"],
                    result["backend_behavior_status"]
                    == capability["backend_behavior_status"],
                    result["sdk_contract_status"]
                    == capability["sdk_contract_status"],
                    result["ground_truth_evidence_status"]
                    == capability["ground_truth_status"],
                    result["evidence_status"] == capability["evidence_status"],
                ]
            ),
            "execution_stage_match": (
                matrix_row["execution_stage"] == result["execution_stage"]
            ),
            "mapping_expectation_match": (
                bool(mapping) == bool(mapping_expected)
            ),
            "structured_rejection_match": (
                (matrix_row["structured_rejection"].lower() == "true")
                == bool(result["structured_rejection"])
            ),
            "summary_present": (RESULTS / method / "summary.md").exists(),
            "trace_present": (RESULTS / method / "state_trace.csv").exists(),
            "video_provenance_consistent": (
                not capability["physical_execution"]
                or (
                    (RESULTS / method / "video.mp4").exists()
                    and (RESULTS / method / "video_provenance.json").exists()
                )
            ),
        }
        failed = [name for name, passed in checks.items() if not passed]
        rows.append(
            {
                "method": method,
                **checks,
                "inconsistency_count": len(failed),
                "inconsistencies": ";".join(failed),
            }
        )
    output = REPORT / "cross_artifact_corrections.csv"
    with output.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    inconsistent = [row for row in rows if row["inconsistency_count"]]
    baseline_methods = [
        "recovery_stand",
        "set_gait",
        "set_foot_height",
        "set_collision_protect",
        "set_friction",
        "set_jump_distance",
        "set_jump_angle",
    ]
    lines = [
        "# Cross-Artifact Corrections",
        "",
        f"Before: **7/117 inconsistent**. After: **{len(inconsistent)}/117 inconsistent**.",
        "",
        "Parser/scheduler rejection is now an explicit execution stage. Backend mapping "
        "is required only when execution reached the backend, so an empty mapping for "
        "a parser-stage structured rejection is no longer represented as a backend claim.",
        "",
        "| Previously inconsistent method | Corrected execution-stage rule |",
        "|---|---|",
    ]
    for method in baseline_methods:
        result = json.loads(
            (RESULTS / method / "result.json").read_text(encoding="utf-8")
        )["full_sdk_acceptance"]
        lines.append(
            f"| `{method}` | `{result['execution_stage']}`; mapping expected "
            f"`{result['backend_mapping_expected']}`; structured rejection "
            f"`{result['structured_rejection']}` |"
        )
    if inconsistent:
        lines.extend(
            ["", "Remaining:", *[
                f"- `{row['method']}`: {row['inconsistencies']}"
                for row in inconsistent
            ]]
        )
    (REPORT / "cross_artifact_corrections.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    print(json.dumps({"consistent": len(rows) - len(inconsistent), "inconsistent": len(inconsistent)}, indent=2))
    return 0 if not inconsistent else 1


if __name__ == "__main__":
    raise SystemExit(main())
