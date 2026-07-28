"""Build the correction inventory exclusively from frozen audit findings."""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_audit"
OUTPUT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"

GT_RANK = {
    "CONFLICT": 0,
    "AMBIGUOUS": 1,
    "INFERRED": 2,
    "LEGACY_CONFIRMED": 3,
    "DIRECT_CONFIRMED": 4,
    "NOT_APPLICABLE": 5,
}
GT_NORMALIZE = {
    "DIRECT_EXACT_NAME": "DIRECT_CONFIRMED",
    "DIRECT_DOCUMENTED_LINK": "DIRECT_CONFIRMED",
    "LEGACY_CONFIRMED": "LEGACY_CONFIRMED",
    "SEMANTIC_INFERENCE": "INFERRED",
    "AMBIGUOUS": "AMBIGUOUS",
    "CONFLICT": "CONFLICT",
    "UNMATCHED": "UNMATCHED",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def aggregate_ground_truth() -> tuple[dict[str, str], dict[str, list[dict[str, Any]]]]:
    records = load_json(AUDIT / "ground_truth_mapping_audit.json")["records"]
    by_method: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        method = record.get("canonical_method")
        if method:
            by_method[method].append(record)
    aggregate = {}
    for method, items in by_method.items():
        statuses = [GT_NORMALIZE[item["audit_quality"]] for item in items]
        if "CONFLICT" in statuses:
            aggregate[method] = "CONFLICT"
        elif "DIRECT_CONFIRMED" in statuses:
            aggregate[method] = "DIRECT_CONFIRMED"
        elif "LEGACY_CONFIRMED" in statuses:
            aggregate[method] = "LEGACY_CONFIRMED"
        elif "AMBIGUOUS" in statuses:
            aggregate[method] = "AMBIGUOUS"
        elif "INFERRED" in statuses:
            aggregate[method] = "INFERRED"
        else:
            aggregate[method] = "UNMATCHED"
    return aggregate, by_method


def target_capability(
    method: str,
    current: str,
    physical_verified: bool,
    observable: bool,
) -> str:
    if current == "IMPLEMENTED":
        return "APPROXIMATE"
    if method == "lie_down":
        return "APPROXIMATE"
    if method in {"jump_round", "set_friction"}:
        return "BLOCKED_BY_UNRESOLVED_SPEC"
    if method in {"frontflip", "sideflip"}:
        return "FAILED"
    if current == "APPROXIMATE" and not observable:
        return "APPROXIMATE"
    return current


def main() -> int:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    capability_payload = load_json(ROOT / "config" / "backend_capabilities.json")
    capabilities = {
        entry["method"]: entry for entry in capability_payload["entries"]
    }
    with (AUDIT / "audit_findings.csv").open(encoding="utf-8", newline="") as stream:
        audit_findings = {row["method"]: row for row in csv.DictReader(stream)}
    physical_payload = load_json(AUDIT / "physical_execution_audit.json")
    physical = {item["method"]: item for item in physical_payload["methods"]}
    clusters_payload = load_json(AUDIT / "action_similarity_clusters.json")
    clusters = clusters_payload["duplicate_or_near_duplicate_groups"]
    cluster_by_method: dict[str, str] = {}
    duplicate_with: dict[str, list[str]] = defaultdict(list)
    for index, members in enumerate(clusters, start=1):
        cluster_id = f"cluster_{index:02d}"
        for method in members:
            cluster_by_method[method] = cluster_id
            duplicate_with[method] = [item for item in members if item != method]
    gt_status, gt_records = aggregate_ground_truth()
    cross_rows = list(
        csv.DictReader(
            (AUDIT / "cross_artifact_consistency.csv").open(
                encoding="utf-8", newline=""
            )
        )
    )
    inconsistent = {
        row["method"] for row in cross_rows if int(row["inconsistency_count"]) > 0
    }
    boundary_duplicate = set(clusters_payload["duplicate_or_near_duplicate_members"])
    approximate_problem = {
        method
        for method, entry in capabilities.items()
        if entry["status"] == "APPROXIMATE"
        and (
            method in boundary_duplicate
            or not physical.get(method, {}).get("physical_execution_verified", False)
            or not physical.get(method, {}).get("observable_motion", False)
        )
    }
    if len(approximate_problem) != 52:
        raise AssertionError(
            f"Audit-derived APPROXIMATE correction set is {len(approximate_problem)}, not 52"
        )
    rows = []
    for method, entry in capabilities.items():
        audit = audit_findings[method]
        physics = physical.get(method, {})
        findings = [
            item for item in audit["findings"].split(";") if item
        ]
        correction_types = []
        if entry["status"] == "IMPLEMENTED":
            correction_types.extend(
                [
                    "CAPABILITY_RECLASSIFICATION",
                    "RETURN_CONTRACT_QUALIFICATION",
                    "SCHEDULING_CONTRACT_QUALIFICATION",
                ]
            )
        if method in approximate_problem and method in boundary_duplicate:
            correction_types.append("BEHAVIOR_DIFFERENTIATION")
        if method in {"stand", "stand_at_ease", "stop", "emergency_stop"}:
            correction_types.append("NO_MEANINGFUL_MOTION")
        if gt_status.get(method) in {"INFERRED", "AMBIGUOUS", "CONFLICT", "UNMATCHED"}:
            correction_types.append("GROUND_TRUTH_REMAP")
        if method in inconsistent:
            correction_types.append("CROSS_ARTIFACT_CONSISTENCY")
        if method == "lie_down":
            correction_types.append("BLOCK_REASON_REFINEMENT")
        if entry["status"] == "UNSAFE_TO_SIMULATE":
            correction_types.append("UNSAFE_EVIDENCE_REVIEW")
        correction_required = bool(correction_types or method in approximate_problem)
        if correction_required:
            correction_types.append("TEST_ORACLE_IMPROVEMENT")
        rows.append(
            {
                "method": method,
                "current_capability": entry["status"],
                "audit_status": audit["overall_audit_status"],
                "audit_findings": findings,
                "behavior_cluster": cluster_by_method.get(method),
                "duplicate_with": duplicate_with.get(method, []),
                "ground_truth_status": gt_status.get(method, "NOT_APPLICABLE"),
                "ground_truth_records": [
                    item["video"] for item in gt_records.get(method, [])
                ],
                "physical_execution_verified": bool(
                    physics.get("physical_execution_verified", False)
                ),
                "meaningful_motion_verified": bool(
                    physics.get("observable_motion", False)
                ),
                "correction_required": correction_required,
                "correction_type": list(dict.fromkeys(correction_types)),
                "target_capability": target_capability(
                    method,
                    entry["status"],
                    bool(physics.get("physical_execution_verified", False)),
                    bool(physics.get("observable_motion", False)),
                ),
                "target_behavior": (
                    "retain_with_explicit_limitation"
                    if method in approximate_problem
                    else "preserve_verified_behavior"
                ),
                "acceptance_requirements": [
                    "independent_fixed_oracle",
                    "no_direct_state_injection",
                    "no_generic_fallback",
                    *(
                        ["standing_and_nearest_method_comparison"]
                        if method in boundary_duplicate
                        else []
                    ),
                    *(
                        ["ground_truth_semantic_evidence_or_explicit_limitation"]
                        if gt_status.get(method)
                        in {"INFERRED", "AMBIGUOUS", "CONFLICT", "UNMATCHED"}
                        else []
                    ),
                ],
            }
        )
    payload = {
        "schema_version": "1.0",
        "source": "frozen_full_sdk_independent_audit",
        "method_count": len(rows),
        "methods_requiring_correction": [
            row["method"] for row in rows if row["correction_required"]
        ],
        "approximate_methods_requiring_correction": sorted(approximate_problem),
        "duplicate_behavior_methods": sorted(boundary_duplicate),
        "no_meaningful_motion_methods": sorted(
            method
            for method, item in physical.items()
            if not item["observable_motion"]
        ),
        "misclassified_methods": sorted(
            row["method"]
            for row in rows
            if "MISCLASSIFIED" in row["audit_findings"]
        ),
        "inconsistent_methods": sorted(inconsistent),
        "weak_ground_truth_methods": sorted(
            row["method"]
            for row in rows
            if row["ground_truth_status"]
            in {"INFERRED", "AMBIGUOUS", "CONFLICT", "UNMATCHED"}
        ),
        "methods": rows,
    }
    dump_json(OUTPUT / "correction_inventory.json", payload)
    markdown = [
        "# Full SDK Correction Inventory",
        "",
        "Built dynamically from the frozen independent audit; no old acceptance "
        "report is used as an oracle.",
        "",
        f"- Canonical methods: **{len(rows)}**",
        f"- Methods requiring some correction/qualification: "
        f"**{len(payload['methods_requiring_correction'])}**",
        f"- Audit-defined problem APPROXIMATE methods: "
        f"**{len(approximate_problem)}**",
        f"- Duplicate/near-duplicate members: **{len(boundary_duplicate)}**",
        f"- No-meaningful-motion methods: "
        f"**{len(payload['no_meaningful_motion_methods'])}**",
        f"- Cross-artifact inconsistent methods: **{len(inconsistent)}**",
        "",
        "| Method | Current | Audit | Cluster | GT | Correction types | Target |",
        "|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        if not row["correction_required"]:
            continue
        markdown.append(
            f"| `{row['method']}` | `{row['current_capability']}` | "
            f"`{row['audit_status']}` | `{row['behavior_cluster'] or '—'}` | "
            f"`{row['ground_truth_status']}` | "
            f"{', '.join(row['correction_type'])} | "
            f"`{row['target_capability']}` |"
        )
    (OUTPUT / "correction_inventory.md").write_text(
        "\n".join(markdown) + "\n", encoding="utf-8"
    )
    cluster_directory = OUTPUT / "cluster_corrections"
    for index, members in enumerate(clusters, start=1):
        cluster_id = f"cluster_{index:02d}"
        member_statuses = {
            method: gt_status.get(method, "NOT_APPLICABLE") for method in members
        }
        directly_grounded = [
            method
            for method, status in member_statuses.items()
            if status in {"DIRECT_CONFIRMED", "LEGACY_CONFIRMED"}
        ]
        cluster = {
            "cluster_id": cluster_id,
            "members": members,
            "current_shared_behavior": "audit_normalized_state_fingerprint_cluster",
            "why_clustered": (
                "EXACT_DUPLICATE or NEAR_DUPLICATE under the frozen audit thresholds"
            ),
            "ground_truth_differences": member_statuses,
            "methods_that_should_remain_similar": [
                method
                for method in members
                if member_statuses[method]
                in {"INFERRED", "AMBIGUOUS", "CONFLICT", "NOT_APPLICABLE"}
            ],
            "methods_that_require_differentiation": directly_grounded,
            "planned_changes": {
                method: (
                    "differentiate only from direct/legacy semantic evidence"
                    if method in directly_grounded
                    else "retain shared structure with explicit limitation"
                )
                for method in members
            },
            "post_fix_similarity_targets": {
                "semantic_requirement": (
                    "direct/legacy-distinct semantics must be measurably distinct"
                ),
                "numeric_thresholds_unchanged_from_audit": True,
                "no_forced_uniqueness": True,
            },
        }
        dump_json(cluster_directory / f"{cluster_id}.json", cluster)
        (cluster_directory / f"{cluster_id}.md").write_text(
            "\n".join(
                [
                    f"# {cluster_id}",
                    "",
                    f"Members: {', '.join(f'`{item}`' for item in members)}.",
                    "",
                    f"Direct/legacy grounded members: "
                    f"{', '.join(f'`{item}`' for item in directly_grounded) or 'none'}.",
                    "",
                    "The correction target is semantic fidelity, not artificial "
                    "visual uniqueness. Weak or conflicting mappings retain explicit "
                    "limitations unless independent evidence supports a change.",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
    print(
        json.dumps(
            {
                "method_count": len(rows),
                "methods_requiring_correction": len(
                    payload["methods_requiring_correction"]
                ),
                "approximate_problem_count": len(approximate_problem),
                "cluster_count": len(clusters),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
