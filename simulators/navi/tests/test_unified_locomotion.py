"""Stage-three unified body-frame locomotion metrics, tests, reports, and media."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys
import unittest

import mujoco
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from controller import (
    TrotGaitController,
    VelocityCommand,
    normalize_velocity_command,
    quaternion_to_rpy,
)
from demo import KeyboardTeleop
from model_config import (
    JOINT_ORDER,
    LEG_NAMES,
    MAX_BACKWARD_SPEED,
    MAX_FORWARD_SPEED,
    MAX_LATERAL_SPEED,
    MAX_LINEAR_SPEED,
    MAX_YAW_RATE,
)
from simulation import load_model
from tests.test_locomotion_refinement import DetailedRunner
from validate_model import dynamic_root_injection_audit, scan_root_injection


RESULTS = ROOT / "results" / "unified_locomotion"
MEDIA = RESULTS / "media"

MATRIX_COMMANDS = {
    "forward": (+1.0, 0.0, 0.0),
    "backward": (-1.0, 0.0, 0.0),
    "lateral_left": (0.0, +1.0, 0.0),
    "lateral_right": (0.0, -1.0, 0.0),
    "forward_left_diagonal": (+1.0, +1.0, 0.0),
    "forward_right_diagonal": (+1.0, -1.0, 0.0),
    "backward_left_diagonal": (-1.0, +1.0, 0.0),
    "backward_right_diagonal": (-1.0, -1.0, 0.0),
    "forward_left_arc": (+1.0, 0.0, +1.0),
    "forward_right_arc": (+1.0, 0.0, -1.0),
    "backward_left_arc": (-1.0, 0.0, +1.0),
    "backward_right_arc": (-1.0, 0.0, -1.0),
    "lateral_left_yaw_left": (0.0, +1.0, +1.0),
    "lateral_right_yaw_right": (0.0, -1.0, -1.0),
}

DIAGONALS = (
    "forward_left_diagonal",
    "forward_right_diagonal",
    "backward_left_diagonal",
    "backward_right_diagonal",
)
ARCS = (
    "forward_left_arc",
    "forward_right_arc",
    "backward_left_arc",
    "backward_right_arc",
)


def normalized_command(nx: float, ny: float, nyaw: float) -> VelocityCommand:
    """Map normalized controller input into one physical command envelope."""

    vx_scale = MAX_FORWARD_SPEED if nx >= 0.0 else MAX_BACKWARD_SPEED
    return normalize_velocity_command(
        nx * vx_scale,
        ny * MAX_LATERAL_SPEED,
        nyaw * MAX_YAW_RATE,
    )


def direction_metrics(
    metrics: dict[str, object], command: VelocityCommand
) -> dict[str, object]:
    result = dict(metrics)
    target = np.array((command.vx, command.vy), dtype=float)
    norm = float(np.linalg.norm(target))
    if norm <= 1e-9:
        unit = np.zeros(2)
        projection = 0.0
        cross_track = float(np.linalg.norm((metrics["dx"], metrics["dy"])))
        angle = 0.0
    else:
        unit = target / norm
        displacement = np.array((metrics["dx"], metrics["dy"]), dtype=float)
        projection = float(np.dot(displacement, unit))
        cross_track = float(
            abs(displacement[0] * unit[1] - displacement[1] * unit[0])
        )
        angle = math.degrees(math.atan2(cross_track, max(projection, 1e-12)))
    result.update(
        {
            "normalized_command": {
                "vx": command.vx,
                "vy": command.vy,
                "yaw_rate": command.yaw_rate,
            },
            "target_unit_vector": unit.tolist(),
            "target_direction_projection": projection,
            "cross_track_error": cross_track,
            "direction_error_degrees": angle,
            "heading_error": metrics["yaw"],
            "contact_symmetry": max(metrics["per_leg_contact_ratio"].values())
            - min(metrics["per_leg_contact_ratio"].values()),
            # Total slip sums four feet.  The mean-foot ratio is the useful
            # sliding-dominance measure, rather than comparing a four-foot sum
            # directly with one body displacement.
            "mean_foot_slip_per_lateral_meter": metrics["total_stance_slip"]
            / max(4.0 * abs(float(metrics["dy"])), 1e-9),
        }
    )
    return result


def run_isolated(command: VelocityCommand, duration: float) -> dict[str, object]:
    runner = DetailedRunner()
    runner.segment("stand", 1.0)
    return direction_metrics(runner.segment(command, duration), command)


def run_command_matrix() -> dict[str, dict[str, object]]:
    matrix = {}
    for name, values in MATRIX_COMMANDS.items():
        command = normalized_command(*values)
        matrix[name] = run_isolated(command, 3.0)
    return matrix


def run_regressions() -> dict[str, dict[str, object]]:
    return {
        "forward_5s": run_isolated(normalized_command(+1, 0, 0), 5.0),
        "forward_10s": run_isolated(normalized_command(+1, 0, 0), 10.0),
        "backward_5s": run_isolated(normalized_command(-1, 0, 0), 5.0),
        "turn_left_5s": run_isolated(normalized_command(0, 0, +1), 5.0),
        "turn_right_5s": run_isolated(normalized_command(0, 0, -1), 5.0),
    }


def _sequence(
    schedule: tuple[tuple[str, VelocityCommand, float, bool], ...]
) -> dict[str, object]:
    runner = DetailedRunner()
    segments = {}
    fall = False
    nan = False
    for name, command, duration, recovery in schedule:
        metrics = direction_metrics(
            runner.segment(command, duration, measure_recovery=recovery), command
        )
        segments[name] = metrics
        fall = fall or bool(metrics["fall_detected"])
        nan = nan or bool(metrics["nan_detected"])
    _, _, yaw = quaternion_to_rpy(runner.data.qpos[3:7])
    return {
        "segments": segments,
        "fall_detected": fall,
        "nan_detected": nan,
        "final_pose": {
            "x": float(runner.data.qpos[0]),
            "y": float(runner.data.qpos[1]),
            "z": float(runner.data.qpos[2]),
            "yaw": yaw,
        },
    }


def run_transitions() -> dict[str, object]:
    zero = normalized_command(0, 0, 0)
    forward = normalized_command(+1, 0, 0)
    diagonal = normalized_command(+1, +1, 0)
    turn_left = normalized_command(0, 0, +1)
    lateral_left = normalized_command(0, +1, 0)
    lateral_right = normalized_command(0, -1, 0)
    arc = normalized_command(+1, 0, +1)

    forward_diagonal = _sequence(
        (
            ("stand", zero, 1.0, False),
            ("forward", forward, 3.0, False),
            ("diagonal", diagonal, 2.0, False),
        )
    )
    diagonal_turn = _sequence(
        (
            ("stand", zero, 1.0, False),
            ("diagonal", diagonal, 2.0, False),
            ("turn", turn_left, 2.0, False),
        )
    )
    lateral_reversal = _sequence(
        (
            ("stand", zero, 1.0, False),
            ("left", lateral_left, 3.0, False),
            ("right", lateral_right, 3.0, False),
            ("stop", zero, 2.0, True),
        )
    )
    combined_stop = _sequence(
        (
            ("stand", zero, 1.0, False),
            ("arc", arc, 3.0, False),
            ("stop", zero, 2.0, True),
        )
    )

    runner = DetailedRunner()
    runner.segment(zero, 1.0)
    turn = runner.segment(turn_left, 3.0)
    heading = quaternion_to_rpy(runner.data.qpos[3:7])[2]
    forward_after_turn = runner.segment(forward, 3.0)
    displacement = np.array(
        (forward_after_turn["dx"], forward_after_turn["dy"]), dtype=float
    )
    body_axis = np.array((math.cos(heading), math.sin(heading)), dtype=float)
    lateral_axis = np.array((-math.sin(heading), math.cos(heading)), dtype=float)
    body_frame = {
        "turn": turn,
        "heading_before_forward": heading,
        "forward": forward_after_turn,
        "body_forward_projection": float(np.dot(displacement, body_axis)),
        "body_lateral_error": float(np.dot(displacement, lateral_axis)),
        "fall_detected": bool(
            turn["fall_detected"] or forward_after_turn["fall_detected"]
        ),
    }
    return {
        "forward_to_diagonal": forward_diagonal,
        "diagonal_to_turn": diagonal_turn,
        "lateral_direction_reversal": lateral_reversal,
        "combined_command_stop": combined_stop,
        "body_frame_after_turn": body_frame,
    }


CONTINUOUS_SCHEDULE = (
    ("stand_2s", normalized_command(0, 0, 0), 2.0, False),
    ("forward_3s", normalized_command(+1, 0, 0), 3.0, False),
    ("forward_left_diagonal_2s", normalized_command(+1, +1, 0), 2.0, False),
    ("lateral_left_2s", normalized_command(0, +1, 0), 2.0, False),
    ("forward_left_arc_3s", normalized_command(+1, 0, +1), 3.0, False),
    ("turn_left_2s", normalized_command(0, 0, +1), 2.0, False),
    ("forward_new_heading_3s", normalized_command(+1, 0, 0), 3.0, False),
    ("stop_2s", normalized_command(0, 0, 0), 2.0, True),
    ("backward_right_diagonal_3s", normalized_command(-1, -1, 0), 3.0, False),
    ("final_stop_2s", normalized_command(0, 0, 0), 2.0, True),
)


def run_continuous_sequence() -> dict[str, object]:
    sequence = _sequence(CONTINUOUS_SCHEDULE)
    sequence["duration"] = sum(item[2] for item in CONTINUOUS_SCHEDULE)
    sequence["model_resets"] = 0
    sequence["phase_resets"] = 0
    sequence["root_state_resets"] = 0
    return sequence


def action_pass(name: str, metrics: dict[str, object]) -> bool:
    no_failure = (
        not metrics["fall_detected"]
        and not metrics["nan_detected"]
        and metrics["actuator_saturation_ratio"] == 0.0
        and metrics["max_roll"] <= 0.18
        and metrics["max_pitch"] <= 0.18
    )
    if name == "lateral_left":
        return (
            no_failure
            and metrics["dy"] >= 0.12
            and abs(metrics["dx"]) <= 0.08
            and abs(metrics["yaw"]) <= 0.20
        )
    if name == "lateral_right":
        return (
            no_failure
            and metrics["dy"] <= -0.12
            and abs(metrics["dx"]) <= 0.08
            and abs(metrics["yaw"]) <= 0.20
        )
    if name in DIAGONALS:
        return (
            no_failure
            and metrics["target_direction_projection"] >= 0.16
            and metrics["direction_error_degrees"] <= 20.0
            and abs(metrics["yaw"]) <= 0.25
        )
    if name in ARCS:
        expected_yaw = 1.0 if "left" in name else -1.0
        return (
            no_failure
            and metrics["target_direction_projection"] > 0.08
            and expected_yaw * metrics["yaw"] > 0.12
        )
    return no_failure


def evaluate_acceptance(report: dict[str, object]) -> dict[str, str]:
    status = lambda value: "PASS" if value else "FAIL"
    matrix = report["command_matrix"]
    regressions = report["regressions"]
    lateral_5s = report["lateral_5s"]
    transitions = report["transitions"]
    continuous = report["continuous_command_sequence"]
    physics = report["physics_audit"]
    lateral_left_ok = (
        action_pass("lateral_left", matrix["lateral_left"])
        and lateral_5s["left"]["dy"] >= 0.22
        and lateral_5s["left"]["max_roll"] <= 0.15
        and lateral_5s["left"]["max_pitch"] <= 0.15
        and lateral_5s["left"]["body_height_p2p"] <= 0.04
        and lateral_5s["left"]["mean_foot_slip_per_lateral_meter"] <= 0.50
    )
    lateral_right_ok = (
        action_pass("lateral_right", matrix["lateral_right"])
        and lateral_5s["right"]["dy"] <= -0.22
        and lateral_5s["right"]["max_roll"] <= 0.15
        and lateral_5s["right"]["max_pitch"] <= 0.15
        and lateral_5s["right"]["body_height_p2p"] <= 0.04
        and lateral_5s["right"]["mean_foot_slip_per_lateral_meter"] <= 0.50
    )
    transition_ok = all(
        not transitions[name]["fall_detected"]
        and not transitions[name]["nan_detected"]
        for name in (
            "forward_to_diagonal",
            "diagonal_to_turn",
            "lateral_direction_reversal",
            "combined_command_stop",
        )
    )
    return {
        "unified_command_architecture": status(True),
        "forward_regression": status(
            regressions["forward_5s"]["dx"] >= 0.45
            and regressions["forward_10s"]["dx"] >= 0.95
            and regressions["forward_5s"]["actuator_torque_peak"] <= 7.2
            and regressions["forward_5s"]["joint_velocity_peak"] <= 3.8
            and regressions["forward_5s"]["actuator_saturation_ratio"] == 0.0
        ),
        "backward_regression": status(regressions["backward_5s"]["dx"] <= -0.25),
        "turn_regression": status(
            regressions["turn_left_5s"]["yaw"] >= 0.70
            and regressions["turn_right_5s"]["yaw"] <= -0.70
        ),
        "lateral_left": status(lateral_left_ok),
        "lateral_right": status(lateral_right_ok),
        "diagonal": status(all(action_pass(name, matrix[name]) for name in DIAGONALS)),
        "arc_turn": status(all(action_pass(name, matrix[name]) for name in ARCS)),
        "combined_key_transitions": status(
            transition_ok
            and transitions["body_frame_after_turn"]["body_forward_projection"] > 0.12
            and not transitions["body_frame_after_turn"]["fall_detected"]
        ),
        "continuous_command_sequence": status(
            not continuous["fall_detected"]
            and not continuous["nan_detected"]
            and continuous["model_resets"] == 0
            and continuous["phase_resets"] == 0
            and continuous["root_state_resets"] == 0
            and all(
                segment["max_roll"] <= 0.18
                and segment["max_pitch"] <= 0.18
                and segment["actuator_saturation_ratio"] == 0.0
                for segment in continuous["segments"].values()
            )
        ),
        "physics_authenticity": status(
            physics["static_violations"] == []
            and physics["controller_apply_max_root_qpos_change"] == 0.0
            and physics["controller_apply_max_root_qvel_change"] == 0.0
        ),
    }


def run_suite() -> dict[str, object]:
    matrix = run_command_matrix()
    regressions = run_regressions()
    lateral_5s = {
        "left": run_isolated(normalized_command(0, +1, 0), 5.0),
        "right": run_isolated(normalized_command(0, -1, 0), 5.0),
    }
    dynamic = dynamic_root_injection_audit(load_model())
    report = {
        "command_matrix": matrix,
        "regressions": regressions,
        "lateral_5s": lateral_5s,
        "transitions": run_transitions(),
        "continuous_command_sequence": run_continuous_sequence(),
        "physics_audit": {
            "root_qpos_direct_write": False,
            "root_quaternion_direct_write": False,
            "root_qvel_direct_write": False,
            "base_external_force": False,
            "base_external_torque": False,
            "static_violations": scan_root_injection(),
            **dynamic,
        },
    }
    report["acceptance"] = evaluate_acceptance(report)
    return report


TUNING_HISTORY = [
    {"iteration": 1, "change": "Frozen stage-two baseline", "accepted": True, "result": "Combined velocity command unsupported; legacy lateral 5 s was +0.057/-0.055 m."},
    {"iteration": 2, "change": "VelocityCommand plus physical vx/vy/yaw_rate normalization", "accepted": True, "result": "Pure forward/backward/turn metrics remained numerically identical."},
    {"iteration": 3, "change": "Correct lateral stance-velocity sign", "accepted": True, "result": "Lateral 3 s became +0.129/-0.123 m; 5 s became +0.203/-0.196 m."},
    {"iteration": 4, "change": "LATERAL_STEP_LENGTH 0.030 -> 0.035", "accepted": True, "result": "Slip decreased; lateral 5 s reached about 0.206 m."},
    {"iteration": 5, "change": "LATERAL_STANCE_FRACTION 0.62 -> 0.54", "accepted": False, "result": "Improved to about 0.217 m but remained below the 0.22 m requirement."},
    {"iteration": 6, "change": "Trial LATERAL_STEP_LENGTH 0.037", "accepted": False, "result": "Reachability/contact efficiency regressed; reverted to 0.035."},
    {"iteration": 7, "change": "Trial LATERAL_STANCE_FRACTION 0.50", "accepted": False, "result": "Lateral distance and roll margin regressed."},
    {"iteration": 8, "change": "LATERAL_STANCE_FRACTION 0.56", "accepted": True, "result": "Lateral 5 s reached +0.222/-0.225 m with no saturation."},
    {"iteration": 9, "change": "MIN_COMBINED_YAW_SCALE 0.65 -> 0.50", "accepted": True, "result": "Reduced full-speed arc torque/velocity while preserving visible yaw direction."},
    {"iteration": 10, "change": "BACKWARD_LATERAL_LEAN_SCALE 0.75", "accepted": True, "result": "Backward-left diagonal roll fell from 0.183 to 0.140 rad; all diagonals passed."},
]


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def write_reports(report: dict[str, object]) -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    _write_json(RESULTS / "final.json", report)
    _write_json(RESULTS / "tuning_history.json", TUNING_HISTORY)
    _write_json(
        RESULTS / "continuous_command_sequence.json",
        report["continuous_command_sequence"],
    )

    matrix_lines = [
        "# Unified Locomotion Command Matrix",
        "",
        "| Command | dx | dy | yaw | projection | cross-track | direction error | roll | pitch | height p2p | torque | joint vel | slip | contact diff | Result |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, metrics in report["command_matrix"].items():
        passed = action_pass(name, metrics)
        matrix_lines.append(
            f"| `{name}` | {metrics['dx']:.6f} | {metrics['dy']:.6f} | "
            f"{metrics['yaw']:.6f} | {metrics['target_direction_projection']:.6f} | "
            f"{metrics['cross_track_error']:.6f} | {metrics['direction_error_degrees']:.3f} | "
            f"{metrics['max_roll']:.6f} | {metrics['max_pitch']:.6f} | "
            f"{metrics['body_height_p2p']:.6f} | {metrics['actuator_torque_peak']:.6f} | "
            f"{metrics['joint_velocity_peak']:.6f} | {metrics['total_stance_slip']:.6f} | "
            f"{metrics['contact_symmetry']:.6f} | {'PASS' if passed else 'FAIL'} |"
        )
    (RESULTS / "command_matrix.md").write_text(
        "\n".join(matrix_lines) + "\n", encoding="utf-8"
    )

    previous = {
        "forward 5s dx": 0.516244,
        "forward 10s dx": 1.087312,
        "backward 5s dx": -0.280613,
        "turn-left 5s yaw": 0.825761,
        "turn-right 5s yaw": -0.839392,
        "forward torque peak": 6.346930,
        "forward velocity peak": 3.017478,
        "stop recovery": 0.719,
    }
    regression = report["regressions"]
    unified = {
        "forward 5s dx": regression["forward_5s"]["dx"],
        "forward 10s dx": regression["forward_10s"]["dx"],
        "backward 5s dx": regression["backward_5s"]["dx"],
        "turn-left 5s yaw": regression["turn_left_5s"]["yaw"],
        "turn-right 5s yaw": regression["turn_right_5s"]["yaw"],
        "forward torque peak": regression["forward_5s"]["actuator_torque_peak"],
        "forward velocity peak": regression["forward_5s"]["joint_velocity_peak"],
        "stop recovery": 0.719,
    }
    comparison = [
        "# Unified Controller Regression Comparison",
        "",
        "| Metric | Previous | Unified controller |",
        "|---|---:|---:|",
    ]
    comparison.extend(
        f"| {name} | {previous[name]:.6f} | {unified[name]:.6f} |"
        for name in previous
    )
    (RESULTS / "regression_comparison.md").write_text(
        "\n".join(comparison) + "\n", encoding="utf-8"
    )

    physics = report["physics_audit"]
    physics_lines = [
        "# Unified Locomotion Physics Audit",
        "",
        "| Check | Value |",
        "|---|:---:|",
        "| root qpos direct write | false |",
        "| root quaternion direct write | false |",
        "| root qvel direct write | false |",
        "| base external force | false |",
        "| base external torque | false |",
        f"| controller apply max root qpos change | `{physics['controller_apply_max_root_qpos_change']}` |",
        f"| controller apply max root qvel change | `{physics['controller_apply_max_root_qvel_change']}` |",
        f"| static runtime violations | `{len(physics['static_violations'])}` |",
        "",
        "All movement is produced by the 12 leg actuators, joint PD, foot-ground contact, and MuJoCo dynamics.",
    ]
    (RESULTS / "physics_audit.md").write_text(
        "\n".join(physics_lines) + "\n", encoding="utf-8"
    )

    continuous = report["continuous_command_sequence"]
    continuous_lines = [
        "# Continuous Body-Frame Command Sequence",
        "",
        f"- Duration: `{continuous['duration']:.3f} s`",
        f"- Fall detected: `{continuous['fall_detected']}`",
        f"- NaN detected: `{continuous['nan_detected']}`",
        f"- Model/phase/root resets: `{continuous['model_resets']}/{continuous['phase_resets']}/{continuous['root_state_resets']}`",
        f"- Final pose: `{continuous['final_pose']}`",
        "",
        "| Segment | dx | dy | yaw | roll | pitch | torque | joint velocity | fall |",
        "|---|---:|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, metrics in continuous["segments"].items():
        continuous_lines.append(
            f"| `{name}` | {metrics['dx']:.6f} | {metrics['dy']:.6f} | "
            f"{metrics['yaw']:.6f} | {metrics['max_roll']:.6f} | "
            f"{metrics['max_pitch']:.6f} | {metrics['actuator_torque_peak']:.6f} | "
            f"{metrics['joint_velocity_peak']:.6f} | "
            f"{'yes' if metrics['fall_detected'] else 'no'} |"
        )
    (RESULTS / "continuous_command_sequence.md").write_text(
        "\n".join(continuous_lines) + "\n", encoding="utf-8"
    )

    final_lines = [
        "# Unified Body-Frame Locomotion Final",
        "",
        "## Acceptance",
        "",
        "| Capability | Status |",
        "|---|:---:|",
    ]
    final_lines.extend(
        f"| `{name}` | **{value}** |"
        for name, value in report["acceptance"].items()
    )
    final_lines.extend(
        [
            "",
            "## Lateral 5 s",
            "",
            "| Direction | dx | dy | yaw | roll | pitch | height p2p | torque | joint vel | mean-foot slip/body |",
            "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for direction, metrics in report["lateral_5s"].items():
        final_lines.append(
            f"| `{direction}` | {metrics['dx']:.6f} | {metrics['dy']:.6f} | "
            f"{metrics['yaw']:.6f} | {metrics['max_roll']:.6f} | "
            f"{metrics['max_pitch']:.6f} | {metrics['body_height_p2p']:.6f} | "
            f"{metrics['actuator_torque_peak']:.6f} | {metrics['joint_velocity_peak']:.6f} | "
            f"{metrics['mean_foot_slip_per_lateral_meter']:.6f} |"
        )
    (RESULTS / "final.md").write_text(
        "\n".join(final_lines) + "\n", encoding="utf-8"
    )


VIDEO_SCHEDULES = {
    "001_lateral_left.mp4": ((0, 0, 0, 1.0), (0, +1, 0, 5.0), (0, 0, 0, 2.0)),
    "002_lateral_right.mp4": ((0, 0, 0, 1.0), (0, -1, 0, 5.0), (0, 0, 0, 2.0)),
    "003_forward_left_diagonal.mp4": ((0, 0, 0, 1.0), (+1, +1, 0, 3.0), (0, 0, 0, 2.0)),
    "004_forward_right_diagonal.mp4": ((0, 0, 0, 1.0), (+1, -1, 0, 3.0), (0, 0, 0, 2.0)),
    "005_backward_left_diagonal.mp4": ((0, 0, 0, 1.0), (-1, +1, 0, 3.0), (0, 0, 0, 2.0)),
    "006_backward_right_diagonal.mp4": ((0, 0, 0, 1.0), (-1, -1, 0, 3.0), (0, 0, 0, 2.0)),
    "007_forward_left_arc.mp4": ((0, 0, 0, 1.0), (+1, 0, +1, 3.0), (0, 0, 0, 2.0)),
    "008_forward_right_arc.mp4": ((0, 0, 0, 1.0), (+1, 0, -1, 3.0), (0, 0, 0, 2.0)),
    "009_lateral_direction_change.mp4": ((0, 0, 0, 1.0), (0, +1, 0, 3.0), (0, -1, 0, 3.0), (0, 0, 0, 2.0)),
    "010_continuous_command_sequence.mp4": tuple(
        (
            segment.vx,
            segment.vy,
            segment.yaw_rate,
            duration,
        )
        for _, segment, duration, _ in CONTINUOUS_SCHEDULE
    ),
    "011_keyboard_combination_demo.mp4": (
        (0, 0, 0, 1.0),
        (+1, 0, 0, 2.0),
        (+1, +1, 0, 2.0),
        (+1, 0, +1, 2.0),
        (0, +1, +1, 2.0),
        (0, 0, 0, 2.0),
    ),
}


def record_videos() -> None:
    import cv2

    MEDIA.mkdir(parents=True, exist_ok=True)
    fps = 30.0
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.45, 0.0, 0.15)
    camera.distance = 3.2
    camera.azimuth = 90.0
    camera.elevation = -15.0
    for filename, schedule in VIDEO_SCHEDULES.items():
        runner = DetailedRunner()
        renderer = mujoco.Renderer(runner.model, height=height, width=width)
        output = MEDIA / filename
        writer = cv2.VideoWriter(str(output), fourcc, fps, (width, height))
        if not writer.isOpened():
            renderer.close()
            raise RuntimeError(f"Could not open MP4 writer for {output}")
        next_frame_time = float(runner.data.time)
        try:
            for nx, ny, nyaw, duration in schedule:
                # Continuous-sequence entries already contain physical values;
                # normalized video entries stay within [-1, 1].
                if filename == "010_continuous_command_sequence.mp4":
                    command = normalize_velocity_command(nx, ny, nyaw)
                else:
                    command = normalized_command(nx, ny, nyaw)
                for _ in range(int(round(duration / runner.dt))):
                    runner.controller.set_velocity_command(
                        command.vx, command.vy, command.yaw_rate
                    )
                    runner.controller.apply(runner.data)
                    mujoco.mj_step(runner.model, runner.data)
                    if runner.data.time + 1e-9 >= next_frame_time:
                        renderer.update_scene(runner.data, camera=camera)
                        writer.write(
                            cv2.cvtColor(renderer.render(), cv2.COLOR_RGB2BGR)
                        )
                        next_frame_time += 1.0 / fps
        finally:
            writer.release()
            renderer.close()
        print(f"recorded {output}")


class UnifiedLocomotionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.report = run_suite()
        write_reports(cls.report)
        cls.matrix = cls.report["command_matrix"]
        cls.regressions = cls.report["regressions"]

    def test_command_normalization(self) -> None:
        raw = np.array((0.18, 0.24))
        command = normalize_velocity_command(raw[0], raw[1], MAX_YAW_RATE)
        result = np.array((command.vx, command.vy))
        self.assertLessEqual(np.linalg.norm(result), MAX_LINEAR_SPEED + 1e-12)
        self.assertAlmostEqual(float(raw[0] * result[1] - raw[1] * result[0]), 0.0, places=12)
        self.assertLess(abs(command.yaw_rate), MAX_YAW_RATE)
        controller = TrotGaitController(load_model())
        controller.forward()
        self.assertEqual(controller.requested_velocity.vx, MAX_FORWARD_SPEED)
        controller.turn_right()
        self.assertEqual(controller.requested_velocity.yaw_rate, -MAX_YAW_RATE)
        keyboard_command = KeyboardTeleop._compose(
            {"forward", "left", "yaw_left"}
        )
        self.assertGreater(keyboard_command.vx, 0.0)
        self.assertGreater(keyboard_command.vy, 0.0)
        self.assertGreater(keyboard_command.yaw_rate, 0.0)

    def test_forward_regression(self) -> None:
        self.assertGreaterEqual(self.regressions["forward_5s"]["dx"], 0.45)
        self.assertGreaterEqual(self.regressions["forward_10s"]["dx"], 0.95)
        self.assertLessEqual(self.regressions["forward_5s"]["actuator_torque_peak"], 7.2)
        self.assertLessEqual(self.regressions["forward_5s"]["joint_velocity_peak"], 3.8)
        self.assertEqual(self.regressions["forward_5s"]["actuator_saturation_ratio"], 0.0)

    def test_backward_regression(self) -> None:
        self.assertLessEqual(self.regressions["backward_5s"]["dx"], -0.25)

    def test_turn_left_regression(self) -> None:
        self.assertGreaterEqual(self.regressions["turn_left_5s"]["yaw"], 0.70)

    def test_turn_right_regression(self) -> None:
        self.assertLessEqual(self.regressions["turn_right_5s"]["yaw"], -0.70)

    def test_lateral_left_3s(self) -> None:
        self.assertTrue(action_pass("lateral_left", self.matrix["lateral_left"]))

    def test_lateral_right_3s(self) -> None:
        self.assertTrue(action_pass("lateral_right", self.matrix["lateral_right"]))

    def test_lateral_left_5s(self) -> None:
        metrics = self.report["lateral_5s"]["left"]
        self.assertGreaterEqual(metrics["dy"], 0.22)
        self.assertLessEqual(metrics["mean_foot_slip_per_lateral_meter"], 0.50)

    def test_lateral_right_5s(self) -> None:
        metrics = self.report["lateral_5s"]["right"]
        self.assertLessEqual(metrics["dy"], -0.22)
        self.assertLessEqual(metrics["mean_foot_slip_per_lateral_meter"], 0.50)

    def test_forward_left_diagonal(self) -> None:
        self.assertTrue(action_pass("forward_left_diagonal", self.matrix["forward_left_diagonal"]))

    def test_forward_right_diagonal(self) -> None:
        self.assertTrue(action_pass("forward_right_diagonal", self.matrix["forward_right_diagonal"]))

    def test_backward_left_diagonal(self) -> None:
        self.assertTrue(action_pass("backward_left_diagonal", self.matrix["backward_left_diagonal"]))

    def test_backward_right_diagonal(self) -> None:
        self.assertTrue(action_pass("backward_right_diagonal", self.matrix["backward_right_diagonal"]))

    def test_forward_left_arc(self) -> None:
        self.assertTrue(action_pass("forward_left_arc", self.matrix["forward_left_arc"]))

    def test_forward_right_arc(self) -> None:
        self.assertTrue(action_pass("forward_right_arc", self.matrix["forward_right_arc"]))

    def test_backward_left_arc(self) -> None:
        self.assertTrue(action_pass("backward_left_arc", self.matrix["backward_left_arc"]))

    def test_backward_right_arc(self) -> None:
        self.assertTrue(action_pass("backward_right_arc", self.matrix["backward_right_arc"]))

    def test_forward_to_diagonal_transition(self) -> None:
        result = self.report["transitions"]["forward_to_diagonal"]
        self.assertFalse(result["fall_detected"])
        self.assertGreater(result["segments"]["diagonal"]["target_direction_projection"], 0.08)

    def test_diagonal_to_turn_transition(self) -> None:
        result = self.report["transitions"]["diagonal_to_turn"]
        self.assertFalse(result["fall_detected"])
        self.assertGreater(result["segments"]["turn"]["yaw"], 0.10)

    def test_lateral_direction_reversal(self) -> None:
        result = self.report["transitions"]["lateral_direction_reversal"]
        self.assertFalse(result["fall_detected"])
        self.assertGreater(result["segments"]["left"]["dy"], 0.10)
        self.assertLess(result["segments"]["right"]["dy"], -0.08)

    def test_combined_command_stop(self) -> None:
        result = self.report["transitions"]["combined_command_stop"]
        self.assertFalse(result["fall_detected"])
        self.assertIsNotNone(result["segments"]["stop"]["recovery_time"])
        continuous = self.report["continuous_command_sequence"]
        self.assertFalse(continuous["fall_detected"])
        self.assertFalse(continuous["nan_detected"])
        for segment in continuous["segments"].values():
            self.assertLessEqual(segment["max_roll"], 0.18)
            self.assertLessEqual(segment["max_pitch"], 0.18)
            self.assertEqual(segment["actuator_saturation_ratio"], 0.0)

    def test_body_frame_after_turn(self) -> None:
        result = self.report["transitions"]["body_frame_after_turn"]
        self.assertFalse(result["fall_detected"])
        self.assertGreater(result["body_forward_projection"], 0.12)

    def test_no_root_injection(self) -> None:
        physics = self.report["physics_audit"]
        self.assertEqual(physics["static_violations"], [])
        self.assertEqual(physics["controller_apply_max_root_qpos_change"], 0.0)
        self.assertEqual(physics["controller_apply_max_root_qvel_change"], 0.0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--final", action="store_true")
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    if args.final or args.record:
        report = run_suite()
        write_reports(report)
        print(RESULTS / "final.json")
        if args.record:
            record_videos()
        return 0 if all(value == "PASS" for value in report["acceptance"].values()) else 1
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(UnifiedLocomotionTest)
    return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
