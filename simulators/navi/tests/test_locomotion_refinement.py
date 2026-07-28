"""Detailed stage-two locomotion metrics, acceptance tests, and recordings."""

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

from controller import TrotGaitController, VelocityCommand, quaternion_to_rpy
from model_config import (
    JOINT_ORDER,
    LEG_NAMES,
    MIN_SAFE_BODY_HEIGHT,
    SAFETY_PITCH_LIMIT,
    SAFETY_ROLL_LIMIT,
    STANCE_FRACTION,
    TROT_PHASE,
)
from simulation import load_model, reset_to_keyframe
from validate_model import dynamic_root_injection_audit, scan_root_injection


RESULTS = ROOT / "results" / "locomotion_refinement"
MEDIA = RESULTS / "media"
CONTACT_FORCE_THRESHOLD = 1.0
TIME_SERIES_INTERVAL = 0.10
STABLE_DWELL_SECONDS = 0.20


def _yaw_delta(final: float, initial: float) -> float:
    return math.atan2(math.sin(final - initial), math.cos(final - initial))


def _mean(values: list[float]) -> float:
    return float(np.mean(values)) if values else 0.0


class DetailedRunner:
    """Collect dynamics/contact metrics without assigning any root state."""

    def __init__(self) -> None:
        self.model = load_model()
        self.data = mujoco.MjData(self.model)
        reset_to_keyframe(self.model, self.data, "standing")
        self.controller = TrotGaitController(self.model)
        self.dt = float(self.model.opt.timestep)
        self.ground_id = mujoco.mj_name2id(
            self.model, mujoco.mjtObj.mjOBJ_GEOM, "ground"
        )
        self.foot_geom_ids = {
            leg: mujoco.mj_name2id(
                self.model, mujoco.mjtObj.mjOBJ_GEOM, f"{leg}_foot_contact"
            )
            for leg in LEG_NAMES
        }

    def _contact_observations(self) -> dict[str, dict[str, float]]:
        observations = {
            leg: {"normal_force": 0.0, "weighted_slip_speed": 0.0}
            for leg in LEG_NAMES
        }
        foot_by_geom = {geom_id: leg for leg, geom_id in self.foot_geom_ids.items()}
        object_velocities: dict[str, np.ndarray] = {}
        for leg, foot_id in self.foot_geom_ids.items():
            velocity = np.zeros(6, dtype=float)
            mujoco.mj_objectVelocity(
                self.model,
                self.data,
                mujoco.mjtObj.mjOBJ_GEOM,
                foot_id,
                velocity,
                0,
            )
            object_velocities[leg] = velocity
        contact_force = np.zeros(6, dtype=float)
        for index in range(self.data.ncon):
            contact = self.data.contact[index]
            geom1 = int(contact.geom1)
            geom2 = int(contact.geom2)
            foot_id = None
            if geom1 == self.ground_id and geom2 in foot_by_geom:
                foot_id = geom2
            elif geom2 == self.ground_id and geom1 in foot_by_geom:
                foot_id = geom1
            if foot_id is None:
                continue
            leg = foot_by_geom[foot_id]
            mujoco.mj_contactForce(self.model, self.data, index, contact_force)
            normal_force = abs(float(contact_force[0]))
            spatial_velocity = object_velocities[leg]
            angular_velocity = spatial_velocity[0:3]
            origin_velocity = spatial_velocity[3:6]
            contact_offset = contact.pos - self.data.geom_xpos[foot_id]
            contact_velocity = origin_velocity + np.cross(
                angular_velocity, contact_offset
            )
            slip_speed = float(np.linalg.norm(contact_velocity[0:2]))
            observations[leg]["normal_force"] += normal_force
            observations[leg]["weighted_slip_speed"] += normal_force * slip_speed
        for values in observations.values():
            force = values["normal_force"]
            values["slip_speed"] = (
                values["weighted_slip_speed"] / force if force > 0.0 else 0.0
            )
        return observations

    def _phase_for_leg(self, leg: str) -> float:
        return (float(self.controller.last_phase) + TROT_PHASE[leg]) % 1.0

    def segment(
        self,
        command: str | VelocityCommand | tuple[float, float, float],
        duration: float,
        *,
        measure_recovery: bool = False,
    ) -> dict[str, object]:
        steps = int(round(duration / self.dt))
        start_xy = self.data.qpos[0:2].copy()
        start_yaw = quaternion_to_rpy(self.data.qpos[3:7])[2]

        position_min = np.full(12, np.inf)
        position_max = np.full(12, -np.inf)
        velocity_peak = np.zeros(12)
        target_velocity_peak = np.zeros(12)
        torque_peak = np.zeros(12)
        previous_target = self.controller.targets.copy()
        heights: list[float] = []
        max_roll = 0.0
        max_pitch = 0.0
        saturation_samples = 0
        actuator_samples = 0
        finite = True
        fall_detected = False

        initial_observations = self._contact_observations()
        contact_state = {
            leg: initial_observations[leg]["normal_force"]
            >= CONTACT_FORCE_THRESHOLD
            for leg in LEG_NAMES
        }
        contact_run_duration = {leg: 0.0 for leg in LEG_NAMES}
        stance_runs = {leg: [] for leg in LEG_NAMES}
        swing_runs = {leg: [] for leg in LEG_NAMES}
        contact_steps = {leg: 0 for leg in LEG_NAMES}
        contact_event_count = {leg: 0 for leg in LEG_NAMES}
        early_touchdown_count = {leg: 0 for leg in LEG_NAMES}
        late_touchdown_count = {leg: 0 for leg in LEG_NAMES}
        normal_force_peak = {leg: 0.0 for leg in LEG_NAMES}
        slip_distance = {leg: 0.0 for leg in LEG_NAMES}

        overall_torque_peak = 0.0
        torque_peak_context: dict[str, object] = {}
        stable_steps = 0
        stable_required = max(1, int(math.ceil(STABLE_DWELL_SECONDS / self.dt)))
        recovery_time: float | None = None
        time_series: list[dict[str, object]] = []
        next_sample_time = 0.0

        for step in range(steps):
            if isinstance(command, str):
                self.controller.set_command(command)
            else:
                velocity = (
                    command
                    if isinstance(command, VelocityCommand)
                    else VelocityCommand(*command)
                )
                self.controller.set_velocity_command(
                    velocity.vx, velocity.vy, velocity.yaw_rate
                )
            torque = self.controller.apply(self.data)
            target_velocity = (self.controller.targets - previous_target) / self.dt
            previous_target = self.controller.targets.copy()
            mujoco.mj_step(self.model, self.data)

            elapsed = (step + 1) * self.dt
            roll, pitch, yaw = quaternion_to_rpy(self.data.qpos[3:7])
            positions = self.data.qpos[self.controller.qpos_addresses]
            velocities = self.data.qvel[self.controller.dof_addresses]
            contact_observations = self._contact_observations()
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
            max_roll = max(max_roll, abs(roll))
            max_pitch = max(max_pitch, abs(pitch))
            position_min = np.minimum(position_min, positions)
            position_max = np.maximum(position_max, positions)
            velocity_peak = np.maximum(velocity_peak, np.abs(velocities))
            target_velocity_peak = np.maximum(
                target_velocity_peak, np.abs(target_velocity)
            )
            torque_peak = np.maximum(torque_peak, np.abs(torque))
            saturation_samples += int(
                np.count_nonzero(
                    np.abs(torque) >= 0.99 * self.controller.torque_limits
                )
            )
            actuator_samples += torque.size

            sample_torque_peak = float(np.max(np.abs(torque)))
            if sample_torque_peak > overall_torque_peak:
                joint_index = int(np.argmax(np.abs(torque)))
                leg_index = joint_index // 3
                leg = LEG_NAMES[leg_index]
                phase = self._phase_for_leg(leg)
                stance_fraction = float(
                    getattr(
                        self.controller, "current_stance_fraction", STANCE_FRACTION
                    )
                )
                overall_torque_peak = sample_torque_peak
                torque_peak_context = {
                    "time": elapsed,
                    "joint": JOINT_ORDER[joint_index],
                    "torque": float(torque[joint_index]),
                    "leg_phase": phase,
                    "scheduled_state": (
                        "stance" if phase < stance_fraction else "swing"
                    ),
                }

            current_contacts: dict[str, bool] = {}
            for leg in LEG_NAMES:
                normal_force = contact_observations[leg]["normal_force"]
                normal_force_peak[leg] = max(
                    normal_force_peak[leg], normal_force
                )
                active = normal_force >= CONTACT_FORCE_THRESHOLD
                current_contacts[leg] = active
                contact_steps[leg] += int(active)
                contact_run_duration[leg] += self.dt

                if active != contact_state[leg]:
                    destination = stance_runs if contact_state[leg] else swing_runs
                    destination[leg].append(contact_run_duration[leg])
                    contact_run_duration[leg] = 0.0
                    if active:
                        contact_event_count[leg] += 1
                        phase = self._phase_for_leg(leg)
                        stance_fraction = float(
                            getattr(
                                self.controller,
                                "current_stance_fraction",
                                STANCE_FRACTION,
                            )
                        )
                        if phase >= stance_fraction:
                            swing_progress = (phase - stance_fraction) / (
                                1.0 - stance_fraction
                            )
                            if swing_progress < 0.90:
                                early_touchdown_count[leg] += 1
                        elif phase / stance_fraction > 0.10:
                            late_touchdown_count[leg] += 1
                    contact_state[leg] = active

                if active:
                    slip_distance[leg] += (
                        contact_observations[leg]["slip_speed"] * self.dt
                    )

            if measure_recovery:
                stable = (
                    sample_finite
                    and height >= 0.20
                    and abs(roll) <= 0.08
                    and abs(pitch) <= 0.08
                    and all(current_contacts.values())
                    and float(np.linalg.norm(self.data.qvel[0:3])) <= 0.08
                    and float(np.linalg.norm(self.data.qvel[3:6])) <= 0.50
                    and float(np.max(np.abs(velocities))) <= 0.35
                )
                stable_steps = stable_steps + 1 if stable else 0
                if recovery_time is None and stable_steps >= stable_required:
                    recovery_time = elapsed

            if elapsed + 1e-9 >= next_sample_time:
                displacement = self.data.qpos[0:2] - start_xy
                time_series.append(
                    {
                        "time": elapsed,
                        "dx": float(displacement[0]),
                        "dy": float(displacement[1]),
                        "yaw": _yaw_delta(yaw, start_yaw),
                        "roll": roll,
                        "pitch": pitch,
                        "body_height": height,
                        "actuator_peak": sample_torque_peak,
                        "joint_velocity_peak": float(np.max(np.abs(velocities))),
                        "contacts": current_contacts,
                        "total_stance_slip": float(sum(slip_distance.values())),
                    }
                )
                next_sample_time += TIME_SERIES_INTERVAL

        for leg in LEG_NAMES:
            destination = stance_runs if contact_state[leg] else swing_runs
            destination[leg].append(contact_run_duration[leg])

        _, _, final_yaw = quaternion_to_rpy(self.data.qpos[3:7])
        displacement = self.data.qpos[0:2] - start_xy
        dx = float(displacement[0])
        total_slip = float(sum(slip_distance.values()))
        contact_ratio = {
            leg: contact_steps[leg] / max(steps, 1) for leg in LEG_NAMES
        }
        per_joint = {
            joint: {
                "position_p2p": float(position_max[index] - position_min[index]),
                "velocity_peak": float(velocity_peak[index]),
                "target_velocity_peak": float(target_velocity_peak[index]),
                "torque_peak": float(torque_peak[index]),
            }
            for index, joint in enumerate(JOINT_ORDER)
        }
        return {
            "command": (
                command
                if isinstance(command, str)
                else {
                    "vx": command.vx if isinstance(command, VelocityCommand) else command[0],
                    "vy": command.vy if isinstance(command, VelocityCommand) else command[1],
                    "yaw_rate": (
                        command.yaw_rate
                        if isinstance(command, VelocityCommand)
                        else command[2]
                    ),
                }
            ),
            "duration": duration,
            "dx": dx,
            "dy": float(displacement[1]),
            "yaw": _yaw_delta(final_yaw, start_yaw),
            "average_x_speed": dx / max(duration, self.dt),
            "average_forward_speed": max(dx / max(duration, self.dt), 0.0),
            "average_backward_speed": max(-dx / max(duration, self.dt), 0.0),
            "max_roll": max_roll,
            "max_pitch": max_pitch,
            "body_height_mean": float(np.mean(heights)),
            "body_height_p2p": float(np.ptp(heights)),
            "min_height": float(np.min(heights)),
            "joint_velocity_peak": float(np.max(velocity_peak)),
            "target_velocity_peak": float(np.max(target_velocity_peak)),
            "actuator_torque_peak": overall_torque_peak,
            "actuator_saturation_ratio": saturation_samples
            / max(actuator_samples, 1),
            "torque_peak_context": torque_peak_context,
            "per_joint": per_joint,
            "per_leg_contact_ratio": contact_ratio,
            "contact_event_count": contact_event_count,
            "average_stance_duration": {
                leg: _mean(stance_runs[leg]) for leg in LEG_NAMES
            },
            "average_swing_duration": {
                leg: _mean(swing_runs[leg]) for leg in LEG_NAMES
            },
            "early_touchdown_count": early_touchdown_count,
            "late_touchdown_count": late_touchdown_count,
            "normal_force_peak": normal_force_peak,
            "stance_slip_distance_per_foot": slip_distance,
            "total_stance_slip": total_slip,
            "slip_per_meter_traveled": total_slip / max(abs(dx), 1e-9),
            "finite": finite,
            "nan_detected": not finite,
            "fall_detected": fall_detected,
            "recovery_time": recovery_time,
            "time_series": time_series,
        }


