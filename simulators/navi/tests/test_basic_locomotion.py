"""Numerical acceptance tests and fixed-camera recordings for basic locomotion."""

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

from controller import TrotGaitController, quaternion_to_rpy
from model_config import (
    LEG_NAMES,
    MAX_TORQUE,
    MIN_SAFE_BODY_HEIGHT,
    SAFETY_PITCH_LIMIT,
    SAFETY_ROLL_LIMIT,
)
from simulation import foot_contact_state, load_model, reset_to_keyframe


RESULTS = ROOT / "results"
MEDIA = RESULTS / "basic_locomotion" / "media"
DT_EPSILON = 1e-9


def _yaw_delta(final: float, initial: float) -> float:
    return math.atan2(math.sin(final - initial), math.cos(final - initial))


class ScenarioRunner:
    """Run commands without ever assigning the floating-base state."""

    def __init__(self) -> None:
        self.model = load_model()
        self.data = mujoco.MjData(self.model)
        reset_to_keyframe(self.model, self.data, "standing")
        self.controller = TrotGaitController(self.model)
        self.dt = float(self.model.opt.timestep)

    def segment(
        self, command: str, duration: float, *, measure_recovery: bool = False
    ) -> dict[str, object]:
        start_xy = self.data.qpos[0:2].copy()
        start_yaw = quaternion_to_rpy(self.data.qpos[3:7])[2]
        heights: list[float] = []
        joint_min = np.full(12, np.inf)
        joint_max = np.full(12, -np.inf)
        max_abs_roll = 0.0
        max_abs_pitch = 0.0
        joint_velocity_peak = 0.0
        actuator_peak = 0.0
        saturation_samples = 0
        actuator_samples = 0
        foot_contact_counts = {leg: 0 for leg in LEG_NAMES}
        finite = True
        fall_detected = False
        stable_steps = 0
        stable_required = max(1, int(math.ceil(0.20 / self.dt)))
        recovery_time: float | None = None

        steps = int(round(duration / self.dt))
        for step in range(steps):
            self.controller.set_command(command)
            torque = self.controller.apply(self.data)
            mujoco.mj_step(self.model, self.data)

            roll, pitch, _ = quaternion_to_rpy(self.data.qpos[3:7])
            joints = self.data.qpos[self.controller.qpos_addresses]
            joint_velocity = self.data.qvel[self.controller.dof_addresses]
            contacts = foot_contact_state(self.model, self.data)
            height = float(self.data.qpos[2])
            sample_finite = bool(
                np.all(np.isfinite(self.data.qpos))
                and np.all(np.isfinite(self.data.qvel))
                and np.all(np.isfinite(torque))
            )

            finite = finite and sample_finite
            fall_detected = fall_detected or (
                not sample_finite
                or height < MIN_SAFE_BODY_HEIGHT
                or abs(roll) > SAFETY_ROLL_LIMIT
                or abs(pitch) > SAFETY_PITCH_LIMIT
            )
            heights.append(height)
            max_abs_roll = max(max_abs_roll, abs(roll))
            max_abs_pitch = max(max_abs_pitch, abs(pitch))
            joint_min = np.minimum(joint_min, joints)
            joint_max = np.maximum(joint_max, joints)
            joint_velocity_peak = max(
                joint_velocity_peak, float(np.max(np.abs(joint_velocity)))
            )
            actuator_peak = max(actuator_peak, float(np.max(np.abs(torque))))
            saturation_samples += int(
                np.count_nonzero(
                    np.abs(torque) >= 0.99 * self.controller.torque_limits
                )
            )
            actuator_samples += torque.size
            for leg in LEG_NAMES:
                foot_contact_counts[leg] += int(contacts[leg])

            if measure_recovery:
                stable = (
                    sample_finite
                    and height >= 0.20
                    and abs(roll) <= 0.08
                    and abs(pitch) <= 0.08
                    and all(contacts.values())
                    and float(np.linalg.norm(self.data.qvel[0:3])) <= 0.08
                    and float(np.linalg.norm(self.data.qvel[3:6])) <= 0.50
                    and float(np.max(np.abs(joint_velocity))) <= 0.35
                )
                stable_steps = stable_steps + 1 if stable else 0
                if recovery_time is None and stable_steps >= stable_required:
                    recovery_time = (step + 1) * self.dt

        _, _, final_yaw = quaternion_to_rpy(self.data.qpos[3:7])
        displacement = self.data.qpos[0:2] - start_xy
        samples = max(steps, 1)
        return {
            "duration": duration,
            "dx": float(displacement[0]),
            "dy": float(displacement[1]),
            "yaw": _yaw_delta(final_yaw, start_yaw),
            "body_height_mean": float(np.mean(heights)),
            "body_height_p2p": float(np.ptp(heights)),
            "min_height": float(np.min(heights)),
            "max_roll": max_abs_roll,
            "max_pitch": max_abs_pitch,
            "roll_max_abs": max_abs_roll,
            "pitch_max_abs": max_abs_pitch,
            "xy_drift": float(np.linalg.norm(displacement)),
            "joint_position_p2p": (joint_max - joint_min).astype(float).tolist(),
            "joint_velocity_peak": joint_velocity_peak,
            "actuator_peak": actuator_peak,
            "actuator_saturation_ratio": saturation_samples / max(actuator_samples, 1),
            "foot_contact_ratio": {
                leg: foot_contact_counts[leg] / samples for leg in LEG_NAMES
            },
            "finite": finite,
            "fall_detected": fall_detected,
            "recovery_time": recovery_time,
        }


