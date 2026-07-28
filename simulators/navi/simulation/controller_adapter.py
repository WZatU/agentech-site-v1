"""The only boundary between SDK/IR semantics and the legacy controller."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import mujoco

from controller import TrotGaitController
from simulation.actions import ActionController, ActionProfile


@dataclass(frozen=True)
class AdapterMapping:
    controller_method: str
    controller_target: dict[str, float]
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "controller_method": self.controller_method,
            "controller_target": self.controller_target,
            **self.metadata,
        }


class ControllerAdapter:
    """Wrap the existing body-frame velocity controller without copying it."""

    sdk_turn_convention = "right_positive"
    controller_turn_convention = "left_positive"

    def __init__(self, model: mujoco.MjModel):
        self.controller = TrotGaitController(model)
        self.action_controller = ActionController(model)
        self.mode = "STAND"
        self.last_mapping: AdapterMapping | None = None

    def stand(self) -> AdapterMapping:
        self.action_controller.abort()
        self.controller.set_command("stand")
        self.mode = "STAND"
        self.last_mapping = AdapterMapping(
            "set_command",
            {"vx_mps": 0.0, "vy_mps": 0.0, "yaw_rate_rad_s": 0.0},
            {"controller_command": "stand"},
        )
        return self.last_mapping

    def stop(self) -> AdapterMapping:
        self.action_controller.abort()
        self.controller.set_velocity_command(0.0, 0.0, 0.0)
        self.controller.command_name = "stand"
        self.mode = "STOP_HOLD"
        self.last_mapping = AdapterMapping(
            "set_velocity_command",
            {"vx_mps": 0.0, "vy_mps": 0.0, "yaw_rate_rad_s": 0.0},
            {
                "stop_mapping": "zero_velocity_then_stand_hold",
                "active_action_cancelled": True,
                "persistent_lock": False,
            },
        )
        return self.last_mapping

    def emergency_stop(self) -> AdapterMapping:
        self.controller.set_velocity_command(0.0, 0.0, 0.0)
        self.action_controller.abort(damping=False)
        self.mode = "EMERGENCY_STOP"
        self.last_mapping = AdapterMapping(
            "zero_velocity_and_joint_pd_hold",
            {"vx_mps": 0.0, "vy_mps": 0.0, "yaw_rate_rad_s": 0.0},
            {
                "stop_mapping": "zero_velocity_and_joint_pd_hold",
                "hardware_equivalence": "partial",
                "physical_estop": False,
                "active_action_cancelled": True,
                "pending_action_queue_cleared": True,
                "persistent_lock": True,
                "explicit_recovery_required": True,
            },
        )
        return self.last_mapping

    def start_action(
        self,
        profile: ActionProfile,
        data: mujoco.MjData,
        sim_time: float,
        *,
        category: str,
    ) -> AdapterMapping:
        self.controller.set_velocity_command(0.0, 0.0, 0.0)
        self.action_controller.start(profile, data, sim_time)
        self.mode = (
            "ATHLETIC_RUNNING"
            if category == "athletics"
            else "POSTURE_HOLD"
            if category == "posture"
            else "ACTION_RUNNING"
        )
        self.last_mapping = AdapterMapping(
            "ActionController.start",
            {"vx_mps": 0.0, "vy_mps": 0.0, "yaw_rate_rad_s": 0.0},
            {
                "profile": profile.name,
                "profile_duration_s": profile.duration_s,
                "profile_source": profile.source,
                "control": "12_actuator_torque_PD",
                "direct_state_injection": False,
            },
        )
        return self.last_mapping

    def set_body_velocity(
        self,
        forward_mps: float,
        lateral_mps: float,
        sdk_yaw_rate_rad_s: float = 0.0,
    ) -> AdapterMapping:
        self.action_controller.abort()
        controller_yaw = -float(sdk_yaw_rate_rad_s)
        command = self.controller.set_velocity_command(
            float(forward_mps),
            float(lateral_mps),
            controller_yaw,
        )
        self.mode = "BODY_VELOCITY"
        metadata: dict[str, Any] = {
            "coordinate_frame": "body_flu",
            "sdk_direction_convention": self.sdk_turn_convention,
            "controller_direction_convention": self.controller_turn_convention,
            "sign_conversion_applied": bool(sdk_yaw_rate_rad_s),
        }
        if sdk_yaw_rate_rad_s:
            metadata.update({
                "sdk_yaw_value": float(sdk_yaw_rate_rad_s),
                "controller_yaw_value": float(command.yaw_rate),
                "conversion": "negated_at_backend_boundary",
            })
        self.last_mapping = AdapterMapping(
            "set_velocity_command",
            {
                "vx_mps": float(command.vx),
                "vy_mps": float(command.vy),
                "yaw_rate_rad_s": float(command.yaw_rate),
            },
            metadata,
        )
        return self.last_mapping

    def sdk_turn_rate_to_controller(self, sdk_yaw_rate_rad_s: float) -> float:
        return -float(sdk_yaw_rate_rad_s)

    def update(self, data: mujoco.MjData, sim_time: float | None = None):
        if self.mode in {
            "ACTION_RUNNING",
            "ATHLETIC_RUNNING",
            "POSTURE_HOLD",
            "EMERGENCY_STOP",
        }:
            return self.action_controller.update(
                data, float(data.time) if sim_time is None else float(sim_time)
            )
        return self.controller.apply(data)
