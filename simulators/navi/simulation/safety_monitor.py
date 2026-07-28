"""Safety checks derived from existing model/controller thresholds and tests."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import mujoco
import numpy as np

from model_config import (
    MIN_SAFE_BODY_HEIGHT,
    SAFETY_PITCH_LIMIT,
    SAFETY_ROLL_LIMIT,
)
from simulation.state_monitor import SimulationState


SAFETY_EVENT_CODES = {
    "NAN_STATE",
    "INF_STATE",
    "FALL_DETECTED",
    "BASE_HEIGHT_TOO_LOW",
    "BASE_HEIGHT_TOO_HIGH",
    "JOINT_LIMIT_EXCEEDED",
    "ACTUATOR_SATURATION",
    "LINEAR_SPEED_EXCEEDED",
    "ANGULAR_SPEED_EXCEEDED",
    "SIMULATION_TIMEOUT",
    "NO_MOTION_PROGRESS",
    "EXCESSIVE_SLIP",
    "MODEL_INSTABILITY",
}


@dataclass(frozen=True)
class SafetyEvent:
    event_code: str
    severity: str
    simulation_time: float
    command_id: str | None
    measured_value: Any
    threshold: Any
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SafetyMonitor:
    """Monitor state without altering model thresholds or controller gains."""

    max_body_height = 0.45
    max_linear_speed = 3.0
    max_angular_speed = 10.0
    max_root_step = 0.005
    instantaneous_slip_warning = 0.50

    def __init__(self, model: mujoco.MjModel, controller, max_simulation_time: float):
        self.model = model
        self.controller = controller
        self.max_simulation_time = float(max_simulation_time)
        self.events: list[SafetyEvent] = []
        self._seen: set[tuple[str | None, str]] = set()
        self._previous_position: np.ndarray | None = None

    def reset(self) -> None:
        self.events.clear()
        self._seen.clear()
        self._previous_position = None

    @property
    def fatal(self) -> bool:
        return any(event.severity == "fatal" for event in self.events)

    def check(self, state: SimulationState) -> list[SafetyEvent]:
        before = len(self.events)
        numeric = np.asarray(
            state.base_position
            + state.orientation_rpy
            + state.base_linear_velocity
            + state.base_angular_velocity
            + state.joint_positions
            + state.joint_velocities
            + state.actuator_controls,
            dtype=float,
        )
        if np.isnan(numeric).any():
            self.record("NAN_STATE", "fatal", state, True, False, "NaN detected in MuJoCo state")
        if np.isinf(numeric).any():
            self.record("INF_STATE", "fatal", state, True, False, "Inf detected in MuJoCo state")

        height = state.base_position[2]
        roll, pitch, _ = state.orientation_rpy
        if height < MIN_SAFE_BODY_HEIGHT:
            self.record(
                "BASE_HEIGHT_TOO_LOW", "fatal", state, height, MIN_SAFE_BODY_HEIGHT,
                "Base height is below the existing safety threshold",
            )
        if height > self.max_body_height:
            self.record(
                "BASE_HEIGHT_TOO_HIGH", "warning", state, height, self.max_body_height,
                "Base height exceeds the integration monitoring envelope",
            )
        if abs(roll) > SAFETY_ROLL_LIMIT or abs(pitch) > SAFETY_PITCH_LIMIT:
            self.record(
                "FALL_DETECTED", "fatal", state,
                {"roll": roll, "pitch": pitch},
                {"roll": SAFETY_ROLL_LIMIT, "pitch": SAFETY_PITCH_LIMIT},
                "Existing roll/pitch fall threshold exceeded",
            )

        for index, mapping in enumerate(self.controller.mappings):
            lower, upper = self.model.jnt_range[mapping.joint_id]
            value = state.joint_positions[index]
            if value < lower - 1e-4 or value > upper + 1e-4:
                self.record(
                    "JOINT_LIMIT_EXCEEDED", "fatal", state,
                    {"joint": mapping.name, "position": value},
                    {"lower": float(lower), "upper": float(upper)},
                    "Joint position exceeded the original model limit",
                )
                break
        if state.actuator_utilization >= 0.99:
            self.record(
                "ACTUATOR_SATURATION", "warning", state,
                state.actuator_utilization, 0.99,
                "Actuator command reached 99% of the existing torque limit",
            )
        linear_speed = float(np.linalg.norm(state.base_linear_velocity))
        angular_speed = float(np.linalg.norm(state.base_angular_velocity))
        if linear_speed > self.max_linear_speed:
            self.record(
                "LINEAR_SPEED_EXCEEDED", "warning", state,
                linear_speed, self.max_linear_speed,
                "Base linear speed exceeded the monitoring envelope",
            )
        if angular_speed > self.max_angular_speed:
            self.record(
                "ANGULAR_SPEED_EXCEEDED", "warning", state,
                angular_speed, self.max_angular_speed,
                "Base angular speed exceeded the monitoring envelope",
            )
        if state.simulation_time > self.max_simulation_time:
            self.record(
                "SIMULATION_TIMEOUT", "fatal", state,
                state.simulation_time, self.max_simulation_time,
                "Maximum simulation time exceeded",
            )
        if state.max_slip_speed > self.instantaneous_slip_warning:
            self.record(
                "EXCESSIVE_SLIP", "warning", state,
                state.max_slip_speed, self.instantaneous_slip_warning,
                "Contact-foot horizontal slip speed exceeded the reporting threshold",
            )
        position = np.asarray(state.base_position, dtype=float)
        if self._previous_position is not None:
            step = float(np.linalg.norm(position - self._previous_position))
            root_step_threshold = (
                0.012
                if state.controller_mode
                in {"ATHLETIC_RUNNING", "ACTION_RUNNING", "POSTURE_HOLD"}
                else self.max_root_step
            )
            if step > root_step_threshold:
                self.record(
                    "MODEL_INSTABILITY", "fatal", state,
                    step, root_step_threshold,
                    "Floating-base position changed excessively in one sampled step",
                )
        self._previous_position = position
        return self.events[before:]

    def record(
        self,
        code: str,
        severity: str,
        state: SimulationState,
        measured: Any,
        threshold: Any,
        message: str,
    ) -> None:
        if code not in SAFETY_EVENT_CODES:
            raise ValueError(f"Unknown safety event code: {code}")
        key = (state.current_command_id, code)
        if key in self._seen:
            return
        self._seen.add(key)
        self.events.append(
            SafetyEvent(
                event_code=code,
                severity=severity,
                simulation_time=state.simulation_time,
                command_id=state.current_command_id,
                measured_value=measured,
                threshold=threshold,
                message=message,
            )
        )