def _pass_if(condition: bool) -> str:
    return "PASS" if condition else "FAIL"


def _stand_scenario() -> dict[str, object]:
    runner = ScenarioRunner()
    metrics = runner.segment("stand", 10.0)
    metrics["result"] = _pass_if(
        metrics["finite"]
        and not metrics["fall_detected"]
        and metrics["xy_drift"] <= 0.03
        and metrics["max_roll"] <= 0.20
        and metrics["max_pitch"] <= 0.20
        and metrics["actuator_saturation_ratio"] <= 0.05
        and all(value >= 0.95 for value in metrics["foot_contact_ratio"].values())
    )
    return metrics


def _motion_scenario(command: str) -> dict[str, object]:
    runner = ScenarioRunner()
    runner.segment("stand", 1.0)
    metrics = runner.segment(command, 3.0)
    recovery = runner.segment("stand", 2.0, measure_recovery=True)
    metrics["recovery_time"] = recovery["recovery_time"]
    metrics["recovery_fall_detected"] = recovery["fall_detected"]

    common = (
        metrics["finite"]
        and not metrics["fall_detected"]
        and not recovery["fall_detected"]
        and abs(metrics["dy"]) <= 0.10
        and abs(metrics["yaw"]) <= 0.35
    )
    if command == "forward":
        accepted = common and metrics["dx"] >= 0.10
    elif command == "backward":
        accepted = common and metrics["dx"] <= -0.08
    elif command == "turn_left":
        accepted = (
            metrics["finite"]
            and not metrics["fall_detected"]
            and not recovery["fall_detected"]
            and metrics["yaw"] >= 0.12
            and math.hypot(metrics["dx"], metrics["dy"]) <= 0.25
        )
    elif command == "turn_right":
        accepted = (
            metrics["finite"]
            and not metrics["fall_detected"]
            and not recovery["fall_detected"]
            and metrics["yaw"] <= -0.12
            and math.hypot(metrics["dx"], metrics["dy"]) <= 0.25
        )
    else:
        raise ValueError(command)
    metrics["result"] = _pass_if(accepted)
    return metrics