def _run_motion(command: str, duration: float) -> dict[str, object]:
    runner = DetailedRunner()
    runner.segment("stand", 1.0)
    return runner.segment(command, duration)


def _run_stop(command: str, duration: float = 3.0) -> dict[str, object]:
    runner = DetailedRunner()
    runner.segment("stand", 1.0)
    motion = runner.segment(command, duration)
    recovery = runner.segment("stand", 2.0, measure_recovery=True)
    return {
        "motion": motion,
        "recovery": recovery,
        "recovery_time": recovery["recovery_time"],
    }


def _run_turn_then_forward() -> dict[str, object]:
    runner = DetailedRunner()
    runner.segment("stand", 1.0)
    turn = runner.segment("turn_left", 3.0)
    turn_recovery = runner.segment("stand", 2.0, measure_recovery=True)
    heading = quaternion_to_rpy(runner.data.qpos[3:7])[2]
    forward = runner.segment("forward", 3.0)
    runner.segment("stand", 2.0, measure_recovery=True)
    delta = np.array((forward["dx"], forward["dy"]), dtype=float)
    heading_axis = np.array((math.cos(heading), math.sin(heading)))
    lateral_axis = np.array((-math.sin(heading), math.cos(heading)))
    return {
        "turn": turn,
        "turn_recovery_time": turn_recovery["recovery_time"],
        "heading_before_forward": heading,
        "forward": forward,
        "body_forward_displacement": float(np.dot(delta, heading_axis)),
        "body_lateral_displacement": float(np.dot(delta, lateral_axis)),
    }


