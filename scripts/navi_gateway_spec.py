"""Reviewed Navi commands that the standalone gateway may execute.

This mirrors the public wrappers in the Navi SDK at commit 52951bb. Raw action
IDs, connection settings, generic transport calls, unsupported backflip, and
development-only recovery/configuration commands are intentionally absent.
"""
from __future__ import annotations

NAVI_SIMPLE_COMMANDS = {
    "act_shy", "ask_for_play", "be_sleepy", "body_status", "body_tag_search",
    "bored_half_sit", "bow", "brace", "clap_hand", "crawl", "cry", "damping",
    "diagnose", "dramatic_listen", "draw_heart", "duck_walk", "eager",
    "encourage", "explore_new_home", "fast_rotate", "flex_muscles", "frontflip",
    "full_body_stretch", "get_battery_status", "get_status", "good_night_wave",
    "head_up_down", "jingle", "joint_states", "joy_walk", "jump", "jump_forward",
    "jump_round", "kick", "knock", "lie_down", "look_down", "nod_off",
    "nod_with_beats", "observe", "pee_quick", "playful_greeting", "push_ahead",
    "rear_stretch", "rest", "rub_eyes", "search_tag", "shake_hand_quick",
    "shake_self", "sniff_up", "stand", "stand_at_attention", "stand_high",
    "step_idle", "stop", "sway_front_back", "swim", "toilet_pose", "turn_left",
    "turn_right", "u_turn", "wag_rear", "wait_for_praise", "wave_hand", "yawn",
}

NAVI_PARAMETERIZED_COMMANDS = {
    "act_shy": {"side"},
    "forward": {"speed_mps", "duration_s", "speed_percent", "speed_level", "distance_m", "stop", "speed", "seconds"},
    "backward": {"speed_mps", "duration_s", "speed_percent", "speed_level", "distance_m", "stop", "speed", "seconds"},
    "lateral_left": {"distance_m", "speed_mps", "duration_s", "stop", "speed", "seconds"},
    "lateral_right": {"distance_m", "speed_mps", "duration_s", "stop", "speed", "seconds"},
    "diagonal": {"x_m", "y_m", "angle_deg", "speed_mps", "duration_s", "stop"},
    "turn": {"angle_deg", "angle_rad", "distance_deg", "distance_rad", "turn_rate_rad_s", "turn_rate_deg_s", "rate_percentage", "turn_level", "duration_s", "stop"},
    "emergency_stop": {"reason"},
    "sideflip": {"direction"},
    "sway": {"duration_s"},
    "pee": {"duration_s"},
    "shake_hand": {"duration_s"},
    "hip_shake": {"duration_s"},
    "bark": {"count"},
    "nod_head": {"count"},
    "shake_head": {"count"},
    "confused": {"style"},
    "show_affection": {"style"},
    "dance": {"style"},
    "cute": {"style"},
    "enjoy_touch": {"style"},
    "sniff_left": {"speed"},
    "sniff_right": {"speed"},
    "sniff_ahead": {"style"},
    "front_stretch": {"style"},
    "push_up": {"count"},
    "look_around": {"style"},
    "think": {"style"},
    "point_to_sky": {"direction"},
    "lucky_cat": {"style"},
    "rear_puff": {"style"},
    "chat": {"style"},
    "cooking": {"recover"},
    "eat": {"swallow"},
    "excited": {"style"},
    "explore_road": {"style"},
    "search_environment": {"style"},
    "listen": {"direction"},
    "toss": {"direction"},
    "snuggle": {"style"},
    "brush_teeth": {"direction", "phase"},
    "step": {"direction"},
    "turn_around": {"direction"},
    "squat": {"time"},
    "sit": {"time"},
    "lie_on_elbows": {"time"},
    "prostrate": {"time"},
    "sphinx_lie": {"time"},
    "sphinx_left_lie": {"time"},
    "sphinx_right_lie": {"time"},
    "stand_at_ease": {"time"},
}

NAVI_COMMAND_PARAMETERS = {
    **{name: frozenset() for name in NAVI_SIMPLE_COMMANDS},
    **{name: frozenset(parameters) for name, parameters in NAVI_PARAMETERIZED_COMMANDS.items()},
}


def validate_navi_command(name: object, arguments: object) -> None:
    if not isinstance(name, str) or name not in NAVI_COMMAND_PARAMETERS:
        raise ValueError(f"Navi command is not approved: {name!r}")
    if not isinstance(arguments, dict):
        raise ValueError(f"Navi command arguments must be an object: {name}")
    unknown = set(arguments) - NAVI_COMMAND_PARAMETERS[name]
    if unknown:
        raise ValueError(f"Navi command {name} has unapproved arguments: {sorted(unknown)}")
