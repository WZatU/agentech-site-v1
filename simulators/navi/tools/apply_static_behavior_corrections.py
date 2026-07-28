"""Apply evidence-scoped static posture corrections without model changes."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROFILES = ROOT / "config" / "action_profiles" / "full_sdk_profiles.json"
CAPABILITIES = ROOT / "config" / "backend_capabilities.json"
OUTPUT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"

JOINTS = (
    "front_left",
    "front_right",
    "hind_left",
    "hind_right",
)


def pose(abad: float, hip: float, knee: float) -> dict[str, float]:
    result = {}
    for leg in JOINTS:
        result[f"{leg}_abad_joint"] = abad
        result[f"{leg}_hip_joint"] = hip
        result[f"{leg}_knee_joint"] = knee
    return result


def derive_legacy(entry: dict[str, object]) -> str:
    behavior = entry["backend_behavior_status"]
    evidence = entry["evidence_status"]
    if behavior == "PHYSICALLY_IMPLEMENTED":
        return "APPROXIMATE"
    if behavior == "APPROXIMATE":
        return (
            "BLOCKED_BY_UNRESOLVED_SPEC"
            if evidence in {"INSUFFICIENT", "CONTRADICTED"}
            else "APPROXIMATE"
        )
    if behavior == "NO_MEANINGFUL_MOTION":
        return "APPROXIMATE"
    return str(entry["status"])


def main() -> int:
    profiles = json.loads(PROFILES.read_text(encoding="utf-8"))
    relaxed = {
        "front_left_abad_joint": 0.14,
        "front_left_hip_joint": -0.08,
        "front_left_knee_joint": 0.12,
        "front_right_abad_joint": -0.14,
        "front_right_hip_joint": -0.08,
        "front_right_knee_joint": 0.12,
        "hind_left_abad_joint": 0.14,
        "hind_left_hip_joint": -0.05,
        "hind_left_knee_joint": 0.08,
        "hind_right_abad_joint": -0.14,
        "hind_right_hip_joint": -0.05,
        "hind_right_knee_joint": 0.08,
    }
    profiles["profiles"]["stand_ease"] = [
        {
            "name": "relax_and_widen",
            "duration_s": 0.6,
            "joint_offsets_rad": relaxed,
        },
        {
            "name": "relaxed_hold",
            "duration_s": 0.8,
            "joint_offsets_rad": relaxed,
        },
        {
            "name": "recover",
            "duration_s": 0.5,
            "joint_offsets_rad": {},
        },
    ]
    attention = pose(0.0, 0.10, -0.16)
    profiles["profiles"]["stand_attention"] = [
        {
            "name": "rise_to_attention",
            "duration_s": 0.55,
            "joint_offsets_rad": attention,
        },
        {
            "name": "attention_hold",
            "duration_s": 0.65,
            "joint_offsets_rad": attention,
        },
        {
            "name": "recover",
            "duration_s": 0.45,
            "joint_offsets_rad": {},
        },
    ]
    lying = pose(0.0, -0.45, 0.85)
    profiles["profiles"]["lie_down_conservative"] = [
        {
            "name": "lower_body",
            "duration_s": 0.9,
            "joint_offsets_rad": lying,
        },
        {
            "name": "low_hold",
            "duration_s": 0.7,
            "joint_offsets_rad": lying,
        },
    ]
    profiles["method_profiles"]["lie_down"] = "lie_down_conservative"
    PROFILES.write_text(
        json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    capability_payload = json.loads(CAPABILITIES.read_text(encoding="utf-8"))
    by_method = {
        entry["method"]: entry for entry in capability_payload["entries"]
    }
    ease = by_method["stand_at_ease"]
    ease["backend_behavior_status"] = "APPROXIMATE"
    ease["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
    ease["ground_truth_status"] = "AMBIGUOUS"
    ease["status"] = derive_legacy(ease)
    ease["reason"] = (
        "Relaxed wide stance has measurable joint-target and posture differences; "
        "Ground Truth remains ambiguous"
    )
    ease["limitations"] = list(
        dict.fromkeys(
            [
                *ease.get("limitations", []),
                "ground_truth_ambiguous",
                "relaxed_stance_is_model_feasible_approximation",
            ]
        )
    )
    attention_entry = by_method["stand_at_attention"]
    attention_entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
    attention_entry["reason"] = (
        "Measurable tall attention posture is physically executable; the legacy "
        "mapping is inferred and exact SDK trajectory remains unresolved"
    )
    attention_entry["limitations"] = list(
        dict.fromkeys(
            [
                *attention_entry.get("limitations", []),
                "ground_truth_inferred_not_direct",
                "attention_pose_is_conservative_approximation",
            ]
        )
    )
    lie = by_method["lie_down"]
    lie["implementation"] = "data_driven_joint_profile"
    lie["physical_execution"] = True
    lie["backend_behavior_status"] = "APPROXIMATE"
    lie["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
    lie["status"] = derive_legacy(lie)
    lie["reason"] = (
        "Conservative low-body joint profile is physically executable; final end "
        "state plus return, blocking and async contracts remain unresolved"
    )
    lie["limitations"] = [
        item
        for item in lie.get("limitations", [])
        if item != "physical_behavior_candidate_not_yet_validated"
    ]
    lie["limitations"] = list(
        dict.fromkeys(
            [
                *lie["limitations"],
                "conservative_model_feasible_approximation",
                "end_state_return_blocking_async_unresolved",
            ]
        )
    )
    CAPABILITIES.write_text(
        json.dumps(capability_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (OUTPUT / "static_semantics.md").write_text(
        "\n".join(
            [
                "# Static and Safety Semantics",
                "",
                "- `stand`: verified as torque-controlled stable hold, not a visual-motion action.",
                "- `stand_at_ease`: wider/lower relaxed joint target; Ground Truth remains ambiguous.",
                "- `stand_at_attention`: measurably taller joint target; legacy Ground Truth remains inferred.",
                "- `stop`: cancels the active action, zeros velocity, then holds standing; no persistent lock.",
                "- `emergency_stop`: cancels action, clears the controller-side pending action state, zeros velocity, enters a persistent software lock, and requires explicit `stand` recovery.",
                "- `emergency_stop` does not claim hardware power interruption.",
                "- `lie_down`: conservative low-body physical approximation; full end-state and SDK contracts remain unresolved.",
                "",
                "No XML, model parameter, joint limit, actuator limit, or direct MuJoCo state was changed.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "stand_at_ease_profile": "stand_ease",
                "lie_down_profile": "lie_down_conservative",
                "lie_down_legacy_status": lie["status"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
