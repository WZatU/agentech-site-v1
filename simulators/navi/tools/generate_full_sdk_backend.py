"""Generate the complete SDK inventory, video map, capabilities, and profiles.

The SDK registry is the source of method scope.  Policy sets below only decide
how an already-discovered canonical method is handled; assertions make any new
or omitted registry method fail generation.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "config" / "sdk_spec.json"
GROUND_TRUTH_PATH = ROOT / "config" / "action_ground_truth.json"
CAPABILITY_PATH = ROOT / "config" / "backend_capabilities.json"
PROFILE_DIR = ROOT / "config" / "action_profiles"
PROFILE_PATH = PROFILE_DIR / "full_sdk_profiles.json"
REPORT_DIR = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_backend"

PREVIOUSLY_IMPLEMENTED = {
    "stand",
    "stop",
    "forward",
    "backward",
    "lateral_left",
    "lateral_right",
    "turn",
    "get_status",
    "get_battery_status",
    "body_status",
    "joint_states",
    "diagnose",
}

HEAD_MODEL_BLOCKED = {
    "nod_head",
    "shake_head",
    "rub_eyes",
    "nod_with_beats",
    "head_up_down",
    "sniff_left",
    "sniff_right",
    "sniff_ahead",
    "sniff_up",
    "look_down",
    "nod_off",
    "listen",
    "dramatic_listen",
}
ENVIRONMENT_MODEL_BLOCKED = {
    "return_to_home",
    "observe",
    "explore_road",
    "search_environment",
    "search_tag",
    "body_tag_search",
    "explore_new_home",
}
SPEC_BLOCKED = {
    "lie_down",
    "recovery_stand",
    "set_gait",
    "set_foot_height",
    "set_collision_protect",
    "set_jump_distance",
    "set_jump_angle",
    "duck_walk",
}
UNSAFE = {"jump_round", "frontflip", "sideflip", "set_friction"}
UNAVAILABLE = {"swim"}
LOCOMOTION_COMPOSITIONS = {"fast_rotate", "joy_walk", "step"}

DIRECT_IMPLEMENTED = {
    "stand",
    "stop",
    "forward",
    "backward",
    "lateral_left",
    "lateral_right",
    "diagonal",
    "turn",
    "get_status",
    "body_status",
    "joint_states",
}
SIMULATED = {"emergency_stop", "diagnose"}
HARDWARE_ONLY = {"get_battery_status"}

AMBIGUOUS_LEGACY_CANDIDATES = {
    "lucky_cat_1": "lucky_cat",
    "lucky_cat_2": "lucky_cat",
    "lucky_cat_3": "lucky_cat",
    "look_around_2": "look_around",
    "look_around_3": "look_around",
    "look_around_5": "look_around",
    "look_around_6": "look_around",
    "look_around_7": "look_around",
    "thinking__1": "think",
    "thinking__2": "think",
    "chatting": "chat",
    "chatting__1": "chat",
    "chatting__2": "chat",
    "cute_2": "cute",
    "excited": "excited",
    "excited_2": "excited",
    "coquetry_1": "act_shy",
    "coquetry_2": "act_shy",
    "snuggle_x": "snuggle",
    "snuggle_y": "snuggle",
    "sniff_ahead_3": "sniff_ahead",
    "front_strech_without_modelscale": "front_stretch",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def method_status(method: str, category: str) -> str:
    if method in DIRECT_IMPLEMENTED:
        return "IMPLEMENTED"
    if method in SIMULATED:
        return "SIMULATED"
    if method in HARDWARE_ONLY:
        return "HARDWARE_ONLY"
    if method in UNSAFE:
        return "UNSAFE_TO_SIMULATE"
    if method in UNAVAILABLE:
        return "UNAVAILABLE_IN_MUJOCO"
    if method in SPEC_BLOCKED:
        return "BLOCKED_BY_UNRESOLVED_SPEC"
    if method in HEAD_MODEL_BLOCKED or method in ENVIRONMENT_MODEL_BLOCKED:
        return "BLOCKED_BY_MODEL"
    if category in {"actions", "posture", "athletics"}:
        return "APPROXIMATE"
    raise AssertionError(f"No capability policy for {method!r} ({category})")


def capability_reason(method: str, category: str, status: str) -> tuple[str, str]:
    if status == "IMPLEMENTED":
        if method == "diagonal":
            return (
                "Existing body-frame locomotion controller can express the vector components",
                "body_velocity_composition",
            )
        if category == "sensing":
            return ("Value is read from real MuJoCo/controller state", "mujoco_query")
        return ("Core semantics execute through the existing controller", "existing_controller")
    if status == "SIMULATED":
        if method == "emergency_stop":
            return (
                "Software zero-velocity and joint-PD holding is simulatable but is not a physical E-stop",
                "zero_velocity_and_joint_pd_hold",
            )
        return (
            "Diagnostic response combines real simulation state with explicit hardware gaps",
            "simulation_diagnostic",
        )
    if status == "APPROXIMATE":
        if method in LOCOMOTION_COMPOSITIONS:
            return (
                "A conservative composition of existing body-frame locomotion is physically executable",
                "locomotion_composition",
            )
        if category == "athletics":
            return (
                "A torque-controlled feasibility trajectory is available; exact real-robot dynamics are unresolved",
                "athletic_joint_profile",
            )
        return (
            "A distinct torque-controlled joint profile is physically executable but exact SDK trajectory/timing is unresolved",
            "data_driven_joint_profile",
        )
    if status == "HARDWARE_ONLY":
        return (
            "The model contains no physical battery, supply, charger, or temperature hardware state",
            "structured_unavailable_result",
        )
    if status == "UNAVAILABLE_IN_MUJOCO":
        return (
            "The main scene has no fluid medium or corresponding MuJoCo mechanism",
            "structured_unavailable_result",
        )
    if status == "BLOCKED_BY_MODEL":
        if method == "return_to_home":
            return (
                "Requires dual-camera localization and an immutable saved home coordinate/heading",
                "structured_model_block",
            )
        if method in HEAD_MODEL_BLOCKED:
            return (
                "Robot model has no independent head, neck, ear, nose, or gaze actuator",
                "structured_model_block",
            )
        return (
            "Requires camera perception, external targets, mapping, or planning absent from the model/backend",
            "structured_model_block",
        )
    if status == "BLOCKED_BY_UNRESOLVED_SPEC":
        return (
            "Core target, end state, configuration mapping, or under-development contract is unresolved",
            "structured_spec_block",
        )
    if status == "UNSAFE_TO_SIMULATE":
        if method == "set_friction":
            return (
                "Runtime physical friction mutation is prohibited and the method is under development",
                "structured_safety_rejection",
            )
        return (
            "High-dynamic airborne/flip semantics lack a safe verified trajectory; supplied evidence is conflicting or insufficient",
            "structured_safety_rejection",
        )
    raise AssertionError(status)


def batch_for(status: str, category: str) -> str:
    if status in {
        "HARDWARE_ONLY",
        "UNAVAILABLE_IN_MUJOCO",
        "BLOCKED_BY_MODEL",
        "BLOCKED_BY_UNRESOLVED_SPEC",
    }:
        return "E"
    if category == "athletics" or status == "UNSAFE_TO_SIMULATE":
        return "D"
    if category == "movement":
        return "C"
    if category == "actions":
        return "B"
    return "A"


def build_video_mapping(
    methods: dict[str, Any], ground_truth: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    refs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    all_videos: list[dict[str, Any]] = []

    for item in ground_truth["movements"]:
        ref = {
            "video": item["video"],
            "status": "MULTIPLE_MATCHES" if item["method"] == "diagonal" else "DIRECT_MATCH",
            "source": "current_sdk_call",
            "confidence": item.get("confidence"),
        }
        refs[item["method"]].append(ref)
        all_videos.append({"canonical_method": item["method"], **ref})

    for item in ground_truth["athletics"]:
        status = "CONFLICT" if item["method"] in {"frontflip", "sideflip"} else (
            "MULTIPLE_MATCHES" if item["method"] == "sideflip" else "DIRECT_MATCH"
        )
        ref = {
            "video": item["video"],
            "status": status,
            "source": "current_sdk_call",
            "confidence": item.get("confidence"),
        }
        refs[item["method"]].append(ref)
        all_videos.append({"canonical_method": item["method"], **ref})

    for item in ground_truth["actions_current_style"]:
        number = int(item["number"])
        slug = item["file_slug"]
        path = f"videos/actions/{number:02d}_{slug}.mp4"
        status = "CONFLICT" if item["method"] == "push_up" else (
            "MULTIPLE_MATCHES" if item["method"] == "dance" else "DIRECT_MATCH"
        )
        ref = {
            "video": path,
            "status": status,
            "source": "current_sdk_call",
            "confidence": "high",
        }
        refs[item["method"]].append(ref)
        all_videos.append({"canonical_method": item["method"], **ref})

    tokens = ground_truth["legacy_action_sequence"]["tokens_in_exact_video_order"]
    confirmed = ground_truth["confirmed_legacy_mappings"]
    for offset, token in enumerate(tokens, start=32):
        path = f"videos/actions/{offset}_{token}.mp4"
        canonical = None
        status = "NO_CURRENT_CANONICAL_METHOD"
        if token in methods:
            canonical = token
            status = "LEGACY_REFERENCE"
        elif token in confirmed:
            canonical = confirmed[token]["method"]
            status = "LEGACY_REFERENCE"
        elif token in AMBIGUOUS_LEGACY_CANDIDATES:
            canonical = AMBIGUOUS_LEGACY_CANDIDATES[token]
            status = "AMBIGUOUS"
        ref = {
            "video": path,
            "status": status,
            "source": "legacy_do_action_or_behavior",
            "legacy_token": token,
            "confidence": "high" if status == "LEGACY_REFERENCE" else "unresolved",
        }
        if canonical is not None:
            refs[canonical].append(ref)
        all_videos.append({"canonical_method": canonical, **ref})

    if len(all_videos) != 140:
        raise AssertionError(f"Expected 140 videos, got {len(all_videos)}")

    method_mappings = []
    for method in methods:
        method_refs = refs.get(method, [])
        statuses = {item["status"] for item in method_refs}
        if not method_refs:
            aggregate = "NO_VIDEO"
        elif "CONFLICT" in statuses:
            aggregate = "CONFLICT"
        elif "AMBIGUOUS" in statuses:
            aggregate = "AMBIGUOUS"
        elif len(method_refs) > 1:
            aggregate = "MULTIPLE_MATCHES"
        elif "LEGACY_REFERENCE" in statuses:
            aggregate = "LEGACY_REFERENCE"
        else:
            aggregate = "DIRECT_MATCH"
        method_mappings.append({
            "canonical_method": method,
            "video_status": aggregate,
            "video_count": len(method_refs),
            "videos": method_refs,
        })
    return (
        {
            "source_video_count": len(all_videos),
            "canonical_method_count": len(methods),
            "method_mappings": method_mappings,
            "all_videos": all_videos,
            "unmapped_video_count": sum(
                item["canonical_method"] is None for item in all_videos
            ),
        },
        refs,
    )


def phases(*items: tuple[str, float, dict[str, float]]) -> list[dict[str, Any]]:
    return [
        {"name": name, "duration_s": duration, "joint_offsets_rad": offsets}
        for name, duration, offsets in items
    ]


def build_profiles(
    methods: dict[str, Any], capabilities: list[dict[str, Any]]
) -> dict[str, Any]:
    fl = "front_left"
    fr = "front_right"
    hl = "hind_left"
    hr = "hind_right"

    def leg(prefix: str, abad=0.0, hip=0.0, knee=0.0) -> dict[str, float]:
        return {
            f"{prefix}_abad_joint": abad,
            f"{prefix}_hip_joint": hip,
            f"{prefix}_knee_joint": knee,
        }

    def merge(*parts: dict[str, float]) -> dict[str, float]:
        result: dict[str, float] = {}
        for part in parts:
            result.update(part)
        return result

    recover = ("recover", 0.50, {})
    profiles = {
        "sway_lateral": phases(
            ("left", 0.35, merge(leg(fl, 0.12), leg(hl, 0.12), leg(fr, 0.04), leg(hr, 0.04))),
            ("right", 0.70, merge(leg(fr, -0.12), leg(hr, -0.12), leg(fl, -0.04), leg(hl, -0.04))),
            ("center", 0.35, {}),
            recover,
        ),
        "sway_pitch": phases(
            ("forward", 0.35, merge(leg(fl, hip=-0.14, knee=0.18), leg(fr, hip=-0.14, knee=0.18), leg(hl, hip=0.08, knee=-0.10), leg(hr, hip=0.08, knee=-0.10))),
            ("back", 0.70, merge(leg(fl, hip=0.08, knee=-0.10), leg(fr, hip=0.08, knee=-0.10), leg(hl, hip=-0.14, knee=0.18), leg(hr, hip=-0.14, knee=0.18))),
            ("center", 0.35, {}),
            recover,
        ),
        "front_paw_left": phases(
            ("lift", 0.40, leg(fl, abad=0.10, hip=-0.30, knee=0.65)),
            ("gesture", 0.50, leg(fl, abad=-0.10, hip=-0.22, knee=0.55)),
            ("lower", 0.35, {}),
            recover,
        ),
        "front_paw_right": phases(
            ("lift", 0.40, leg(fr, abad=-0.10, hip=-0.30, knee=0.65)),
            ("gesture", 0.50, leg(fr, abad=0.10, hip=-0.22, knee=0.55)),
            ("lower", 0.35, {}),
            recover,
        ),
        "front_paws_alternate": phases(
            ("left", 0.35, leg(fl, abad=0.08, hip=-0.26, knee=0.58)),
            ("right", 0.55, leg(fr, abad=-0.08, hip=-0.26, knee=0.58)),
            ("left_again", 0.55, leg(fl, abad=0.08, hip=-0.26, knee=0.58)),
            ("center", 0.35, {}),
            recover,
        ),
        "hind_leg_right": phases(
            ("support_shift", 0.35, merge(leg(fl, abad=0.08), leg(hl, abad=0.08))),
            ("lift_hind", 0.55, merge(leg(hr, abad=-0.22, hip=-0.28, knee=0.62), leg(fl, abad=0.08), leg(hl, abad=0.08))),
            ("lower", 0.40, {}),
            recover,
        ),
        "rear_wiggle": phases(
            ("rear_left", 0.30, merge(leg(hl, abad=0.14), leg(hr, abad=0.14))),
            ("rear_right", 0.50, merge(leg(hl, abad=-0.14), leg(hr, abad=-0.14))),
            ("rear_left_2", 0.50, merge(leg(hl, abad=0.14), leg(hr, abad=0.14))),
            ("center", 0.30, {}),
            recover,
        ),
        "bow": phases(
            ("lower_front", 0.55, merge(leg(fl, hip=-0.28, knee=0.58), leg(fr, hip=-0.28, knee=0.58), leg(hl, hip=0.08, knee=-0.12), leg(hr, hip=0.08, knee=-0.12))),
            ("hold", 0.45, merge(leg(fl, hip=-0.28, knee=0.58), leg(fr, hip=-0.28, knee=0.58), leg(hl, hip=0.08, knee=-0.12), leg(hr, hip=0.08, knee=-0.12))),
            recover,
        ),
        "front_stretch": phases(
            ("stretch", 0.65, merge(leg(fl, hip=-0.34, knee=0.62), leg(fr, hip=-0.34, knee=0.62), leg(hl, hip=0.12, knee=-0.15), leg(hr, hip=0.12, knee=-0.15))),
            ("hold", 0.40, merge(leg(fl, hip=-0.34, knee=0.62), leg(fr, hip=-0.34, knee=0.62))),
            recover,
        ),
        "rear_stretch": phases(
            ("stretch", 0.65, merge(leg(hl, hip=-0.30, knee=0.58), leg(hr, hip=-0.30, knee=0.58), leg(fl, hip=0.10, knee=-0.12), leg(fr, hip=0.10, knee=-0.12))),
            ("hold", 0.40, merge(leg(hl, hip=-0.30, knee=0.58), leg(hr, hip=-0.30, knee=0.58))),
            recover,
        ),
        "full_stretch": phases(
            ("compress", 0.45, merge(*(leg(prefix, hip=-0.18, knee=0.32) for prefix in (fl, fr, hl, hr)))),
            ("extend", 0.55, merge(*(leg(prefix, hip=0.12, knee=-0.20) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "push_up": phases(
            ("down", 0.35, merge(leg(fl, hip=-0.32, knee=0.62), leg(fr, hip=-0.32, knee=0.62))),
            ("up", 0.45, merge(leg(fl, hip=0.05, knee=-0.08), leg(fr, hip=0.05, knee=-0.08))),
            ("down_2", 0.45, merge(leg(fl, hip=-0.32, knee=0.62), leg(fr, hip=-0.32, knee=0.62))),
            ("up_2", 0.45, {}),
            recover,
        ),
        "whole_body_shake": phases(
            ("twist_left", 0.25, merge(leg(fl, abad=0.10), leg(fr, abad=0.10), leg(hl, abad=-0.10), leg(hr, abad=-0.10))),
            ("twist_right", 0.35, merge(leg(fl, abad=-0.10), leg(fr, abad=-0.10), leg(hl, abad=0.10), leg(hr, abad=0.10))),
            ("twist_left_2", 0.35, merge(leg(fl, abad=0.10), leg(fr, abad=0.10), leg(hl, abad=-0.10), leg(hr, abad=-0.10))),
            ("center", 0.25, {}),
            recover,
        ),
        "dance": phases(
            ("diagonal_a", 0.30, merge(leg(fl, hip=-0.20, knee=0.35), leg(hr, hip=-0.20, knee=0.35))),
            ("diagonal_b", 0.40, merge(leg(fr, hip=-0.20, knee=0.35), leg(hl, hip=-0.20, knee=0.35))),
            ("wide", 0.40, merge(leg(fl, abad=0.12), leg(hl, abad=0.12), leg(fr, abad=-0.12), leg(hr, abad=-0.12))),
            ("center", 0.30, {}),
            recover,
        ),
        "crouch": phases(
            ("lower", 0.60, merge(*(leg(prefix, hip=-0.25, knee=0.50) for prefix in (fl, fr, hl, hr)))),
            ("hold", 0.50, merge(*(leg(prefix, hip=-0.25, knee=0.50) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "sit": phases(
            ("sit", 0.75, merge(leg(fl, hip=0.05, knee=-0.10), leg(fr, hip=0.05, knee=-0.10), leg(hl, hip=-0.42, knee=0.78), leg(hr, hip=-0.42, knee=0.78))),
            ("hold", 0.50, merge(leg(hl, hip=-0.42, knee=0.78), leg(hr, hip=-0.42, knee=0.78))),
            recover,
        ),
        "lie_elbows": phases(
            ("lower_front", 0.75, merge(leg(fl, hip=-0.35, knee=0.72), leg(fr, hip=-0.35, knee=0.72), leg(hl, hip=-0.08, knee=0.18), leg(hr, hip=-0.08, knee=0.18))),
            ("hold", 0.45, merge(leg(fl, hip=-0.35, knee=0.72), leg(fr, hip=-0.35, knee=0.72))),
            recover,
        ),
        "prostrate": phases(
            ("lower_all", 0.80, merge(*(leg(prefix, hip=-0.38, knee=0.76) for prefix in (fl, fr, hl, hr)))),
            ("hold", 0.45, merge(*(leg(prefix, hip=-0.38, knee=0.76) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "sphinx": phases(
            ("pose", 0.75, merge(leg(fl, hip=-0.38, knee=0.76), leg(fr, hip=-0.38, knee=0.76), leg(hl, hip=0.08, knee=-0.12), leg(hr, hip=0.08, knee=-0.12))),
            ("hold", 0.45, merge(leg(fl, hip=-0.38, knee=0.76), leg(fr, hip=-0.38, knee=0.76))),
            recover,
        ),
        "sphinx_left": phases(
            ("pose", 0.75, merge(leg(fl, abad=0.12, hip=-0.38, knee=0.76), leg(fr, abad=0.04, hip=-0.38, knee=0.76), leg(hl, abad=0.12), leg(hr, abad=0.04))),
            ("hold", 0.45, merge(leg(fl, abad=0.12, hip=-0.38, knee=0.76), leg(fr, abad=0.04, hip=-0.38, knee=0.76))),
            recover,
        ),
        "sphinx_right": phases(
            ("pose", 0.75, merge(leg(fl, abad=-0.04, hip=-0.38, knee=0.76), leg(fr, abad=-0.12, hip=-0.38, knee=0.76), leg(hl, abad=-0.04), leg(hr, abad=-0.12))),
            ("hold", 0.45, merge(leg(fl, abad=-0.04, hip=-0.38, knee=0.76), leg(fr, abad=-0.12, hip=-0.38, knee=0.76))),
            recover,
        ),
        "stand_high": phases(
            ("raise", 0.55, merge(*(leg(prefix, hip=0.16, knee=-0.28) for prefix in (fl, fr, hl, hr)))),
            ("hold", 0.40, merge(*(leg(prefix, hip=0.16, knee=-0.28) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "stand_ease": phases(
            ("wide", 0.45, merge(leg(fl, abad=0.08), leg(hl, abad=0.08), leg(fr, abad=-0.08), leg(hr, abad=-0.08))),
            ("hold", 0.45, merge(leg(fl, abad=0.08), leg(hl, abad=0.08), leg(fr, abad=-0.08), leg(hr, abad=-0.08))),
            recover,
        ),
        "stand_attention": phases(
            ("attention", 0.45, merge(*(leg(prefix, hip=0.05, knee=-0.08) for prefix in (fl, fr, hl, hr)))),
            ("hold", 0.45, merge(*(leg(prefix, hip=0.05, knee=-0.08) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "rest": phases(
            ("lower", 0.70, merge(*(leg(prefix, hip=-0.30, knee=0.58) for prefix in (fl, fr, hl, hr)))),
            ("rest", 0.60, merge(*(leg(prefix, hip=-0.30, knee=0.58) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "playful": phases(
            ("front_down", 0.45, merge(leg(fl, hip=-0.28, knee=0.55), leg(fr, hip=-0.28, knee=0.55), leg(hl, hip=0.10, knee=-0.12), leg(hr, hip=0.10, knee=-0.12))),
            ("paw", 0.45, leg(fl, abad=0.10, hip=-0.32, knee=0.62)),
            recover,
        ),
        "torso_twist": phases(
            ("left", 0.35, merge(leg(fl, abad=0.10), leg(fr, abad=0.10), leg(hl, abad=-0.10), leg(hr, abad=-0.10))),
            ("right", 0.50, merge(leg(fl, abad=-0.10), leg(fr, abad=-0.10), leg(hl, abad=0.10), leg(hr, abad=0.10))),
            ("center", 0.35, {}),
            recover,
        ),
        "jump_vertical": phases(
            ("preload", 0.45, merge(*(leg(prefix, hip=-0.35, knee=0.72) for prefix in (fl, fr, hl, hr)))),
            ("launch", 0.16, merge(*(leg(prefix, hip=0.28, knee=-0.52) for prefix in (fl, fr, hl, hr)))),
            ("landing", 0.35, merge(*(leg(prefix, hip=-0.16, knee=0.30) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "jump_forward": phases(
            ("preload", 0.45, merge(*(leg(prefix, hip=-0.35, knee=0.72) for prefix in (fl, fr, hl, hr)))),
            ("launch", 0.18, merge(leg(fl, hip=0.25, knee=-0.50), leg(fr, hip=0.25, knee=-0.50), leg(hl, hip=0.65, knee=-1.00), leg(hr, hip=0.65, knee=-1.00))),
            ("landing", 0.40, merge(*(leg(prefix, hip=-0.18, knee=0.34) for prefix in (fl, fr, hl, hr)))),
            recover,
        ),
        "kick": phases(
            ("load", 0.40, merge(leg(fl, abad=0.08, hip=-0.25, knee=0.58), leg(fr, abad=-0.05))),
            ("extend", 0.22, leg(fl, abad=0.05, hip=0.18, knee=-0.48)),
            ("retract", 0.30, leg(fl, abad=0.08, hip=-0.28, knee=0.62)),
            recover,
        ),
    }

    profile_groups = {
        "sway_lateral": {"sway", "show_affection", "enjoy_touch", "cute", "act_shy", "snuggle"},
        "sway_pitch": {"sway_front_back", "think", "yawn", "be_sleepy"},
        "front_paw_left": {"shake_hand", "wave_hand", "knock", "point_to_sky", "wait_for_praise", "lucky_cat", "good_night_wave"},
        "front_paw_right": {"shake_hand_quick", "brush_teeth"},
        "front_paws_alternate": {"clap_hand", "cooking", "eat", "toss"},
        "hind_leg_right": {"pee", "pee_quick", "toilet_pose"},
        "rear_wiggle": {"hip_shake", "wag_rear", "rear_puff"},
        "bow": {"bow", "bark", "chat", "cry", "encourage", "playful_greeting"},
        "front_stretch": {"front_stretch", "push_ahead", "brace"},
        "rear_stretch": {"rear_stretch"},
        "full_stretch": {"full_body_stretch", "flex_muscles"},
        "push_up": {"push_up"},
        "whole_body_shake": {"confused", "shake_self", "excited"},
        "dance": {"dance", "jingle", "step_idle"},
        "playful": {"ask_for_play", "eager"},
        "torso_twist": {"look_around", "draw_heart"},
        "rest": {"bored_half_sit", "rest"},
        "crouch": {"squat"},
        "sit": {"sit"},
        "lie_elbows": {"lie_on_elbows"},
        "prostrate": {"prostrate"},
        "sphinx": {"sphinx_lie"},
        "sphinx_left": {"sphinx_left_lie"},
        "sphinx_right": {"sphinx_right_lie"},
        "stand_high": {"stand_high"},
        "stand_ease": {"stand_at_ease"},
        "stand_attention": {"stand_at_attention"},
        "jump_vertical": {"jump"},
        "jump_forward": {"jump_forward"},
        "kick": {"kick"},
    }
    method_profiles: dict[str, str] = {}
    for profile, names in profile_groups.items():
        for name in names:
            if name in method_profiles:
                raise AssertionError(f"Duplicate profile mapping for {name}")
            method_profiles[name] = profile

    approximate = {
        item["method"]
        for item in capabilities
        if item["status"] == "APPROXIMATE"
    }
    expected_profile = approximate - LOCOMOTION_COMPOSITIONS
    missing = expected_profile - set(method_profiles)
    extra = set(method_profiles) - expected_profile
    if missing or extra:
        raise AssertionError(
            f"Action profile coverage mismatch: missing={sorted(missing)}, extra={sorted(extra)}"
        )
    return {
        "schema_version": "1.0",
        "joint_target_semantics": "offset_from_existing_STANDING_JOINT_TARGETS_rad",
        "control": "existing_StandingPDController_through_12_torque_actuators",
        "profiles": profiles,
        "method_profiles": method_profiles,
        "locomotion_compositions": sorted(LOCOMOTION_COMPOSITIONS),
    }


def main() -> None:
    spec = read_json(SPEC_PATH)
    ground_truth = read_json(GROUND_TRUTH_PATH)
    methods: dict[str, Any] = spec["methods"]
    if len(methods) != 117:
        raise AssertionError(f"Expected 117 canonical methods, got {len(methods)}")
    if len(PREVIOUSLY_IMPLEMENTED & set(methods)) != 12:
        raise AssertionError("Previously implemented set is not 12 canonical methods")
    remaining = set(methods) - PREVIOUSLY_IMPLEMENTED
    if len(remaining) != 105:
        raise AssertionError(f"Expected 105 remaining methods, got {len(remaining)}")

    video_mapping, video_refs = build_video_mapping(methods, ground_truth)
    method_video = {
        item["canonical_method"]: item
        for item in video_mapping["method_mappings"]
    }

    capabilities = []
    for method, definition in methods.items():
        category = definition["category"]
        status = method_status(method, category)
        reason, implementation = capability_reason(method, category, status)
        hardware: list[str] = []
        model_dependency: list[str] = []
        scenario_required = False
        if status == "HARDWARE_ONLY":
            hardware = ["battery", "supply", "charger", "temperature"]
        if method in HEAD_MODEL_BLOCKED:
            model_dependency = ["independent_head_or_neck_joint", "actuator"]
        if method in ENVIRONMENT_MODEL_BLOCKED:
            model_dependency = ["camera_or_external_input", "localization_or_planner"]
            scenario_required = True
        if method == "return_to_home":
            model_dependency = ["dual_camera", "saved_home_pose", "localization"]
        if method == "swim":
            model_dependency = ["fluid_environment"]
            scenario_required = True
        limitations = []
        if status == "APPROXIMATE":
            limitations.extend([
                "exact_joint_trajectory_and_timing_not_in_sdk_spec",
                "blocking_and_return_contract_unresolved",
            ])
            if method_video[method]["video_status"] == "NO_VIDEO":
                limitations.append("APPROXIMATE_NO_VIDEO")
        if status == "SIMULATED":
            limitations.append("partial_hardware_equivalence")
        if status in {"BLOCKED_BY_MODEL", "UNAVAILABLE_IN_MUJOCO"}:
            limitations.append("no_fake_substitute")
        if method == "frontflip":
            limitations.append("sdk_stable_landing_conflicts_with_real_video_fall")
        capabilities.append({
            "method": method,
            "category": category,
            "status": status,
            "reason": reason,
            "implementation": implementation,
            "ground_truth": [
                item["video"] for item in video_refs.get(method, [])
            ],
            "video_status": method_video[method]["video_status"],
            "limitations": limitations,
            "test_ids": [
                f"inventory::{method}",
                f"dispatch::{method}",
                f"contract::{method}",
            ],
            "batch": batch_for(status, category),
            "physical_execution": (
                status in {"IMPLEMENTED", "APPROXIMATE"}
                and category not in {"sensing"}
            )
            or method == "emergency_stop",
            "scenario_required": scenario_required,
            "hardware_dependency": hardware,
            "model_dependency": model_dependency,
            "allowed_start_states": ["STANDING"],
            "preparation_state": "STANDING",
            "active_state": (
                "ATHLETIC_RUNNING" if category == "athletics"
                else "ACTION_RUNNING" if category == "actions"
                else "POSTURE_HOLD" if category == "posture"
                else "LOCOMOTING" if category == "movement"
                else "STANDING"
            ),
            "expected_end_state": definition.get("end_state", "UNRESOLVED"),
            "recovery_state": "STANDING",
            "interruptibility": "stop_and_emergency_stop",
            "timeout": "profile_or_global_limit",
        })
    if len(capabilities) != 117 or len({x["method"] for x in capabilities}) != 117:
        raise AssertionError("Capability matrix must contain 117 unique methods")
    write_json(
        CAPABILITY_PATH,
        {
            "schema_version": "1.0",
            "canonical_method_count": 117,
            "previously_implemented_count": 12,
            "entries": capabilities,
        },
    )

    aliases = [
        {"public_alias": alias, **details}
        for alias, details in spec["aliases"].items()
        if details.get("kind") != "parameter_alias"
    ]
    parameter_aliases = [
        {"parameter_alias": alias, **details}
        for alias, details in spec["aliases"].items()
        if details.get("kind") == "parameter_alias"
    ]
    capability_by_method = {x["method"]: x for x in capabilities}
    inventory_methods = []
    for method, definition in methods.items():
        unresolved = []
        for field, global_name in (
            ("return_type", "return_type_default"),
            ("blocking", "blocking_default"),
            ("async", "async_default"),
        ):
            value = definition.get(field, spec["global_contract"].get(global_name))
            if value in {None, "UNRESOLVED"}:
                unresolved.append(field)
        capability = capability_by_method[method]
        video = method_video[method]
        inventory_methods.append({
            "public_method": method,
            "canonical_method": method,
            "category": definition["category"],
            "parameters": list(definition.get("parameters", {})),
            "return_type": None if "return_type" in unresolved else definition.get("return_type"),
            "blocking": None if "blocking" in unresolved else definition.get("blocking"),
            "async": None if "async" in unresolved else definition.get("async"),
            "currently_implemented": method in PREVIOUSLY_IMPLEMENTED,
            "ground_truth_available": video["video_count"] > 0,
            "video_count": video["video_count"],
            "video_status": video["video_status"],
            "hardware_dependency": capability["hardware_dependency"],
            "simulation_feasibility": capability["status"],
            "target_backend_status": capability["status"],
            "implementation_strategy": capability["implementation"],
            "unresolved_items": unresolved + capability["limitations"],
        })
    inventory = {
        "all_methods": list(methods),
        "implemented_methods_before_stage": sorted(PREVIOUSLY_IMPLEMENTED),
        "remaining_methods_before_stage": sorted(remaining),
        "aliases": aliases,
        "parameter_aliases": parameter_aliases,
        "legacy_non_public_methods": spec["blocked_names"],
        "counts": {
            "all_methods": len(methods),
            "already_implemented": len(PREVIOUSLY_IMPLEMENTED),
            "remaining": len(remaining),
            "aliases": len(aliases),
            "parameter_aliases": len(parameter_aliases),
            "legacy_non_public": len(spec["blocked_names"]),
            "categories": dict(Counter(x["category"] for x in inventory_methods)),
            "capability_statuses": dict(Counter(x["status"] for x in capabilities)),
        },
        "methods": inventory_methods,
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(REPORT_DIR / "full_method_inventory.json", inventory)
    write_json(REPORT_DIR / "full_video_mapping.json", video_mapping)
    profiles = build_profiles(methods, capabilities)
    write_json(PROFILE_PATH, profiles)

    inventory_lines = [
        "# Full Method Inventory",
        "",
        f"- Canonical methods: {len(methods)}",
        f"- Previously connected to MuJoCo backend: {len(PREVIOUSLY_IMPLEMENTED)}",
        f"- Remaining at stage start: {len(remaining)}",
        f"- Method aliases: {len(aliases)}",
        f"- Parameter aliases: {len(parameter_aliases)}",
        "",
        "| Method | Category | Previous | Target status | Video | Unresolved |",
        "|---|---|---:|---|---|---|",
    ]
    for item in inventory_methods:
        inventory_lines.append(
            f"| `{item['canonical_method']}` | {item['category']} | "
            f"{'yes' if item['currently_implemented'] else 'no'} | "
            f"{item['target_backend_status']} | {item['video_status']} "
            f"({item['video_count']}) | {', '.join(item['unresolved_items']) or 'none'} |"
        )
    (REPORT_DIR / "full_method_inventory.md").write_text(
        "\n".join(inventory_lines) + "\n", encoding="utf-8"
    )

    video_lines = [
        "# Full Video Mapping",
        "",
        "- Indexed source videos: 140",
        f"- Canonical methods: {len(methods)}",
        f"- Videos without accepted canonical mapping: {video_mapping['unmapped_video_count']}",
        "",
        "| Method | Status | Count | References |",
        "|---|---|---:|---|",
    ]
    for item in video_mapping["method_mappings"]:
        refs_text = "<br>".join(
            f"`{ref['video']}` ({ref['status']})" for ref in item["videos"]
        ) or "none"
        video_lines.append(
            f"| `{item['canonical_method']}` | {item['video_status']} | "
            f"{item['video_count']} | {refs_text} |"
        )
    (REPORT_DIR / "full_video_mapping.md").write_text(
        "\n".join(video_lines) + "\n", encoding="utf-8"
    )

    status_counts = Counter(item["status"] for item in capabilities)
    capability_lines = [
        "# Backend Capability Model",
        "",
        "Every canonical method has exactly one static entry in "
        "`config/backend_capabilities.json`.",
        "",
        "| Status | Count |",
        "|---|---:|",
    ]
    for status in (
        "IMPLEMENTED",
        "SIMULATED",
        "APPROXIMATE",
        "UNAVAILABLE_IN_MUJOCO",
        "BLOCKED_BY_MODEL",
        "BLOCKED_BY_UNRESOLVED_SPEC",
        "HARDWARE_ONLY",
        "UNSAFE_TO_SIMULATE",
        "FAILED",
    ):
        capability_lines.append(f"| {status} | {status_counts[status]} |")
    capability_lines.extend([
        "",
        "The stage-start figure of 12 means methods that had a backend connection, "
        "not 12 methods that satisfy the stricter final `IMPLEMENTED` definition. "
        "The final audit reclassifies real battery as `HARDWARE_ONLY` and diagnose "
        "as `SIMULATED`, while adding diagonal as `IMPLEMENTED`; therefore the final "
        "`IMPLEMENTED` count is 11.",
        "",
        "Blocked, unavailable, hardware-only, and unsafe methods return method-specific "
        "structured errors; they do not silently succeed.",
    ])
    (REPORT_DIR / "capability_model.md").write_text(
        "\n".join(capability_lines) + "\n", encoding="utf-8"
    )

    print(json.dumps({
        "canonical_methods": len(methods),
        "previously_implemented": len(PREVIOUSLY_IMPLEMENTED),
        "remaining": len(remaining),
        "status_counts": dict(status_counts),
        "video_count": video_mapping["source_video_count"],
        "profiles": len(profiles["profiles"]),
        "profile_methods": len(profiles["method_profiles"]),
    }, indent=2))


if __name__ == "__main__":
    main()