def _turn_then_forward_scenario() -> dict[str, object]:
    runner = ScenarioRunner()
    runner.segment("stand", 1.0)
    overall_start = runner.data.qpos[0:2].copy()
    overall_start_yaw = quaternion_to_rpy(runner.data.qpos[3:7])[2]
    turn = runner.segment("turn_left", 3.0)
    stop_after_turn = runner.segment("stand", 2.0, measure_recovery=True)
    heading = quaternion_to_rpy(runner.data.qpos[3:7])[2]
    forward = runner.segment("forward", 3.0)
    runner.segment("stand", 2.0, measure_recovery=True)

    world_delta = np.array((forward["dx"], forward["dy"]), dtype=float)
    heading_axis = np.array((math.cos(heading), math.sin(heading)), dtype=float)
    lateral_axis = np.array((-math.sin(heading), math.cos(heading)), dtype=float)
    final_yaw = quaternion_to_rpy(runner.data.qpos[3:7])[2]
    overall_delta = runner.data.qpos[0:2] - overall_start
    result = {
        **forward,
        "dx": float(overall_delta[0]),
        "dy": float(overall_delta[1]),
        "yaw": _yaw_delta(final_yaw, overall_start_yaw),
        "turn_yaw": turn["yaw"],
        "heading_before_forward": heading,
        "body_forward_displacement": float(np.dot(world_delta, heading_axis)),
        "body_lateral_displacement": float(np.dot(world_delta, lateral_axis)),
        "turn_stop_recovery_time": stop_after_turn["recovery_time"],
    }
    result["result"] = _pass_if(
        turn["yaw"] >= 0.12
        and not turn["fall_detected"]
        and stop_after_turn["recovery_time"] is not None
        and stop_after_turn["recovery_time"] <= 2.0 + DT_EPSILON
        and result["body_forward_displacement"] >= 0.10
        and abs(result["body_lateral_displacement"]) <= 0.10
        and not forward["fall_detected"]
    )
    return result


def _stop_recovery_scenario() -> dict[str, object]:
    runner = ScenarioRunner()
    runner.segment("stand", 1.0)
    motion = runner.segment("forward", 3.0)
    recovery = runner.segment("stand", 2.0, measure_recovery=True)
    result = {
        **motion,
        "recovery_time": recovery["recovery_time"],
        "recovery_max_roll": recovery["max_roll"],
        "recovery_max_pitch": recovery["max_pitch"],
        "recovery_min_height": recovery["min_height"],
        "recovery_fall_detected": recovery["fall_detected"],
    }
    result["result"] = _pass_if(
        not motion["fall_detected"]
        and not recovery["fall_detected"]
        and recovery["recovery_time"] is not None
        and recovery["recovery_time"] <= 2.0 + DT_EPSILON
    )
    return result


def run_acceptance_suite(*, write_reports: bool = True) -> dict[str, object]:
    actions = {
        "stand_10s": _stand_scenario(),
        "forward_3s": _motion_scenario("forward"),
        "backward_3s": _motion_scenario("backward"),
        "turn_left_3s": _motion_scenario("turn_left"),
        "turn_right_3s": _motion_scenario("turn_right"),
        "turn_then_forward": _turn_then_forward_scenario(),
        "stop_recovery": _stop_recovery_scenario(),
    }
    report = {
        "thresholds": {
            "forward_dx_min": 0.10,
            "backward_dx_max": -0.08,
            "turn_left_yaw_min": 0.12,
            "turn_right_yaw_max": -0.12,
            "translation_cross_track_max": 0.10,
            "turn_translation_max": 0.25,
            "stop_recovery_max_seconds": 2.0,
        },
        "actions": actions,
        "summary": {name: item["result"] for name, item in actions.items()},
    }
    for name, item in actions.items():
        print(f"{item['result']:>4}  {name}")
    if write_reports:
        _write_reports(report)
    return report


