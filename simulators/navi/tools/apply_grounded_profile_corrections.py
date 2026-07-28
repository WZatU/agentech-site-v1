"""Differentiate only duplicate profiles backed by direct/legacy routine evidence."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = ROOT / "config" / "action_profiles" / "full_sdk_profiles.json"
CAPABILITY_PATH = ROOT / "config" / "backend_capabilities.json"
OUTPUT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"

JOINT = {
    "fla": "front_left_abad_joint",
    "flh": "front_left_hip_joint",
    "flk": "front_left_knee_joint",
    "fra": "front_right_abad_joint",
    "frh": "front_right_hip_joint",
    "frk": "front_right_knee_joint",
    "hla": "hind_left_abad_joint",
    "hlh": "hind_left_hip_joint",
    "hlk": "hind_left_knee_joint",
    "hra": "hind_right_abad_joint",
    "hrh": "hind_right_hip_joint",
    "hrk": "hind_right_knee_joint",
}


def target(**values: float) -> dict[str, float]:
    return {JOINT[name]: float(value) for name, value in values.items()}


def phases(*items: tuple[str, float, dict[str, float]]) -> list[dict[str, Any]]:
    return [
        {
            "name": name,
            "duration_s": duration,
            "joint_offsets_rad": offsets,
        }
        for name, duration, offsets in items
    ]


PROFILES = {
    "corrected_sway": phases(
        ("lean_left", 0.35, target(fla=0.16, hla=0.16, fra=0.04, hra=0.04)),
        ("lean_right", 0.55, target(fra=-0.16, hra=-0.16, fla=-0.04, hla=-0.04)),
        ("second_left", 0.45, target(fla=0.13, hla=0.13)),
        ("recover", 0.35, {}),
    ),
    "corrected_affection": phases(
        ("gentle_lower", 0.5, target(flh=-0.16, flk=0.25, frh=-0.16, frk=0.25)),
        ("side_nuzzle", 0.55, target(fla=0.12, hla=0.08, flh=-0.12, flk=0.20)),
        ("hold", 0.4, target(fla=0.10, hla=0.06, flh=-0.10, flk=0.17)),
        ("recover", 0.4, {}),
    ),
    "corrected_cute": phases(
        ("shimmy_left", 0.25, target(fla=0.13, hra=-0.10, flh=-0.06, hrh=0.05)),
        ("shimmy_right", 0.25, target(fra=-0.13, hla=0.10, frh=-0.06, hlh=0.05)),
        ("pose", 0.45, target(fla=0.08, fra=-0.08, flk=0.10, frk=0.10)),
        ("recover", 0.35, {}),
    ),
    "corrected_enjoy_touch": phases(
        ("happy_crouch", 0.45, target(hlh=-0.20, hlk=0.38, hrh=-0.20, hrk=0.38)),
        ("happy_sway", 0.35, target(fla=0.10, hla=0.15, fra=-0.04, hra=-0.07)),
        ("delighted_sway", 0.35, target(fra=-0.10, hra=-0.15, fla=0.04, hla=0.07)),
        ("recover", 0.45, {}),
    ),
    "corrected_bark": phases(
        ("preload", 0.25, target(flh=-0.10, flk=0.18, frh=-0.10, frk=0.18)),
        ("bark_pulse_1", 0.22, target(flh=0.09, flk=-0.10, frh=0.09, frk=-0.10)),
        ("reset_1", 0.20, target(flh=-0.05, flk=0.10, frh=-0.05, frk=0.10)),
        ("bark_pulse_2", 0.22, target(flh=0.09, flk=-0.10, frh=0.09, frk=-0.10)),
        ("recover", 0.35, {}),
    ),
    "corrected_bow": phases(
        ("lower_front", 0.55, target(flh=-0.32, flk=0.58, frh=-0.32, frk=0.58)),
        ("bow_hold", 0.55, target(flh=-0.32, flk=0.58, frh=-0.32, frk=0.58)),
        ("recover", 0.5, {}),
    ),
    "corrected_chat": phases(
        ("gesture_left", 0.35, target(flh=-0.18, flk=0.34, fla=0.12)),
        ("gesture_right", 0.35, target(frh=-0.18, frk=0.34, fra=-0.12)),
        ("animated_both", 0.4, target(flh=-0.13, flk=0.26, frh=-0.13, frk=0.26)),
        ("recover", 0.4, {}),
    ),
    "corrected_knock": phases(
        ("lift_left_paw", 0.4, target(flh=-0.32, flk=0.62, fla=0.08)),
        ("tap_forward", 0.22, target(flh=-0.12, flk=0.42, fla=0.08)),
        ("retract", 0.22, target(flh=-0.32, flk=0.62, fla=0.08)),
        ("tap_again", 0.22, target(flh=-0.12, flk=0.42, fla=0.08)),
        ("recover", 0.45, {}),
    ),
    "corrected_point_to_sky": phases(
        ("raise_left", 0.5, target(flh=-0.42, flk=0.78, fla=0.10)),
        ("point_hold", 0.65, target(flh=-0.42, flk=0.78, fla=0.10)),
        ("recover", 0.45, {}),
    ),
    "corrected_wave_hand": phases(
        ("raise_left", 0.4, target(flh=-0.34, flk=0.66)),
        ("wave_out", 0.25, target(flh=-0.34, flk=0.66, fla=0.18)),
        ("wave_in", 0.25, target(flh=-0.34, flk=0.66, fla=-0.08)),
        ("wave_out_2", 0.25, target(flh=-0.34, flk=0.66, fla=0.18)),
        ("recover", 0.45, {}),
    ),
    "corrected_think": phases(
        ("raise_right_paw", 0.45, target(frh=-0.30, frk=0.58, fra=-0.08)),
        ("thoughtful_tilt", 0.55, target(frh=-0.30, frk=0.58, fla=0.08, hla=0.06)),
        ("hold", 0.45, target(frh=-0.27, frk=0.54, fla=0.06)),
        ("recover", 0.45, {}),
    ),
    "corrected_yawn": phases(
        ("lower", 0.35, target(flh=-0.12, flk=0.22, frh=-0.12, frk=0.22)),
        ("full_rise", 0.55, target(flh=0.14, flk=-0.18, frh=0.14, frk=-0.18, hlh=0.08, hrh=0.08)),
        ("long_hold", 0.5, target(flh=0.12, flk=-0.15, frh=0.12, frk=-0.15)),
        ("recover", 0.5, {}),
    ),
    "corrected_clap": phases(
        ("raise_both", 0.4, target(flh=-0.26, flk=0.50, frh=-0.26, frk=0.50)),
        ("clap_in", 0.22, target(fla=-0.16, fra=0.16, flh=-0.25, frh=-0.25, flk=0.48, frk=0.48)),
        ("clap_out", 0.22, target(fla=0.10, fra=-0.10, flh=-0.25, frh=-0.25, flk=0.48, frk=0.48)),
        ("clap_in_2", 0.22, target(fla=-0.16, fra=0.16, flh=-0.25, frh=-0.25, flk=0.48, frk=0.48)),
        ("recover", 0.45, {}),
    ),
    "corrected_eat": phases(
        ("lower_front", 0.45, target(flh=-0.24, flk=0.44, frh=-0.24, frk=0.44)),
        ("bite", 0.25, target(flh=-0.32, flk=0.58, frh=-0.32, frk=0.58)),
        ("lift", 0.25, target(flh=-0.16, flk=0.30, frh=-0.16, frk=0.30)),
        ("swallow_hold", 0.4, target(flh=-0.10, flk=0.18, frh=-0.10, frk=0.18)),
        ("recover", 0.4, {}),
    ),
    "corrected_toss": phases(
        ("collect", 0.35, target(flh=-0.28, flk=0.52, frh=-0.28, frk=0.52)),
        ("toss_up", 0.3, target(flh=0.12, flk=-0.12, frh=0.12, frk=-0.12)),
        ("follow_through", 0.35, target(flh=0.04, flk=-0.06, frh=0.04, frk=-0.06, hlh=-0.10, hrh=-0.10)),
        ("recover", 0.45, {}),
    ),
    "corrected_front_stretch": phases(
        ("extend_front", 0.65, target(flh=-0.38, flk=0.72, frh=-0.38, frk=0.72, hlh=0.10, hrh=0.10)),
        ("stretch_hold", 0.55, target(flh=-0.38, flk=0.72, frh=-0.38, frk=0.72, hlh=0.10, hrh=0.10)),
        ("recover", 0.5, {}),
    ),
    "corrected_confused": phases(
        ("tilt_left", 0.35, target(fla=0.15, hla=0.10, fra=0.04, hra=0.02)),
        ("pause_center", 0.25, {}),
        ("tilt_right", 0.35, target(fra=-0.15, hra=-0.10, fla=-0.04, hla=-0.02)),
        ("second_pause", 0.25, {}),
        ("small_left", 0.3, target(fla=0.10, hla=0.07)),
        ("recover", 0.35, {}),
    ),
    "corrected_dance": phases(
        ("beat_one", 0.28, target(fla=0.14, hra=-0.12, flh=-0.08, hrh=-0.08)),
        ("beat_two", 0.28, target(fra=-0.14, hla=0.12, frh=-0.08, hlh=-0.08)),
        ("beat_three", 0.28, target(fla=-0.10, fra=0.10, hlk=0.16, hrk=0.16)),
        ("beat_four", 0.28, target(fla=0.10, fra=-0.10, flk=0.16, frk=0.16)),
        ("final_pose", 0.4, target(fla=0.12, fra=-0.12, hla=0.08, hra=-0.08)),
        ("recover", 0.4, {}),
    ),
    "corrected_ask_for_play": phases(
        ("play_bow", 0.55, target(flh=-0.34, flk=0.62, frh=-0.34, frk=0.62, hlh=0.10, hrh=0.10)),
        ("rear_wiggle_left", 0.3, target(flh=-0.30, flk=0.56, frh=-0.30, frk=0.56, hla=0.15, hra=-0.04)),
        ("rear_wiggle_right", 0.3, target(flh=-0.30, flk=0.56, frh=-0.30, frk=0.56, hra=-0.15, hla=0.04)),
        ("recover", 0.5, {}),
    ),
    "corrected_brush_teeth": phases(
        ("raise_right", 0.4, target(frh=-0.34, frk=0.64, fra=-0.06)),
        ("brush_left", 0.22, target(frh=-0.20, frk=0.50, fra=0.13)),
        ("brush_right", 0.22, target(frh=-0.20, frk=0.50, fra=-0.13)),
        ("brush_left_2", 0.22, target(frh=-0.20, frk=0.50, fra=0.13)),
        ("recover", 0.45, {}),
    ),
    "corrected_draw_heart": phases(
        ("upper_left", 0.32, target(flh=-0.30, flk=0.58, fla=0.14, frh=-0.18, frk=0.36)),
        ("upper_right", 0.32, target(frh=-0.30, frk=0.58, fra=-0.14, flh=-0.18, flk=0.36)),
        ("lower_center", 0.38, target(flh=-0.25, flk=0.48, frh=-0.25, frk=0.48, fla=-0.08, fra=0.08)),
        ("heart_hold", 0.4, target(flh=-0.22, flk=0.44, frh=-0.22, frk=0.44)),
        ("recover", 0.45, {}),
    ),
    "corrected_look_around": phases(
        ("look_left", 0.45, target(fla=0.12, fra=0.06, hla=-0.08, hra=-0.04, flh=-0.06, hrh=0.05)),
        ("look_right", 0.65, target(fra=-0.12, fla=-0.06, hra=0.08, hla=0.04, frh=-0.06, hlh=0.05)),
        ("look_high", 0.4, target(flh=0.08, flk=-0.10, frh=0.08, frk=-0.10)),
        ("recover", 0.45, {}),
    ),
    "corrected_full_body_stretch": phases(
        ("compress", 0.4, target(flh=-0.15, flk=0.28, frh=-0.15, frk=0.28, hlh=-0.12, hlk=0.22, hrh=-0.12, hrk=0.22)),
        ("extend_all", 0.65, target(flh=0.13, flk=-0.16, frh=0.13, frk=-0.16, hlh=0.11, hlk=-0.14, hrh=0.11, hrk=-0.14)),
        ("stretch_hold", 0.5, target(flh=0.11, flk=-0.14, frh=0.11, frk=-0.14, hlh=0.09, hlk=-0.11, hrh=0.09, hrk=-0.11)),
        ("recover", 0.5, {}),
    ),
    "corrected_wag_rear": phases(
        ("rear_left", 0.22, target(hla=0.20, hra=0.06, hlh=-0.06, hrh=-0.02)),
        ("rear_right", 0.22, target(hra=-0.20, hla=-0.06, hrh=-0.06, hlh=-0.02)),
        ("rear_left_2", 0.22, target(hla=0.20, hra=0.06)),
        ("rear_right_2", 0.22, target(hra=-0.20, hla=-0.06)),
        ("recover", 0.4, {}),
    ),
}

METHOD_PROFILE = {
    "sway": "corrected_sway",
    "show_affection": "corrected_affection",
    "cute": "corrected_cute",
    "enjoy_touch": "corrected_enjoy_touch",
    "bark": "corrected_bark",
    "bow": "corrected_bow",
    "chat": "corrected_chat",
    "knock": "corrected_knock",
    "point_to_sky": "corrected_point_to_sky",
    "wave_hand": "corrected_wave_hand",
    "think": "corrected_think",
    "yawn": "corrected_yawn",
    "clap_hand": "corrected_clap",
    "eat": "corrected_eat",
    "toss": "corrected_toss",
    "front_stretch": "corrected_front_stretch",
    "confused": "corrected_confused",
    "dance": "corrected_dance",
    "ask_for_play": "corrected_ask_for_play",
    "brush_teeth": "corrected_brush_teeth",
    "draw_heart": "corrected_draw_heart",
    "look_around": "corrected_look_around",
    "full_body_stretch": "corrected_full_body_stretch",
    "wag_rear": "corrected_wag_rear",
}


def main() -> int:
    profile_payload = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    profile_payload["profiles"].update(PROFILES)
    profile_payload["method_profiles"].update(METHOD_PROFILE)
    PROFILE_PATH.write_text(
        json.dumps(profile_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    capability_payload = json.loads(CAPABILITY_PATH.read_text(encoding="utf-8"))
    by_method = {
        entry["method"]: entry for entry in capability_payload["entries"]
    }
    for method in METHOD_PROFILE:
        entry = by_method[method]
        entry["limitations"] = list(
            dict.fromkeys(
                [
                    *entry.get("limitations", []),
                    "routine_level_direct_or_legacy_evidence_only",
                    "corrected_profile_is_semantic_approximation_not_motion_capture",
                ]
            )
        )
        entry["evidence_status"] = "VERIFIED_WITH_LIMITATIONS"
    CAPABILITY_PATH.write_text(
        json.dumps(capability_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    report = [
        "# Behavior Differentiation",
        "",
        f"Changed profiles: **{len(METHOD_PROFILE)}**.",
        "",
        "Only methods with `DIRECT_CONFIRMED` or `LEGACY_CONFIRMED` routine-level "
        "evidence inside an audit duplicate cluster were differentiated. Joint "
        "angles remain model-feasible approximations because the source clips are "
        "not calibrated motion capture.",
        "",
        "| Method | New profile | Semantic dimensions |",
        "|---|---|---|",
    ]
    for method, profile in METHOD_PROFILE.items():
        phase_names = ", ".join(item["name"] for item in PROFILES[profile])
        report.append(f"| `{method}` | `{profile}` | {phase_names} |")
    report.extend(
        [
            "",
            "Weak `INFERRED`, `AMBIGUOUS`, `CONFLICT`, or no-video mappings retain "
            "shared structures and explicit limitations. No random offsets, camera "
            "changes, or cosmetic video changes were used.",
        ]
    )
    (OUTPUT / "behavior_differentiation.md").write_text(
        "\n".join(report) + "\n", encoding="utf-8"
    )
    print(json.dumps({"corrected_profiles": len(METHOD_PROFILE)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