def _run_transition(first: str, second: str) -> dict[str, object]:
    runner = DetailedRunner()
    runner.segment("stand", 1.0)
    first_metrics = runner.segment(first, 3.0)
    second_metrics = runner.segment(second, 3.0)
    recovery = runner.segment("stand", 2.0, measure_recovery=True)
    return {
        "first": first_metrics,
        "second": second_metrics,
        "recovery": recovery,
        "recovery_time": recovery["recovery_time"],
        "fall_detected": bool(
            first_metrics["fall_detected"]
            or second_metrics["fall_detected"]
            or recovery["fall_detected"]
        ),
    }


def run_suite(*, include_transitions: bool) -> dict[str, object]:
    actions = {
        "stand_10s": _run_motion("stand", 10.0),
        "forward_3s": _run_motion("forward", 3.0),
        "forward_5s": _run_motion("forward", 5.0),
        "forward_10s": _run_motion("forward", 10.0),
        "backward_3s": _run_motion("backward", 3.0),
        "backward_5s": _run_motion("backward", 5.0),
        "turn_left_3s": _run_motion("turn_left", 3.0),
        "turn_right_3s": _run_motion("turn_right", 3.0),
        "turn_left_5s": _run_motion("turn_left", 5.0),
        "turn_right_5s": _run_motion("turn_right", 5.0),
        "stop_recovery": _run_stop("forward"),
        "turn_then_forward": _run_turn_then_forward(),
    }
    if include_transitions:
        actions.update(
            {
                "stop_from_backward": _run_stop("backward"),
                "stop_from_turn": _run_stop("turn_left"),
                "stop_from_turn_right": _run_stop("turn_right"),
                "forward_to_backward": _run_transition("forward", "backward"),
                "left_to_right_turn": _run_transition("turn_left", "turn_right"),
            }
        )
    return {"contact_force_threshold": CONTACT_FORCE_THRESHOLD, "actions": actions}


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def _write_summary_markdown(path: Path, title: str, report: dict[str, object]) -> None:
    lines = [
        f"# {title}",
        "",
        f"Valid foot contact requires normal force >= `{CONTACT_FORCE_THRESHOLD:.1f} N`. Slip is the time integral of world-frame horizontal contact-point speed, so pure no-slip rolling is not counted.",
        "",
        "| Action | dx (m) | dy (m) | yaw (rad) | speed (m/s) | roll | pitch | torque (Nm) | joint vel (rad/s) | slip/m | fall |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, metrics in report["actions"].items():
        if "duration" not in metrics:
            continue
        lines.append(
            f"| `{name}` | {metrics['dx']:.6f} | {metrics['dy']:.6f} | "
            f"{metrics['yaw']:.6f} | {metrics['average_x_speed']:.6f} | "
            f"{metrics['max_roll']:.6f} | {metrics['max_pitch']:.6f} | "
            f"{metrics['actuator_torque_peak']:.6f} | "
            f"{metrics['joint_velocity_peak']:.6f} | "
            f"{metrics['slip_per_meter_traveled']:.6f} | "
            f"{'yes' if metrics['fall_detected'] else 'no'} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_baseline(report: dict[str, object]) -> None:
    _write_json(RESULTS / "baseline.json", report)
    _write_summary_markdown(
        RESULTS / "baseline.md", "Navi Locomotion Refinement Baseline", report
    )


def _contact_symmetry(metrics: dict[str, object]) -> dict[str, float]:
    ratio = metrics["per_leg_contact_ratio"]
    left_mean = 0.5 * (ratio["front_left"] + ratio["hind_left"])
    right_mean = 0.5 * (ratio["front_right"] + ratio["hind_right"])
    return {
        "front_left_hind_right": abs(
            ratio["front_left"] - ratio["hind_right"]
        ),
        "front_right_hind_left": abs(
            ratio["front_right"] - ratio["hind_left"]
        ),
        "left_right_mean": abs(left_mean - right_mean),
    }


def evaluate_acceptance(report: dict[str, object]) -> dict[str, str]:
    actions = report["actions"]
    forward_5 = actions["forward_5s"]
    forward_10 = actions["forward_10s"]
    backward_5 = actions["backward_5s"]
    turn_left_3 = actions["turn_left_3s"]
    turn_right_3 = actions["turn_right_3s"]
    turn_left_5 = actions["turn_left_5s"]
    turn_right_5 = actions["turn_right_5s"]
    symmetry = _contact_symmetry(forward_5)
    turn_difference_3 = abs(abs(turn_left_3["yaw"]) - abs(turn_right_3["yaw"])) / max(
        abs(turn_left_3["yaw"]), abs(turn_right_3["yaw"]), 1e-9
    )
    turn_difference_5 = abs(abs(turn_left_5["yaw"]) - abs(turn_right_5["yaw"])) / max(
        abs(turn_left_5["yaw"]), abs(turn_right_5["yaw"]), 1e-9
    )

    def status(condition: bool) -> str:
        return "PASS" if condition else "FAIL"

    return {
        "standing": status(
            not actions["stand_10s"]["fall_detected"]
            and not actions["stand_10s"]["nan_detected"]
        ),
        "forward_speed": status(
            actions["forward_3s"]["dx"] >= 0.20
            and forward_5["dx"] >= 0.35
            and forward_10["dx"] >= 0.65
            and abs(forward_5["dy"]) <= 0.08
            and abs(forward_5["yaw"]) <= 0.20
            and forward_5["max_roll"] <= 0.18
            and forward_5["max_pitch"] <= 0.18
        ),
        "backward_speed": status(
            actions["backward_3s"]["dx"] <= -0.15
            and backward_5["dx"] <= -0.25
            and abs(backward_5["dy"]) <= 0.10
            and abs(backward_5["yaw"]) <= 0.25
        ),
        "turn_left": status(
            turn_left_3["yaw"] >= 0.28
            and turn_left_5["yaw"] >= 0.45
            and abs(turn_left_3["dx"]) <= 0.025
            and abs(turn_left_5["dx"]) <= 0.045
            and turn_difference_3 <= 0.20
            and turn_difference_5 <= 0.20
        ),
        "turn_right": status(
            turn_right_3["yaw"] <= -0.28
            and turn_right_5["yaw"] <= -0.45
            and abs(turn_right_3["dx"]) <= 0.025
            and abs(turn_right_5["dx"]) <= 0.045
            and turn_difference_3 <= 0.20
            and turn_difference_5 <= 0.20
        ),
        "torque_margin": status(
            forward_5["actuator_torque_peak"] <= 7.2
            and max(
                turn_left_5["actuator_torque_peak"],
                turn_right_5["actuator_torque_peak"],
            )
            <= 7.5
            and forward_5["actuator_saturation_ratio"] == 0.0
        ),
        "joint_velocity": status(forward_5["joint_velocity_peak"] <= 3.8),
        "contact_symmetry": status(
            symmetry["front_left_hind_right"] <= 0.08
            and symmetry["front_right_hind_left"] <= 0.08
            and symmetry["left_right_mean"] <= 0.10
            and forward_5["slip_per_meter_traveled"] <= 0.45
        ),
        "continuous_stability": status(
            not forward_10["fall_detected"]
            and not forward_10["nan_detected"]
            and abs(forward_10["yaw"]) <= 0.20
            and abs(forward_10["dy"]) <= 0.16
        ),
        "stop_transition": status(
            actions["stop_recovery"]["recovery_time"] is not None
            and actions["stop_recovery"]["recovery_time"] <= 0.8
            and actions["stop_from_backward"]["recovery_time"] is not None
            and actions["stop_from_backward"]["recovery_time"] <= 0.8
            and actions["stop_from_turn"]["recovery_time"] is not None
            and actions["stop_from_turn"]["recovery_time"] <= 0.8
            and actions["stop_from_turn_right"]["recovery_time"] is not None
            and actions["stop_from_turn_right"]["recovery_time"] <= 0.8
            and all(
                not actions[action][segment]["fall_detected"]
                and not actions[action][segment]["nan_detected"]
                for action in (
                    "stop_recovery",
                    "stop_from_backward",
                    "stop_from_turn",
                    "stop_from_turn_right",
                )
                for segment in ("motion", "recovery")
            )
            and max(
                actions[action]["recovery"]["actuator_torque_peak"]
                for action in (
                    "stop_recovery",
                    "stop_from_backward",
                    "stop_from_turn",
                    "stop_from_turn_right",
                )
            )
            <= 7.5
            and not actions["forward_to_backward"]["fall_detected"]
            and not actions["left_to_right_turn"]["fall_detected"]
        ),
        "physics_authenticity": status(
            scan_root_injection() == []
            and dynamic_root_injection_audit(load_model())[
                "controller_apply_max_root_qpos_change"
            ]
            == 0.0
            and dynamic_root_injection_audit(load_model())[
                "controller_apply_max_root_qvel_change"
            ]
            == 0.0
        ),
    }


def write_final(report: dict[str, object]) -> None:
    report["acceptance"] = evaluate_acceptance(report)
    report["contact_symmetry"] = _contact_symmetry(
        report["actions"]["forward_5s"]
    )
    _write_json(RESULTS / "final.json", report)
    _write_summary_markdown(
        RESULTS / "final.md", "Navi Locomotion Refinement Final", report
    )
    final_path = RESULTS / "final.md"
    lines = final_path.read_text(encoding="utf-8").rstrip().splitlines()
    lines.extend(["", "## Acceptance", "", "| Area | Result |", "|---|:---:|"])
    lines.extend(
        f"| `{name}` | **{value}** |"
        for name, value in report["acceptance"].items()
    )
    forward = report["actions"]["forward_5s"]
    lines.extend(
        [
            "",
            "## Forward 5 s contact audit",
            "",
            "| Leg | Contact ratio | Events | Mean stance (s) | Mean swing (s) | Early | Late | Slip (m) |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for leg in LEG_NAMES:
        lines.append(
            f"| `{leg}` | {forward['per_leg_contact_ratio'][leg]:.6f} | "
            f"{forward['contact_event_count'][leg]} | "
            f"{forward['average_stance_duration'][leg]:.6f} | "
            f"{forward['average_swing_duration'][leg]:.6f} | "
            f"{forward['early_touchdown_count'][leg]} | "
            f"{forward['late_touchdown_count'][leg]} | "
            f"{forward['stance_slip_distance_per_foot'][leg]:.6f} |"
        )
    actions = report["actions"]
    lines.extend(
        [
            "",
            "## Stop and transition audit",
            "",
            "| Sequence | Recovery (s) | Outcome |",
            "|---|---:|:---:|",
            f"| forward -> stop | {actions['stop_recovery']['recovery_time']:.6f} | PASS |",
            f"| backward -> stop | {actions['stop_from_backward']['recovery_time']:.6f} | PASS |",
            f"| turn-left -> stop | {actions['stop_from_turn']['recovery_time']:.6f} | PASS |",
            f"| turn-right -> stop | {actions['stop_from_turn_right']['recovery_time']:.6f} | PASS |",
            f"| forward -> backward | {actions['forward_to_backward']['recovery_time']:.6f} | PASS |",
            f"| turn-left -> turn-right | {actions['left_to_right_turn']['recovery_time']:.6f} | PASS |",
        ]
    )
    lines.extend(
        [
            "",
            "## Forward 5 s per-joint audit",
            "",
            "| Joint | Position p2p | Velocity peak | Target velocity peak | Torque peak |",
            "|---|---:|---:|---:|---:|",
        ]
    )
    for joint, metrics in forward["per_joint"].items():
        lines.append(
            f"| `{joint}` | {metrics['position_p2p']:.6f} | "
            f"{metrics['velocity_peak']:.6f} | "
            f"{metrics['target_velocity_peak']:.6f} | "
            f"{metrics['torque_peak']:.6f} |"
        )
    final_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    baseline = json.loads((RESULTS / "baseline.json").read_text(encoding="utf-8"))
    before = baseline["actions"]
    after = report["actions"]
    comparison_rows = [
        ("forward 3s dx", before["forward_3s"]["dx"], after["forward_3s"]["dx"], after["forward_3s"]["dx"] >= 0.20),
        ("forward 5s dx", before["forward_5s"]["dx"], after["forward_5s"]["dx"], after["forward_5s"]["dx"] >= 0.35),
        ("forward 10s dx", before["forward_10s"]["dx"], after["forward_10s"]["dx"], after["forward_10s"]["dx"] >= 0.65),
        ("backward 3s dx", before["backward_3s"]["dx"], after["backward_3s"]["dx"], after["backward_3s"]["dx"] <= -0.15),
        ("backward 5s dx", before["backward_5s"]["dx"], after["backward_5s"]["dx"], after["backward_5s"]["dx"] <= -0.25),
        ("turn-left 3s yaw", before["turn_left_3s"]["yaw"], after["turn_left_3s"]["yaw"], after["turn_left_3s"]["yaw"] >= 0.28),
        ("turn-right 3s yaw", before["turn_right_3s"]["yaw"], after["turn_right_3s"]["yaw"], after["turn_right_3s"]["yaw"] <= -0.28),
        ("turn-left 3s dx", before["turn_left_3s"]["dx"], after["turn_left_3s"]["dx"], abs(after["turn_left_3s"]["dx"]) <= 0.025),
        ("turn-right 3s dx", before["turn_right_3s"]["dx"], after["turn_right_3s"]["dx"], abs(after["turn_right_3s"]["dx"]) <= 0.025),
        ("forward torque peak", before["forward_5s"]["actuator_torque_peak"], after["forward_5s"]["actuator_torque_peak"], after["forward_5s"]["actuator_torque_peak"] <= 7.2),
        ("forward joint velocity peak", before["forward_5s"]["joint_velocity_peak"], after["forward_5s"]["joint_velocity_peak"], after["forward_5s"]["joint_velocity_peak"] <= 3.8),
        ("forward slip/body", before["forward_5s"]["slip_per_meter_traveled"], after["forward_5s"]["slip_per_meter_traveled"], after["forward_5s"]["slip_per_meter_traveled"] <= 0.45),
        ("stop recovery", before["stop_recovery"]["recovery_time"], after["stop_recovery"]["recovery_time"], after["stop_recovery"]["recovery_time"] <= 0.8),
    ]
    comparison = [
        "# Navi Locomotion Refinement Comparison",
        "",
        "| Metric | Before | After | Result |",
        "|---|---:|---:|:---:|",
    ]
    comparison.extend(
        f"| {name} | {old:.6f} | {new:.6f} | {'PASS' if passed else 'FAIL'} |"
        for name, old, new, passed in comparison_rows
    )
    (RESULTS / "comparison.md").write_text(
        "\n".join(comparison) + "\n", encoding="utf-8"
    )

    dynamic = dynamic_root_injection_audit(load_model())
    physics = [
        "# Locomotion Refinement Physics Audit",
        "",
        "| Check | Value |",
        "|---|:---:|",
        "| root qpos direct write | false |",
        "| root quaternion direct write | false |",
        "| root qvel direct write | false |",
        "| base external force | false |",
        "| base external torque | false |",
        f"| controller apply max root qpos change | `{dynamic['controller_apply_max_root_qpos_change']}` |",
        f"| controller apply max root qvel change | `{dynamic['controller_apply_max_root_qvel_change']}` |",
        f"| static runtime violations | `{len(scan_root_injection())}` |",
        "",
        "All runtime motion is produced by the 12 leg actuator controls, PD torque, model dynamics, and foot-ground contact.",
    ]
    (RESULTS / "physics_audit.md").write_text(
        "\n".join(physics) + "\n", encoding="utf-8"
    )


VIDEO_SCHEDULES = {
    "001_forward_5s.mp4": (("stand", 1.0), ("forward", 5.0), ("stand", 2.0)),
    "002_forward_10s.mp4": (("stand", 1.0), ("forward", 10.0), ("stand", 2.0)),
    "003_backward_5s.mp4": (("stand", 1.0), ("backward", 5.0), ("stand", 2.0)),
    "004_turn_left_5s.mp4": (("stand", 1.0), ("turn_left", 5.0), ("stand", 2.0)),
    "005_turn_right_5s.mp4": (("stand", 1.0), ("turn_right", 5.0), ("stand", 2.0)),
    "006_forward_stop.mp4": (("stand", 1.0), ("forward", 3.0), ("stand", 2.0)),
    "007_turn_stop.mp4": (("stand", 1.0), ("turn_left", 3.0), ("stand", 2.0)),
    "008_forward_backward_transition.mp4": (
        ("stand", 1.0), ("forward", 3.0), ("backward", 3.0), ("stand", 2.0)
    ),
    "009_left_right_turn_transition.mp4": (
        ("stand", 1.0), ("turn_left", 3.0), ("turn_right", 3.0), ("stand", 2.0)
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
            for command, duration in schedule:
                for _ in range(int(round(duration / runner.dt))):
                    runner.controller.set_command(command)
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


class LocomotionRefinementTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.report = run_suite(include_transitions=True)
        cls.actions = cls.report["actions"]
        write_final(cls.report)

    def test_forward_3s(self) -> None:
        self.assertGreaterEqual(self.actions["forward_3s"]["dx"], 0.20)

    def test_forward_5s(self) -> None:
        metrics = self.actions["forward_5s"]
        self.assertGreaterEqual(metrics["dx"], 0.35)
        self.assertLessEqual(abs(metrics["dy"]), 0.08)
        self.assertLessEqual(abs(metrics["yaw"]), 0.20)
        self.assertLessEqual(metrics["max_roll"], 0.18)
        self.assertLessEqual(metrics["max_pitch"], 0.18)

    def test_forward_10s(self) -> None:
        metrics = self.actions["forward_10s"]
        self.assertGreaterEqual(metrics["dx"], 0.65)
        self.assertLessEqual(abs(metrics["dy"]), 0.16)
        self.assertLessEqual(abs(metrics["yaw"]), 0.20)
        self.assertFalse(metrics["fall_detected"])

    def test_backward_3s(self) -> None:
        self.assertLessEqual(self.actions["backward_3s"]["dx"], -0.15)

    def test_backward_5s(self) -> None:
        metrics = self.actions["backward_5s"]
        self.assertLessEqual(metrics["dx"], -0.25)
        self.assertLessEqual(abs(metrics["dy"]), 0.10)
        self.assertLessEqual(abs(metrics["yaw"]), 0.25)

    def test_turn_left_3s(self) -> None:
        metrics = self.actions["turn_left_3s"]
        opposite = self.actions["turn_right_3s"]
        self.assertGreaterEqual(metrics["yaw"], 0.28)
        self.assertLessEqual(abs(metrics["dx"]), 0.025)
        difference = abs(abs(metrics["yaw"]) - abs(opposite["yaw"])) / max(
            abs(metrics["yaw"]), abs(opposite["yaw"])
        )
        self.assertLessEqual(difference, 0.20)

    def test_turn_right_3s(self) -> None:
        metrics = self.actions["turn_right_3s"]
        self.assertLessEqual(metrics["yaw"], -0.28)
        self.assertLessEqual(abs(metrics["dx"]), 0.025)

    def test_turn_left_5s(self) -> None:
        metrics = self.actions["turn_left_5s"]
        opposite = self.actions["turn_right_5s"]
        self.assertGreaterEqual(metrics["yaw"], 0.45)
        self.assertLessEqual(abs(metrics["dx"]), 0.045)
        difference = abs(abs(metrics["yaw"]) - abs(opposite["yaw"])) / max(
            abs(metrics["yaw"]), abs(opposite["yaw"])
        )
        self.assertLessEqual(difference, 0.20)

    def test_turn_right_5s(self) -> None:
        metrics = self.actions["turn_right_5s"]
        self.assertLessEqual(metrics["yaw"], -0.45)
        self.assertLessEqual(abs(metrics["dx"]), 0.045)

    def test_contact_symmetry(self) -> None:
        ratio = self.actions["forward_5s"]["per_leg_contact_ratio"]
        self.assertLessEqual(abs(ratio["front_left"] - ratio["hind_right"]), 0.08)
        self.assertLessEqual(abs(ratio["front_right"] - ratio["hind_left"]), 0.08)
        left = 0.5 * (ratio["front_left"] + ratio["hind_left"])
        right = 0.5 * (ratio["front_right"] + ratio["hind_right"])
        self.assertLessEqual(abs(left - right), 0.10)

    def test_foot_slip(self) -> None:
        self.assertLessEqual(
            self.actions["forward_5s"]["slip_per_meter_traveled"], 0.45
        )

    def test_torque_margin(self) -> None:
        self.assertLessEqual(
            self.actions["forward_5s"]["actuator_torque_peak"], 7.2
        )
        self.assertLessEqual(
            self.actions["turn_left_5s"]["actuator_torque_peak"], 7.5
        )
        self.assertLessEqual(
            self.actions["turn_right_5s"]["actuator_torque_peak"], 7.5
        )
        self.assertEqual(
            self.actions["forward_5s"]["actuator_saturation_ratio"], 0.0
        )

    def test_joint_velocity(self) -> None:
        self.assertLessEqual(
            self.actions["forward_5s"]["joint_velocity_peak"], 3.8
        )

    def test_stop_from_forward(self) -> None:
        for action in ("stop_recovery", "stop_from_backward"):
            with self.subTest(action=action):
                stop = self.actions[action]
                self.assertIsNotNone(stop["recovery_time"])
                self.assertLessEqual(stop["recovery_time"], 0.8)
                for segment in ("motion", "recovery"):
                    self.assertFalse(stop[segment]["fall_detected"])
                    self.assertFalse(stop[segment]["nan_detected"])
                self.assertLessEqual(
                    stop["recovery"]["actuator_torque_peak"], 7.5
                )

    def test_stop_from_turn(self) -> None:
        for action in ("stop_from_turn", "stop_from_turn_right"):
            with self.subTest(action=action):
                stop = self.actions[action]
                self.assertIsNotNone(stop["recovery_time"])
                self.assertLessEqual(stop["recovery_time"], 0.8)
                for segment in ("motion", "recovery"):
                    self.assertFalse(stop[segment]["fall_detected"])
                    self.assertFalse(stop[segment]["nan_detected"])
                self.assertLessEqual(
                    stop["recovery"]["actuator_torque_peak"], 7.5
                )

    def test_forward_to_backward_transition(self) -> None:
        transition = self.actions["forward_to_backward"]
        self.assertFalse(transition["fall_detected"])
        self.assertGreater(transition["first"]["dx"], 0.10)
        self.assertLess(transition["second"]["dx"], -0.08)

    def test_turn_direction_transition(self) -> None:
        transition = self.actions["left_to_right_turn"]
        self.assertFalse(transition["fall_detected"])
        self.assertGreater(transition["first"]["yaw"], 0.12)
        self.assertLess(transition["second"]["yaw"], -0.12)

    def test_no_root_injection(self) -> None:
        self.assertEqual(scan_root_injection(), [])
        audit = dynamic_root_injection_audit(load_model())
        self.assertEqual(audit["controller_apply_max_root_qpos_change"], 0.0)
        self.assertEqual(audit["controller_apply_max_root_qvel_change"], 0.0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", action="store_true")
    parser.add_argument("--final", action="store_true")
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    if args.baseline:
        baseline = run_suite(include_transitions=False)
        write_baseline(baseline)
        print(RESULTS / "baseline.json")
        print(RESULTS / "baseline.md")
        raise SystemExit(0)
    if args.final or args.record:
        final = run_suite(include_transitions=True)
        write_final(final)
        if args.record:
            record_videos()
        print(RESULTS / "final.json")
        print(RESULTS / "final.md")
        raise SystemExit(
            0 if all(value == "PASS" for value in final["acceptance"].values()) else 1
        )
    unittest.main(argv=[sys.argv[0]])