def _write_reports(report: dict[str, object]) -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    json_path = RESULTS / "basic_locomotion_test.json"
    markdown_path = RESULTS / "basic_locomotion_test.md"
    json_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# Navi Basic Locomotion Test",
        "",
        "All displacement comes from the 12 leg torque actuators and ground contact.",
        "",
        "| Action | dx (m) | dy (m) | yaw (rad) | max roll | max pitch | min height (m) | result |",
        "|---|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, metrics in report["actions"].items():
        lines.append(
            f"| `{name}` | {metrics['dx']:.6f} | {metrics['dy']:.6f} | "
            f"{metrics['yaw']:.6f} | {metrics['max_roll']:.6f} | "
            f"{metrics['max_pitch']:.6f} | {metrics['min_height']:.6f} | "
            f"**{metrics['result']}** |"
        )
    lines.extend(
        [
            "",
            "## Stop recovery",
            "",
            f"Stable standing was reacquired in `{report['actions']['stop_recovery']['recovery_time']:.3f} s`.",
            "",
            "## Body-frame check",
            "",
            f"After turning left, forward displacement projected onto the new heading was "
            f"`{report['actions']['turn_then_forward']['body_forward_displacement']:.6f} m`; "
            f"cross-track displacement was "
            f"`{report['actions']['turn_then_forward']['body_lateral_displacement']:.6f} m`.",
        ]
    )
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    standing = dict(report["actions"]["stand_10s"])
    (RESULTS / "standing_tuning.json").write_text(
        json.dumps(standing, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )


VIDEO_SCHEDULES = {
    "001_stand_10s.mp4": (("stand", 10.0),),
    "002_forward.mp4": (("stand", 1.0), ("forward", 3.0), ("stand", 2.0)),
    "003_backward.mp4": (("stand", 1.0), ("backward", 3.0), ("stand", 2.0)),
    "004_turn_left.mp4": (("stand", 1.0), ("turn_left", 3.0), ("stand", 2.0)),
    "005_turn_right.mp4": (("stand", 1.0), ("turn_right", 3.0), ("stand", 2.0)),
    "006_turn_then_forward.mp4": (
        ("stand", 1.0),
        ("turn_left", 3.0),
        ("stand", 2.0),
        ("forward", 3.0),
        ("stand", 2.0),
    ),
    "007_stop_recovery.mp4": (
        ("stand", 1.0),
        ("forward", 3.0),
        ("stand", 2.0),
    ),
}


def record_videos() -> None:
    import cv2

    MEDIA.mkdir(parents=True, exist_ok=True)
    fps = 30.0
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    for filename, schedule in VIDEO_SCHEDULES.items():
        runner = ScenarioRunner()
        renderer = mujoco.Renderer(runner.model, height=height, width=width)
        output = MEDIA / filename
        writer = cv2.VideoWriter(str(output), fourcc, fps, (width, height))
        if not writer.isOpened():
            renderer.close()
            raise RuntimeError(f"Could not open MP4 writer for {output}")
        next_frame_time = float(runner.data.time)
        try:
            for command, duration in schedule:
                steps = int(round(duration / runner.dt))
                for _ in range(steps):
                    runner.controller.set_command(command)
                    runner.controller.apply(runner.data)
                    mujoco.mj_step(runner.model, runner.data)
                    if runner.data.time + DT_EPSILON >= next_frame_time:
                        renderer.update_scene(runner.data, camera="side")
                        rgb = renderer.render()
                        writer.write(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
                        next_frame_time += 1.0 / fps
        finally:
            writer.release()
            renderer.close()
        print(f"recorded {output}")


class BasicLocomotionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.report = run_acceptance_suite(write_reports=True)

    def _assert_action_passes(self, name: str) -> None:
        self.assertEqual(self.report["actions"][name]["result"], "PASS")

    def test_stand_10s(self) -> None:
        self._assert_action_passes("stand_10s")

    def test_forward_3s(self) -> None:
        self._assert_action_passes("forward_3s")

    def test_backward_3s(self) -> None:
        self._assert_action_passes("backward_3s")

    def test_turn_left_3s(self) -> None:
        self._assert_action_passes("turn_left_3s")

    def test_turn_right_3s(self) -> None:
        self._assert_action_passes("turn_right_3s")

    def test_turn_then_forward(self) -> None:
        self._assert_action_passes("turn_then_forward")

    def test_stop_recovery(self) -> None:
        self._assert_action_passes("stop_recovery")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true", help="record the seven fixed-camera MP4 files")
    args = parser.parse_args()
    report = run_acceptance_suite(write_reports=True)
    if args.record:
        record_videos()
    raise SystemExit(
        0 if all(value == "PASS" for value in report["summary"].values()) else 1
    )
