"""Apply the audit-driven four-axis status model to capability metadata."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "backend_capabilities.json"
OUTPUT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"
INVENTORY = OUTPUT / "correction_inventory.json"

OLD_IMPLEMENTED_PHYSICAL = {
    "forward",
    "backward",
    "lateral_left",
    "lateral_right",
    "diagonal",
    "turn",
    "stand",
    "stop",
}
OLD_IMPLEMENTED_QUERY = {"get_status", "body_status", "joint_states"}
UNSAFE_EXTERNAL_ONLY = {"frontflip", "sideflip"}
UNSAFE_INSUFFICIENT = {"jump_round", "set_friction"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def derive_legacy(entry: dict[str, Any]) -> str:
    behavior = entry["backend_behavior_status"]
    evidence = entry["evidence_status"]
    contract = entry["sdk_contract_status"]
    if behavior == "PHYSICALLY_IMPLEMENTED":
        return (
            "IMPLEMENTED"
            if contract == "RESOLVED" and evidence == "VERIFIED"
            else "APPROXIMATE"
        )
    if behavior == "SIMULATED":
        return "SIMULATED"
    if behavior == "APPROXIMATE":
        return (
            "BLOCKED_BY_UNRESOLVED_SPEC"
            if evidence in {"INSUFFICIENT", "CONTRADICTED"}
            else "APPROXIMATE"
        )
    if behavior == "NO_MEANINGFUL_MOTION":
        return "APPROXIMATE"
    if behavior == "BLOCKED_BY_MODEL":
        return "BLOCKED_BY_MODEL"
    if behavior == "HARDWARE_ONLY":
        return "HARDWARE_ONLY"
    if behavior == "UNAVAILABLE":
        return (
            "UNAVAILABLE_IN_MUJOCO"
            if entry.get("model_dependency")
            else "BLOCKED_BY_UNRESOLVED_SPEC"
        )
    if behavior == "UNSAFE_PROVEN":
        return "UNSAFE_TO_SIMULATE"
    return "FAILED"


def append_unique(values: list[str], *items: str) -> list[str]:
    return list(dict.fromkeys([*values, *items]))


def main() -> int:
    payload = load_json(CONFIG)
    inventory = load_json(INVENTORY)
    inventory_by_method = {
        item["method"]: item for item in inventory["methods"]
    }
    old_statuses = {entry["method"]: entry["status"] for entry in payload["entries"]}
    for entry in payload["entries"]:
        method = entry["method"]
        old_status = old_statuses[method]
        audit = inventory_by_method[method]
        entry["sdk_contract_status"] = "MULTIPLE_UNRESOLVED"
        entry["ground_truth_status"] = audit["ground_truth_status"]
        if method in OLD_IMPLEMENTED_PHYSICAL:
            entry["backend_behavior_status"] = "PHYSICALLY_IMPLEMENTED"
            entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
            entry["reason"] = (
                "Core MuJoCo behavior is independently verified; return, blocking, "
                "and async SDK contracts remain unresolved"
            )
            entry["limitations"] = append_unique(
                entry.get("limitations", []),
                "legacy_status_is_approximate_due_to_unresolved_sdk_contract",
                "return_blocking_async_contract_unresolved",
            )
        elif method in OLD_IMPLEMENTED_QUERY:
            entry["backend_behavior_status"] = "SIMULATED"
            entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
            entry["reason"] = (
                "Current MuJoCo state query is simulated and verified; official "
                "return schema, blocking, and async contracts remain unresolved"
            )
            entry["limitations"] = append_unique(
                entry.get("limitations", []),
                "simulated_return_not_full_vendor_contract",
                "return_blocking_async_contract_unresolved",
            )
        elif method in UNSAFE_EXTERNAL_ONLY:
            entry["backend_behavior_status"] = "FAILED"
            entry["evidence_status"] = "INSUFFICIENT"
            entry["reason"] = (
                "External Ground Truth indicates risk, but current-model danger was "
                "not reproduced and no safe full behavior implementation exists"
            )
            entry["limitations"] = append_unique(
                entry.get("limitations", []),
                "externally_risky_not_reproduced_in_current_model",
                "failed_to_implement_safely",
            )
            entry["physical_execution"] = False
        elif method in UNSAFE_INSUFFICIENT:
            entry["backend_behavior_status"] = "APPROXIMATE"
            entry["evidence_status"] = "INSUFFICIENT"
            entry["reason"] = (
                "Unsafe claim is unproven in the current model; physical execution "
                "remains blocked by unresolved safe semantics"
            )
            entry["limitations"] = append_unique(
                entry.get("limitations", []),
                "unsafe_claim_not_reproduced",
                "safe_behavior_contract_unresolved",
            )
            entry["physical_execution"] = False
        elif method == "lie_down":
            entry["backend_behavior_status"] = "APPROXIMATE"
            entry["evidence_status"] = "INSUFFICIENT"
            entry["reason"] = (
                "A conservative physical approximation is feasible, but remains "
                "blocked until its profile and end-state evidence are validated"
            )
            entry["limitations"] = append_unique(
                entry.get("limitations", []),
                "physical_behavior_candidate_not_yet_validated",
                "end_state_return_blocking_async_unresolved",
            )
        elif old_status == "APPROXIMATE":
            entry["backend_behavior_status"] = (
                "NO_MEANINGFUL_MOTION"
                if method == "stand_at_ease"
                else "APPROXIMATE"
            )
            entry["evidence_status"] = (
                "INSUFFICIENT"
                if method == "stand_at_ease"
                else "VERIFIED_WITH_LIMITATIONS"
            )
        elif old_status == "SIMULATED":
            entry["backend_behavior_status"] = "SIMULATED"
            entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
        elif old_status == "BLOCKED_BY_MODEL":
            entry["backend_behavior_status"] = "BLOCKED_BY_MODEL"
            entry["evidence_status"] = "VERIFIED"
        elif old_status == "HARDWARE_ONLY":
            entry["backend_behavior_status"] = "HARDWARE_ONLY"
            entry["evidence_status"] = "VERIFIED"
        elif old_status == "UNAVAILABLE_IN_MUJOCO":
            entry["backend_behavior_status"] = "UNAVAILABLE"
            entry["evidence_status"] = "VERIFIED"
        elif old_status == "BLOCKED_BY_UNRESOLVED_SPEC":
            entry["backend_behavior_status"] = "UNAVAILABLE"
            entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
        else:
            raise AssertionError(f"Unhandled status for {method}: {old_status}")
        entry["status"] = derive_legacy(entry)
    payload["schema_version"] = "2.0-four-axis-correction"
    payload["legacy_status_derivation"] = {
        "authority": (
            "backend_behavior_status + sdk_contract_status + evidence_status; "
            "ground_truth_status qualifies semantic confidence"
        ),
        "IMPLEMENTED": (
            "PHYSICALLY_IMPLEMENTED + RESOLVED + VERIFIED only"
        ),
        "APPROXIMATE": (
            "verified physical behavior with unresolved SDK contract, approximate "
            "behavior, or explicitly static/no-meaningful-motion semantics"
        ),
        "SIMULATED": "SIMULATED behavior",
        "non_executable": (
            "derived from BLOCKED_BY_MODEL, HARDWARE_ONLY, UNAVAILABLE, "
            "UNSAFE_PROVEN, FAILED, or insufficient approximate evidence"
        ),
    }
    CONFIG.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    status_counts = Counter(entry["status"] for entry in payload["entries"])
    behavior_counts = Counter(
        entry["backend_behavior_status"] for entry in payload["entries"]
    )
    lines = [
        "# Four-Axis Capability Status Model",
        "",
        "The compatibility `status` field is now derived, not authoritative.",
        "",
        "## Axes",
        "",
        "- `backend_behavior_status`: what the current backend/model actually does.",
        "- `sdk_contract_status`: completeness of return, blocking, async and related contracts.",
        "- `ground_truth_status`: strength of the video/API semantic mapping.",
        "- `evidence_status`: confidence in the combined claim.",
        "",
        "## Legacy derivation",
        "",
        "- `IMPLEMENTED` is emitted only for resolved contract plus verified physical behavior.",
        "- Verified physical behavior with unresolved contracts derives `APPROXIMATE`.",
        "- Simulated queries derive `SIMULATED`.",
        "- Model, hardware, unavailable, unsafe-proven and failed behavior derive explicit non-executable statuses.",
        "",
        f"Legacy distribution after Batch 1: `{dict(status_counts)}`.",
        "",
        f"Behavior distribution after Batch 1: `{dict(behavior_counts)}`.",
    ]
    (OUTPUT / "status_model.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    implemented = [
        entry for entry in payload["entries"]
        if entry["method"] in OLD_IMPLEMENTED_PHYSICAL | OLD_IMPLEMENTED_QUERY
    ]
    implemented_lines = [
        "# Old IMPLEMENTED Reclassification",
        "",
        "No former `IMPLEMENTED` entry remains a strict full-contract implementation.",
        "",
        "| Method | Backend behavior | SDK contract | Evidence | Derived legacy |",
        "|---|---|---|---|---|",
    ]
    for entry in implemented:
        implemented_lines.append(
            f"| `{entry['method']}` | `{entry['backend_behavior_status']}` | "
            f"`{entry['sdk_contract_status']}` | `{entry['evidence_status']}` | "
            f"`{entry['status']}` |"
        )
    (OUTPUT / "implemented_reclassification.md").write_text(
        "\n".join(implemented_lines) + "\n", encoding="utf-8"
    )
    unsafe_lines = [
        "# Unsafe Reassessment",
        "",
        "No method is classified as `UNSAFE_PROVEN` in the current model.",
        "",
        "| Method | Final safety disposition | Evidence | Legacy status |",
        "|---|---|---|---|",
        "| `jump_round` | `INSUFFICIENT_EVIDENCE` | no current-model trial/effect; safe trajectory unresolved | `BLOCKED_BY_UNRESOLVED_SPEC` |",
        "| `frontflip` | `EXTERNALLY_RISKY_NOT_REPRODUCED` / `FAILED_TO_IMPLEMENT_SAFELY` | source video fall/conflict; no current-model reproduction | `FAILED` |",
        "| `sideflip` | `EXTERNALLY_RISKY_NOT_REPRODUCED` / `FAILED_TO_IMPLEMENT_SAFELY` | source video body contact/conflict; no current-model reproduction | `FAILED` |",
        "| `set_friction` | `INSUFFICIENT_EVIDENCE` | runtime model mutation prohibited; no safety trial | `BLOCKED_BY_UNRESOLVED_SPEC` |",
        "",
        "No joint/actuator limit or safety monitor was disabled.",
    ]
    (OUTPUT / "unsafe_reassessment.md").write_text(
        "\n".join(unsafe_lines) + "\n", encoding="utf-8"
    )
    (OUTPUT / "lie_down_correction.md").write_text(
        "\n".join(
            [
                "# lie_down Correction",
                "",
                "Batch 1 separates feasibility from contract completeness.",
                "",
                "- Backend behavior candidate: `APPROXIMATE`.",
                "- Evidence: `INSUFFICIENT` until an independent physical profile run passes.",
                "- SDK contract: `MULTIPLE_UNRESOLVED` including end state, return, blocking and async.",
                "- Compatibility status remains `BLOCKED_BY_UNRESOLVED_SPEC` during Batch 1.",
                "- It will derive `APPROXIMATE` only after the physical behavior is validated.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "legacy_status_counts": dict(status_counts),
                "behavior_status_counts": dict(behavior_counts),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
