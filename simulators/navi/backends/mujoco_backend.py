"""Real MuJoCo backend for the first safe subset of Navi SDK methods."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import mujoco
import numpy as np

from backends.base import BackendCommandResult, BackendExecutionResult, SimulationBackend
from backends.capabilities import (
    BackendCapabilityEntry,
    BackendCapabilityRegistry,
    BackendCapabilityStatus,
)
from model_config import (
    MAX_BACKWARD_SPEED,
    MAX_FORWARD_SPEED,
    MAX_LATERAL_SPEED,
    MAX_YAW_RATE,
)
from simulation import load_model, reset_to_keyframe
from simulation.actions import ActionRegistry, SimulationActionHandle
from simulation.command_executor import CommandExecutor
from simulation.controller_adapter import ControllerAdapter
from simulation.orientation import angle_difference, quaternion_to_euler, wrap_angle, world_to_body
from simulation.query_provider import QueryProvider
from simulation.safety_monitor import SafetyMonitor
from simulation.state_monitor import SimulationState, StateMonitor
from simulation.trace_recorder import TraceRecorder
from translator.ir import SimulationCommand
from translator.scheduler import ScheduledCommand


CORE_DISPATCH_METHODS = {
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
    "sleep",
    "diagonal",
    "emergency_stop",
}


class MujocoBackend(SimulationBackend):
    name = "mujoco"
    controller_update_period = 0.001
    sample_period = 0.01
    render_period = 1.0 / 30.0
    stand_hold_duration = 0.5
    stop_hold_duration = 0.5
    turn_tolerance_rad = math.radians(2.0)

    def __init__(
        self,
        *,
        max_simulation_time: float = 300.0,
        viewer: bool = False,
        record_video: bool = False,
        video_path: str | Path | None = None,
        seed: int = 0,
        config_dir: str | Path | None = None,
    ):
        self.max_simulation_time = float(max_simulation_time)
        self.viewer_requested = bool(viewer)
        self.record_video = bool(record_video)
        self.video_path = Path(video_path) if video_path is not None else None
        self.seed = int(seed)
        self.config_dir = Path(config_dir).resolve() if config_dir else None
        self.capability_registry = BackendCapabilityRegistry.load(
            self.config_dir / "backend_capabilities.json"
            if self.config_dir
            else None
        )
        self.action_registry = ActionRegistry(
            self.config_dir / "action_profiles" / "full_sdk_profiles.json"
            if self.config_dir
            else None
        )
        self.model = load_model()
        self.data = mujoco.MjData(self.model)
        self.adapter = ControllerAdapter(self.model)
        self.state_monitor = StateMonitor(self.model, self.adapter.controller)
        self.trace_recorder = TraceRecorder()
        self.safety_monitor = SafetyMonitor(
            self.model, self.adapter.controller, self.max_simulation_time
        )
        self.query_provider = QueryProvider(
            tuple(mapping.name for mapping in self.adapter.controller.mappings)
        )
        self.execution_log: list[dict[str, Any]] = []
        self.query_results: list[dict[str, Any]] = []
        self.backend_mapping: list[dict[str, Any]] = []
        self.command_metrics: list[dict[str, Any]] = []
        self.command_results: list[BackendCommandResult] = []
        self.warnings: list[dict[str, Any]] = []
        self.current_command_id: str | None = None
        self.current_method: str | None = None
        self._last_sample_time = -math.inf
        self._last_render_time = -math.inf
        self._viewer = None
        self._renderer = None
        self._video_frames: list[np.ndarray] = []
        self.runtime_state = "INITIAL"
        self.reset()

    @property
    def physics_timestep(self) -> float:
        return float(self.model.opt.timestep)

    def reset(self) -> None:
        np.random.seed(self.seed)
        reset_to_keyframe(self.model, self.data, "standing")
        self.adapter = ControllerAdapter(self.model)
        self.adapter.stand()
        self.state_monitor = StateMonitor(self.model, self.adapter.controller)
        self.state_monitor.reset()
        self.trace_recorder.reset()
        self.safety_monitor = SafetyMonitor(
            self.model, self.adapter.controller, self.max_simulation_time
        )
        self.execution_log.clear()
        self.query_results.clear()
        self.backend_mapping.clear()
        self.command_metrics.clear()
        self.command_results.clear()
        self.warnings.clear()
        self.current_command_id = None
        self.current_method = None
        self.runtime_state = "STANDING"
        self._last_sample_time = -math.inf
        self._last_render_time = -math.inf
        initial = self._sample(force=True)
        self.safety_monitor.check(initial)
        self._ensure_visual_resources()

    def execute(self, commands: tuple[ScheduledCommand, ...]) -> BackendExecutionResult:
        return CommandExecutor(self).execute(commands)

    def apply_command(self, command: SimulationCommand) -> BackendCommandResult:
        scheduled = ScheduledCommand(
            command=command,
            start_time=float(self.data.time),
            end_time=float(self.data.time) + (command.duration or 0.0),
            blocking=True if command.blocking is None else command.blocking,
            scheduling_assumption="direct_backend_call",
            dependency=None,
        )
        return self.execute_scheduled(scheduled)

    def execute_scheduled(self, scheduled: ScheduledCommand) -> BackendCommandResult:
        command = scheduled.command
        capability = (
            None
            if command.canonical_method == "sleep"
            else self.capability_registry.get(command.canonical_method)
        )
        self.current_command_id = command.command_id
        self.current_method = command.canonical_method
        start_state = self._sample(force=True)
        trace_start = len(self.trace_recorder.rows) - 1
        start_time = float(self.data.time)
        self.execution_log.append({
            "event": "command_started",
            "command_id": command.command_id,
            "method": command.canonical_method,
            "ir_sequence_index": command.sequence_index,
            "simulation_time": start_time,
            "sdk_parameters": command.parameters,
            "scheduling_assumption": scheduled.scheduling_assumption,
            "backend_capability_status": (
                capability.status.value if capability else "IMPLEMENTED"
            ),
        })
        structured_sensing_gap = (
            capability is not None
            and capability.category == "sensing"
            and capability.status
            in {
                BackendCapabilityStatus.HARDWARE_ONLY,
                BackendCapabilityStatus.UNAVAILABLE_IN_MUJOCO,
            }
        )
        if capability is not None and not capability.executable and not structured_sensing_gap:
            mapping = self._capability_rejection_mapping(command, capability)
            metrics = self._metrics(command, start_state, start_state, trace_start)
            metrics["backend_capability_status"] = capability.status.value
            metrics["ground_truth_result"] = "UNRESOLVED"
            error_code = capability.error_code or "BACKEND_EXECUTION_FAILED"
            self.execution_log.append({
                "event": "command_rejected",
                "command_id": command.command_id,
                "method": command.canonical_method,
                "simulation_time": float(self.data.time),
                "backend_capability_status": capability.status.value,
                "error_code": error_code,
                "message": capability.reason,
            })
            return BackendCommandResult(
                status="rejected",
                command_id=command.command_id,
                method=command.canonical_method,
                start_time=start_time,
                end_time=float(self.data.time),
                mapping=mapping,
                metrics=metrics,
                error_code=error_code,
                message=capability.reason,
            )
        try:
            mapping = self._dispatch(command)
        except BackendStateIncompatible as exc:
            mapping = self._state_incompatible_mapping(command, str(exc))
            end_state = self._sample(force=True)
            metrics = self._metrics(command, start_state, end_state, trace_start)
            metrics["backend_capability_status"] = (
                capability.status.value if capability else "IMPLEMENTED"
            )
            metrics["ground_truth_result"] = "UNRESOLVED"
            self.execution_log.append({
                "event": "command_rejected",
                "command_id": command.command_id,
                "method": command.canonical_method,
                "simulation_time": float(self.data.time),
                "error_code": "BACKEND_STATE_INCOMPATIBLE",
                "message": str(exc),
            })
            return BackendCommandResult(
                status="rejected",
                command_id=command.command_id,
                method=command.canonical_method,
                start_time=start_time,
                end_time=float(self.data.time),
                mapping=mapping,
                metrics=metrics,
                error_code="BACKEND_STATE_INCOMPATIBLE",
                message=str(exc),
            )
        except BackendCommandNotImplemented as exc:
            mapping = self._variant_spec_block_mapping(command, str(exc))
            end_state = self._sample(force=True)
            metrics = self._metrics(command, start_state, end_state, trace_start)
            metrics["backend_capability_status"] = (
                capability.status.value if capability else "IMPLEMENTED"
            )
            metrics["ground_truth_result"] = "UNRESOLVED"
            self.execution_log.append({
                "event": "command_rejected",
                "command_id": command.command_id,
                "method": command.canonical_method,
                "simulation_time": float(self.data.time),
                "error_code": "BACKEND_METHOD_BLOCKED_BY_SPEC",
                "message": str(exc),
            })
            return BackendCommandResult(
                status="rejected",
                command_id=command.command_id,
                method=command.canonical_method,
                start_time=start_time,
                end_time=float(self.data.time),
                mapping=mapping,
                metrics=metrics,
                error_code="BACKEND_METHOD_BLOCKED_BY_SPEC",
                message=str(exc),
            )

        end_state = self._sample(force=True)
        metrics = self._metrics(command, start_state, end_state, trace_start)
        metrics["backend_capability_status"] = (
            capability.status.value if capability else "IMPLEMENTED"
        )
        if (
            capability is not None
            and capability.status == BackendCapabilityStatus.APPROXIMATE
            and not self.safety_monitor.fatal
        ):
            metrics["ground_truth_result"] = "APPROXIMATE"
        status = "failed" if self.safety_monitor.fatal else "completed"
        error_code = "SAFETY_STOPPED" if status == "failed" else None
        self.execution_log.append({
            "event": "command_completed" if status == "completed" else "command_failed",
            "command_id": command.command_id,
            "method": command.canonical_method,
            "simulation_time": float(self.data.time),
            "controller_mode": self.adapter.mode,
            "backend_capability_status": (
                capability.status.value if capability else "IMPLEMENTED"
            ),
            "ground_truth_result": metrics["ground_truth_result"],
            "error_code": error_code,
        })
        return BackendCommandResult(
            status=status,
            command_id=command.command_id,
            method=command.canonical_method,
            start_time=start_time,
            end_time=float(self.data.time),
            mapping=mapping,
            metrics=metrics,
            error_code=error_code,
        )

    def _dispatch(self, command: SimulationCommand) -> dict[str, Any]:
        method = command.canonical_method
        if (
            self.runtime_state == "EMERGENCY_STOP"
            and method
            not in {
                "stand",
                "stop",
                "emergency_stop",
                "get_status",
                "get_battery_status",
                "body_status",
                "joint_states",
                "diagnose",
            }
        ):
            raise BackendStateIncompatible(
                f"{method} is incompatible with persistent EMERGENCY_STOP; call stand/reset first"
            )
        if method == "stand":
            adapter_mapping = self.adapter.stand()
            self.runtime_state = "STANDING"
            self.step(self.stand_hold_duration)
            return self._mapping(
                command, adapter_mapping.to_dict(),
                duration=self.stand_hold_duration,
                end_strategy="stand_stability_hold",
                approximations=["backend_stability_window_not_sdk_duration"],
            )
        if method == "stop":
            adapter_mapping = self.adapter.stop()
            self.runtime_state = "STANDING"
            self.step(self.stop_hold_duration)
            return self._mapping(
                command, adapter_mapping.to_dict(),
                duration=self.stop_hold_duration,
                end_strategy="zero_velocity_then_stand_hold",
                approximations=["stop_posture_mapping_not_fully_specified"],
            )
        if method == "emergency_stop":
            adapter_mapping = self.adapter.emergency_stop()
            self.runtime_state = "EMERGENCY_STOP"
            self.step(self.stop_hold_duration)
            return self._mapping(
                command,
                adapter_mapping.to_dict(),
                duration=self.stop_hold_duration,
                end_strategy="persistent_simulated_damping_until_reset_or_stand",
                approximations=[
                    "software_emergency_stop_not_physical_estop",
                    "return_contract_unresolved",
                ],
            )
        if method == "sleep":
            self.step(command.duration or 0.0)
            return self._mapping(
                command,
                {"controller_method": "hold_current_controller_state"},
                duration=command.duration or 0.0,
                end_strategy="preserve_controller_state",
                approximations=[],
            )
        if command.command_type == "STATE_QUERY":
            state = self._sample(force=True)
            query = self.query_provider.query(method, state)
            query.update({"command_id": command.command_id})
            self.query_results.append(query)
            return self._mapping(
                command,
                {"controller_method": None, "query_provider": method},
                duration=0.0,
                end_strategy="state_unchanged",
                approximations=[],
            )
        if method in {"forward", "backward", "lateral_left", "lateral_right"}:
            self.runtime_state = "LOCOMOTING"
            return self._execute_velocity(command)
        if method == "diagonal":
            self.runtime_state = "LOCOMOTING"
            return self._execute_diagonal(command)
        if method == "turn":
            self.runtime_state = "LOCOMOTING"
            return self._execute_turn(command)
        capability = self.capability_registry.get(method)
        if capability.status == BackendCapabilityStatus.APPROXIMATE:
            if capability.implementation in {
                "data_driven_joint_profile",
                "athletic_joint_profile",
            }:
                return self._execute_profile_action(command, capability)
            if capability.implementation == "locomotion_composition":
                return self._execute_locomotion_composition(command, capability)
        raise BackendCommandNotImplemented(f"No backend mapping for {method}")

    def _execute_velocity(self, command: SimulationCommand) -> dict[str, Any]:
        parameters = command.parameters
        if any(name in parameters for name in ("speed_percent", "speed_level", "distance_m")):
            raise BackendCommandNotImplemented(
                "Percentage, level, and distance profiles need confirmed mapping/odometry"
            )
        speed = parameters.get("speed_mps")
        duration = command.duration
        if not isinstance(speed, (int, float)) or duration is None:
            raise BackendCommandNotImplemented("Direct speed/time profile is required")
        forward = 0.0
        lateral = 0.0
        if command.canonical_method == "forward":
            forward = abs(float(speed))
        elif command.canonical_method == "backward":
            forward = -abs(float(speed))
        elif command.canonical_method == "lateral_left":
            lateral = abs(float(speed))
        else:
            lateral = -abs(float(speed))
        adapter_mapping = self.adapter.set_body_velocity(forward, lateral, 0.0)
        self.step(duration)
        approximations = []
        requested = {"forward_mps": forward, "lateral_mps": lateral, "yaw_rate_rad_s": 0.0}
        controller_target = adapter_mapping.controller_target
        if (
            abs(controller_target["vx_mps"] - forward) > 1e-12
            or abs(controller_target["vy_mps"] - lateral) > 1e-12
        ):
            approximations.append("requested_speed_clipped_to_existing_controller_envelope")
        if parameters.get("stop", True):
            self.adapter.stop()
            self.step(self.stop_hold_duration)
            self.runtime_state = "STANDING"
            approximations.append("APPROXIMATE_END_STATE_ASSUMPTION")
            end_strategy = "zero_velocity_then_stand_hold"
        else:
            self.runtime_state = "LOCOMOTING"
            end_strategy = "leave_velocity_active"
        mapping = adapter_mapping.to_dict()
        mapping["requested_body_target"] = requested
        return self._mapping(
            command,
            mapping,
            duration=duration,
            end_strategy=end_strategy,
            approximations=approximations,
        )

    def _execute_diagonal(self, command: SimulationCommand) -> dict[str, Any]:
        parameters = command.parameters
        duration = command.duration
        speed = parameters.get("speed_mps")
        if not isinstance(speed, (int, float)) or duration is None:
            raise BackendCommandNotImplemented(
                "Diagonal requires resolved speed_mps and duration_s"
            )
        raw = command.raw_arguments
        endpoint_profile = "x_m" in raw or "y_m" in raw
        approximations: list[str] = []
        if endpoint_profile:
            x_right = float(parameters.get("x_m", 0.0))
            y_forward = float(parameters.get("y_m", 0.0))
            magnitude = math.hypot(x_right, y_forward)
            if magnitude <= 1e-9:
                raise BackendCommandNotImplemented(
                    "Diagonal endpoint vector must be non-zero"
                )
            forward = float(speed) * y_forward / magnitude
            lateral = -float(speed) * x_right / magnitude
            approximations.append("open_loop_endpoint_direction_without_odometry")
            profile = "endpoint_estimate"
        else:
            angle_deg = float(parameters.get("angle_deg", 45.0))
            angle_rad = math.radians(angle_deg)
            forward = float(speed) * math.cos(angle_rad)
            lateral = -float(speed) * math.sin(angle_rad)
            profile = "angle_speed_time"
        adapter_mapping = self.adapter.set_body_velocity(forward, lateral, 0.0)
        self.step(duration)
        requested = {
            "forward_mps": forward,
            "lateral_mps": lateral,
            "yaw_rate_rad_s": 0.0,
        }
        actual = adapter_mapping.controller_target
        if (
            abs(actual["vx_mps"] - forward) > 1e-12
            or abs(actual["vy_mps"] - lateral) > 1e-12
        ):
            approximations.append(
                "requested_components_clipped_to_existing_controller_envelope"
            )
        if parameters.get("stop", True):
            self.adapter.stop()
            self.step(self.stop_hold_duration)
            self.runtime_state = "STANDING"
            approximations.append("APPROXIMATE_END_STATE_ASSUMPTION")
            end_strategy = "zero_velocity_then_stand_hold"
        else:
            self.runtime_state = "LOCOMOTING"
            end_strategy = "leave_velocity_active"
        mapping = adapter_mapping.to_dict()
        mapping.update({
            "profile": profile,
            "requested_body_target": requested,
            "sdk_angle_convention": "positive_right_negative_left",
            "body_lateral_convention": "positive_left",
        })
        return self._mapping(
            command,
            mapping,
            duration=duration,
            end_strategy=end_strategy,
            approximations=approximations,
        )

    def _execute_profile_action(
        self,
        command: SimulationCommand,
        capability: BackendCapabilityEntry,
    ) -> dict[str, Any]:
        duration_override = command.parameters.get(
            "duration_s", command.parameters.get("time")
        )
        profile = self.action_registry.profile_for(
            command.canonical_method,
            duration_override=(
                float(duration_override)
                if isinstance(duration_override, (int, float))
                else None
            ),
        )
        if self.runtime_state == "LOCOMOTING":
            self.adapter.stop()
            self.step(0.3)
        adapter_mapping = self.adapter.start_action(
            profile,
            self.data,
            float(self.data.time),
            category=command.category,
        )
        self.runtime_state = capability.active_state
        handle = SimulationActionHandle(
            command_id=command.command_id,
            method=command.canonical_method,
            started_at=float(self.data.time),
            expected_end_at=float(self.data.time) + profile.duration_s,
        )
        self.execution_log.append({
            "event": "action_profile_started",
            "command_id": command.command_id,
            "method": command.canonical_method,
            "profile": profile.name,
            "phase_count": len(profile.phases),
            "handle": handle.to_dict(),
            "simulation_time": float(self.data.time),
        })
        self.step(profile.duration_s)
        last_phase = self.adapter.action_controller.current_phase
        if not self.safety_monitor.fatal:
            self.adapter.stand()
            self.runtime_state = "STANDING"
        mapping = adapter_mapping.to_dict()
        mapping.update({
            "action_phases": [
                {
                    "name": phase.name,
                    "duration_s": phase.duration_s,
                    "joint_offsets_rad": phase.joint_offsets_rad,
                }
                for phase in profile.phases
            ],
            "allowed_start_states": list(capability.allowed_start_states),
            "preparation_state": capability.preparation_state,
            "active_state": capability.active_state,
            "expected_end_state": capability.expected_end_state,
            "recovery_state": capability.recovery_state,
            "interruptibility": capability.interruptibility,
            "last_phase": last_phase,
            "internal_handle": handle.to_dict(),
        })
        approximations = [
            "exact_sdk_joint_trajectory_unresolved",
            "exact_sdk_blocking_and_return_contract_unresolved",
        ]
        if capability.video_status == "NO_VIDEO":
            approximations.append("APPROXIMATE_NO_VIDEO")
        return self._mapping(
            command,
            mapping,
            duration=profile.duration_s,
            end_strategy="profile_recovery_then_stand",
            approximations=approximations,
        )

    def _execute_locomotion_composition(
        self,
        command: SimulationCommand,
        capability: BackendCapabilityEntry,
    ) -> dict[str, Any]:
        method = command.canonical_method
        if method == "fast_rotate":
            requested = {"forward": 0.0, "lateral": 0.0, "sdk_yaw": 0.45}
            duration = 1.5
        elif method == "joy_walk":
            requested = {"forward": 0.10, "lateral": 0.0, "sdk_yaw": 0.0}
            duration = 2.0
        elif method == "step":
            direction = command.parameters.get("direction")
            if direction not in {"forward", "backward"}:
                raise BackendCommandNotImplemented(
                    "step direction is unresolved; explicit forward/backward is required"
                )
            requested = {
                "forward": 0.08 if direction == "forward" else -0.07,
                "lateral": 0.0,
                "sdk_yaw": 0.0,
            }
            duration = 0.8
        else:
            raise BackendCommandNotImplemented(
                f"No locomotion composition for {method}"
            )
        adapter_mapping = self.adapter.set_body_velocity(
            requested["forward"],
            requested["lateral"],
            requested["sdk_yaw"],
        )
        self.runtime_state = "ACTION_RUNNING"
        self.step(duration)
        self.adapter.stop()
        self.step(self.stop_hold_duration)
        self.runtime_state = "STANDING"
        mapping = adapter_mapping.to_dict()
        mapping.update({
            "composition": method,
            "requested": requested,
            "active_state": capability.active_state,
        })
        return self._mapping(
            command,
            mapping,
            duration=duration,
            end_strategy="zero_velocity_then_stand_hold",
            approximations=[
                "action_reconstructed_from_conservative_locomotion_composition",
                "exact_sdk_timing_and_return_contract_unresolved",
            ],
        )

    def _execute_turn(self, command: SimulationCommand) -> dict[str, Any]:
        parameters = command.parameters
        angle = None
        if "angle_deg" in parameters:
            angle = math.radians(float(parameters["angle_deg"]))
        elif "angle_rad" in parameters:
            angle = float(parameters["angle_rad"])
        if angle is not None:
            return self._execute_angle_turn(command, angle)
        duration = command.duration
        rate = None
        if "rate_rad_s" in parameters:
            rate = float(parameters["rate_rad_s"])
        elif "rate_deg_s" in parameters:
            rate = math.radians(float(parameters["rate_deg_s"]))
        if rate is None or duration is None:
            raise BackendCommandNotImplemented(
                "Turn requires an angle target or explicit rate plus duration; percentage/level shortcuts remain unresolved"
            )
        adapter_mapping = self.adapter.set_body_velocity(0.0, 0.0, rate)
        self.step(duration)
        if parameters.get("stop", True):
            self.adapter.stop()
            self.step(self.stop_hold_duration)
        return self._mapping(
            command,
            adapter_mapping.to_dict(),
            duration=duration,
            end_strategy="zero_velocity_then_stand_hold" if parameters.get("stop", True) else "leave_yaw_rate_active",
            approximations=["APPROXIMATE_END_STATE_ASSUMPTION"] if parameters.get("stop", True) else [],
        )

    def _execute_angle_turn(
        self, command: SimulationCommand, sdk_angle_rad: float
    ) -> dict[str, Any]:
        start_yaw = quaternion_to_euler(self.data.qpos[3:7])[2]
        controller_delta = -sdk_angle_rad
        target_yaw = wrap_angle(start_yaw + controller_delta)
        timeout = min(
            max(3.0, abs(sdk_angle_rad) / 0.06 + 2.0),
            max(0.0, self.max_simulation_time - float(self.data.time)),
        )
        rate_limit = MAX_YAW_RATE
        if "rate_rad_s" in command.parameters and command.parameters["rate_rad_s"] != 0:
            rate_limit = min(abs(float(command.parameters["rate_rad_s"])), MAX_YAW_RATE)
        elif "rate_deg_s" in command.parameters and command.parameters["rate_deg_s"] != 0:
            rate_limit = min(abs(math.radians(float(command.parameters["rate_deg_s"]))), MAX_YAW_RATE)
        initial_sdk_rate = math.copysign(rate_limit, sdk_angle_rad)
        initial_mapping = self.adapter.set_body_velocity(0.0, 0.0, initial_sdk_rate)
        started = float(self.data.time)
        reached = False
        while float(self.data.time) - started < timeout:
            current_yaw = quaternion_to_euler(self.data.qpos[3:7])[2]
            error = angle_difference(target_yaw, current_yaw)
            if abs(error) <= self.turn_tolerance_rad:
                reached = True
                break
            # The legacy gait has a static dead-band at very small requested
            # rates.  Keep full direction-correct rate until the documented
            # yaw-feedback tolerance is reached rather than decaying into an
            # unachievable near-zero target.
            controller_rate = math.copysign(rate_limit, error)
            sdk_rate = -controller_rate
            self.adapter.set_body_velocity(0.0, 0.0, sdk_rate)
            self._step_once()
            if self.safety_monitor.fatal:
                break
        self.adapter.stop()
        self.step(self.stop_hold_duration)
        mapping = initial_mapping.to_dict()
        mapping.update({
            "controller_method": "closed_loop_yaw_target_via_set_velocity_command",
            "sdk_angle_value_rad": sdk_angle_rad,
            "sdk_angle_value_deg": math.degrees(sdk_angle_rad),
            "sdk_direction_convention": "right_positive",
            "controller_direction_convention": "left_positive",
            "controller_target_delta_rad": controller_delta,
            "target_world_yaw_rad": target_yaw,
            "sign_conversion_applied": True,
            "conversion": "negated_at_backend_boundary",
            "target_reached": reached,
            "tolerance_rad": self.turn_tolerance_rad,
            "timeout_s": timeout,
        })
        approximations = ["APPROXIMATE_END_STATE_ASSUMPTION"]
        if not reached:
            approximations.append("yaw_target_timeout_before_tolerance")
        return self._mapping(
            command,
            mapping,
            duration=float(self.data.time) - started,
            end_strategy="closed_loop_target_then_zero_velocity_stand_hold",
            approximations=approximations,
        )

    def step(self, duration: float | None = None) -> None:
        duration = 0.0 if duration is None else float(duration)
        if duration < 0.0:
            raise ValueError("duration must be non-negative")
        target = float(self.data.time) + duration
        while float(self.data.time) + self.physics_timestep * 0.5 < target:
            self._step_once()
            if self.safety_monitor.fatal:
                self.adapter.stop()
                break

    def _step_once(self) -> None:
        self.adapter.update(self.data, float(self.data.time))
        mujoco.mj_step(self.model, self.data)
        if float(self.data.time) - self._last_sample_time >= self.sample_period - 1e-12:
            state = self._sample(force=True)
            self.safety_monitor.check(state)
        self._render_if_due()

    def get_state(self) -> SimulationState:
        return self.state_monitor.sample(
            self.data,
            command_id=self.current_command_id,
            method=self.current_method,
            controller_mode=self.adapter.mode,
        )

    def query(self, command: SimulationCommand) -> dict[str, Any]:
        state = self._sample(force=True)
        return self.query_provider.query(command.canonical_method, state)

    def stop(self) -> None:
        self.adapter.stop()

    def finalize(self) -> None:
        if self._viewer is not None:
            self._viewer.close()
            self._viewer = None
        if self._renderer is not None:
            self._renderer.close()
            self._renderer = None
        if self.record_video and self.video_path is not None and self._video_frames:
            try:
                self.video_path.parent.mkdir(parents=True, exist_ok=True)
                self._write_video()
            except Exception as exc:
                self.warnings.append({
                    "warning_code": "VIDEO_WRITE_FAILED",
                    "message": str(exc),
                })

    def _write_video(self) -> None:
        """Write captured RGB frames using an available MP4 encoder."""

        try:
            import imageio.v3 as iio

            iio.imwrite(self.video_path, self._video_frames, fps=30)
            return
        except ModuleNotFoundError:
            pass

        import cv2

        height, width = self._video_frames[0].shape[:2]
        writer = cv2.VideoWriter(
            str(self.video_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            30.0,
            (width, height),
        )
        if not writer.isOpened():
            raise RuntimeError("No working MP4 encoder is available")
        try:
            for frame in self._video_frames:
                writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
        finally:
            writer.release()
        if not self.video_path.exists() or self.video_path.stat().st_size == 0:
            raise RuntimeError("MP4 encoder produced no output")

    def _sample(self, *, force: bool = False) -> SimulationState:
        state = self.get_state()
        if force or state.simulation_time - self._last_sample_time >= self.sample_period - 1e-12:
            self.trace_recorder.record(state)
            self._last_sample_time = state.simulation_time
        return state

    def _mapping(
        self,
        command: SimulationCommand,
        backend_mapping: dict[str, Any],
        *,
        duration: float,
        end_strategy: str,
        approximations: list[str],
    ) -> dict[str, Any]:
        capability = (
            None
            if command.canonical_method == "sleep"
            else self.capability_registry.get(command.canonical_method)
        )
        return_contract = (
            "UNRESOLVED"
            if "return_type" in command.unresolved_metadata
            else "SPECIFIED"
        )
        return {
            "command_id": command.command_id,
            "canonical_method": command.canonical_method,
            "sdk_parameters": command.parameters,
            "backend_capability_status": (
                capability.status.value if capability else "IMPLEMENTED"
            ),
            "capability_reason": capability.reason if capability else "WAIT semantics",
            "backend_mapping": backend_mapping,
            "duration_s": duration,
            "end_strategy": end_strategy,
            "approximations": approximations,
            "return_contract": return_contract,
            "return_value": None,
            "return_approximation": return_contract == "UNRESOLVED",
        }

    def _capability_rejection_mapping(
        self,
        command: SimulationCommand,
        capability: BackendCapabilityEntry,
    ) -> dict[str, Any]:
        return {
            "command_id": command.command_id,
            "canonical_method": command.canonical_method,
            "sdk_parameters": command.parameters,
            "backend_mapping": None,
            "backend_capability_status": capability.status.value,
            "status": "rejected",
            "error_code": capability.error_code,
            "reason": capability.reason,
            "implementation": capability.implementation,
            "hardware_dependency": list(capability.hardware_dependency),
            "model_dependency": list(capability.model_dependency),
            "limitations": list(capability.limitations),
            "physical_execution": False,
            "return_contract": (
                "UNRESOLVED"
                if "return_type" in command.unresolved_metadata
                else "SPECIFIED"
            ),
            "return_value": None,
        }

    def _variant_spec_block_mapping(
        self, command: SimulationCommand, reason: str
    ) -> dict[str, Any]:
        capability = self.capability_registry.get(command.canonical_method)
        return {
            "command_id": command.command_id,
            "canonical_method": command.canonical_method,
            "sdk_parameters": command.parameters,
            "backend_mapping": None,
            "backend_capability_status": capability.status.value,
            "invocation_status": "BLOCKED_BY_UNRESOLVED_SPEC",
            "status": "rejected",
            "error_code": "BACKEND_METHOD_BLOCKED_BY_SPEC",
            "reason": reason,
            "physical_execution": False,
            "return_contract": "UNRESOLVED",
            "return_value": None,
        }

    def _state_incompatible_mapping(
        self, command: SimulationCommand, reason: str
    ) -> dict[str, Any]:
        capability = self.capability_registry.get(command.canonical_method)
        return {
            "command_id": command.command_id,
            "canonical_method": command.canonical_method,
            "sdk_parameters": command.parameters,
            "backend_mapping": None,
            "backend_capability_status": capability.status.value,
            "status": "rejected",
            "error_code": "BACKEND_STATE_INCOMPATIBLE",
            "reason": reason,
            "runtime_state": self.runtime_state,
            "physical_execution": False,
            "return_contract": "UNRESOLVED",
            "return_value": None,
        }

    def _metrics(
        self,
        command: SimulationCommand,
        start: SimulationState,
        end: SimulationState,
        trace_start: int,
    ) -> dict[str, Any]:
        samples = self.trace_recorder.rows[trace_start:]
        start_xy = np.asarray(start.base_position[:2], dtype=float)
        end_xy = np.asarray(end.base_position[:2], dtype=float)
        world_delta = end_xy - start_xy
        body_delta = world_to_body(world_delta, start.orientation_rpy[2])
        yaw_change = angle_difference(end.orientation_rpy[2], start.orientation_rpy[2])
        max_roll = max((abs(row["roll"]) for row in samples), default=abs(end.orientation_rpy[0]))
        max_pitch = max((abs(row["pitch"]) for row in samples), default=abs(end.orientation_rpy[1]))
        max_linear_speed = max(
            (
                math.sqrt(
                    row["base_linear_velocity_x"] ** 2
                    + row["base_linear_velocity_y"] ** 2
                    + row["base_linear_velocity_z"] ** 2
                )
                for row in samples
            ),
            default=0.0,
        )
        max_angular_speed = max(
            (
                math.sqrt(
                    row["base_angular_velocity_x"] ** 2
                    + row["base_angular_velocity_y"] ** 2
                    + row["base_angular_velocity_z"] ** 2
                )
                for row in samples
            ),
            default=0.0,
        )
        max_utilization = max(
            (row["actuator_utilization"] for row in samples), default=0.0
        )
        max_slip = max((row["max_slip_speed"] for row in samples), default=0.0)
        mean_slip = float(np.mean([row["max_slip_speed"] for row in samples])) if samples else 0.0
        slip_duration = sum(
            max(
                0.0,
                float(samples[index]["simulation_time"])
                - float(samples[index - 1]["simulation_time"]),
            )
            for index in range(1, len(samples))
            if samples[index]["max_slip_speed"]
            > self.safety_monitor.instantaneous_slip_warning
        )
        duration = end.simulation_time - start.simulation_time
        joint_excursions = []
        start_joints = np.asarray(start.joint_positions, dtype=float)
        for row in samples:
            raw_joints = row["joint_positions"]
            joints = np.asarray(
                json.loads(raw_joints) if isinstance(raw_joints, str) else raw_joints,
                dtype=float,
            )
            joint_excursions.append(float(np.max(np.abs(joints - start_joints))))
        max_joint_excursion = max(joint_excursions, default=0.0)
        min_contact_count = min(
            (int(row["contact_count"]) for row in samples),
            default=end.contact_count,
        )
        max_contact_count = max(
            (int(row["contact_count"]) for row in samples),
            default=end.contact_count,
        )
        airborne_duration = sum(
            max(
                0.0,
                float(samples[index]["simulation_time"])
                - float(samples[index - 1]["simulation_time"]),
            )
            for index in range(1, len(samples))
            if int(samples[index]["contact_count"]) == 0
        )
        slip_distance = mean_slip * duration
        displacement = float(np.linalg.norm(world_delta))
        slip_per_meter = slip_distance / max(displacement, 1e-9)
        if (
            command.command_type in {"VELOCITY_MOTION", "ROTATION"}
            and displacement < 0.002
            and abs(yaw_change) < 0.01
        ):
            self.safety_monitor.record(
                "NO_MOTION_PROGRESS", "warning", end,
                {"displacement_m": displacement, "yaw_change_rad": yaw_change},
                {"minimum_displacement_m": 0.002, "minimum_yaw_rad": 0.01},
                "Command produced no meaningful base motion",
            )
        command_events = [
            event.to_dict() for event in self.safety_monitor.events
            if event.command_id == command.command_id
        ]
        fell = any(
            event["event_code"] in {"FALL_DETECTED", "BASE_HEIGHT_TOO_LOW"}
            for event in command_events
        )
        start_linear_speed = float(np.linalg.norm(start.base_linear_velocity))
        end_linear_speed = float(np.linalg.norm(end.base_linear_velocity))
        start_angular_speed = float(np.linalg.norm(start.base_angular_velocity))
        end_angular_speed = float(np.linalg.norm(end.base_angular_velocity))
        ground_truth = self._ground_truth_result(
            command,
            body_delta,
            yaw_change,
            max_roll,
            max_pitch,
            fell,
            slip_per_meter,
            end_height=end.base_position[2],
            end_linear_speed=end_linear_speed,
        )
        return {
            "command_id": command.command_id,
            "method": command.canonical_method,
            "start_time": start.simulation_time,
            "end_time": end.simulation_time,
            "duration": duration,
            "start_position": {"x": start.base_position[0], "y": start.base_position[1], "z": start.base_position[2]},
            "end_position": {"x": end.base_position[0], "y": end.base_position[1], "z": end.base_position[2]},
            "world_displacement": {"x": float(world_delta[0]), "y": float(world_delta[1])},
            "body_frame_displacement": {"forward": float(body_delta[0]), "left": float(body_delta[1])},
            "start_orientation": {"roll": start.orientation_rpy[0], "pitch": start.orientation_rpy[1], "yaw": start.orientation_rpy[2]},
            "end_orientation": {"roll": end.orientation_rpy[0], "pitch": end.orientation_rpy[1], "yaw": end.orientation_rpy[2]},
            "yaw_change": yaw_change,
            "max_roll": max_roll,
            "max_pitch": max_pitch,
            "max_linear_speed": max_linear_speed,
            "max_angular_speed": max_angular_speed,
            "start_linear_speed": start_linear_speed,
            "end_linear_speed": end_linear_speed,
            "start_angular_speed": start_angular_speed,
            "end_angular_speed": end_angular_speed,
            "max_joint_excursion_rad": max_joint_excursion,
            "min_contact_count": min_contact_count,
            "max_contact_count": max_contact_count,
            "airborne_duration": airborne_duration,
            "max_actuator_utilization": max_utilization,
            "max_slip_speed": max_slip,
            "mean_slip_speed": mean_slip,
            "slip_duration": slip_duration,
            "slip_per_meter": slip_per_meter,
            "fell": fell,
            "safety_events": command_events,
            "ground_truth_result": ground_truth,
        }

    @staticmethod
    def _ground_truth_result(
        command: SimulationCommand,
        body_delta: np.ndarray,
        yaw_change: float,
        max_roll: float,
        max_pitch: float,
        fell: bool,
        slip_per_meter: float,
        *,
        end_height: float,
        end_linear_speed: float,
    ) -> str:
        if fell:
            return "FAIL"
        method = command.canonical_method
        stable = max_roll <= 0.45 and max_pitch <= 0.45
        if method == "stand":
            return (
                "PASS"
                if (
                    stable
                    and 0.12 <= end_height <= 0.45
                    and np.linalg.norm(body_delta) <= 0.03
                )
                else "FAIL"
            )
        if method == "stop":
            return "PASS" if stable and end_linear_speed <= 0.05 else "FAIL"
        direction_ok = False
        if method == "forward":
            direction_ok = (
                body_delta[0] > 0.03
                and abs(body_delta[1]) <= max(0.05, 0.5 * abs(body_delta[0]))
                and abs(yaw_change) <= 0.35
            )
        elif method == "backward":
            direction_ok = (
                body_delta[0] < -0.03
                and abs(body_delta[1]) <= max(0.05, 0.5 * abs(body_delta[0]))
                and abs(yaw_change) <= 0.35
            )
        elif method == "lateral_left":
            direction_ok = (
                body_delta[1] > 0.03
                and abs(body_delta[0]) <= max(0.05, 0.5 * abs(body_delta[1]))
                and abs(yaw_change) <= 0.35
            )
        elif method == "lateral_right":
            direction_ok = (
                body_delta[1] < -0.03
                and abs(body_delta[0]) <= max(0.05, 0.5 * abs(body_delta[1]))
                and abs(yaw_change) <= 0.35
            )
        elif method == "diagonal":
            if "x_m" in command.raw_arguments or "y_m" in command.raw_arguments:
                expected = np.asarray(
                    [
                        float(command.parameters.get("y_m", 0.0)),
                        -float(command.parameters.get("x_m", 0.0)),
                    ],
                    dtype=float,
                )
            else:
                angle = math.radians(
                    float(command.parameters.get("angle_deg", 45.0))
                )
                expected = np.asarray(
                    [math.cos(angle), -math.sin(angle)], dtype=float
                )
            expected /= max(float(np.linalg.norm(expected)), 1e-9)
            along = float(np.dot(body_delta, expected))
            cross = abs(
                float(body_delta[0] * expected[1] - body_delta[1] * expected[0])
            )
            direction_ok = (
                along > 0.03
                and cross <= max(0.05, 0.6 * along)
                and abs(yaw_change) <= 0.35
            )
        elif method == "turn":
            requested = command.parameters.get("angle_deg")
            if requested is None and "angle_rad" in command.parameters:
                requested = math.degrees(float(command.parameters["angle_rad"]))
            if requested is None:
                requested = command.parameters.get("rate_rad_s", command.parameters.get("rate_deg_s"))
            direction_ok = (
                requested is not None
                and ((requested > 0 and yaw_change < -0.02) or (requested < 0 and yaw_change > 0.02))
                and np.linalg.norm(body_delta) <= 0.15
            )
        else:
            return "NOT_EVALUATED"
        if not direction_ok or not stable:
            return "FAIL"
        return "PASS" if slip_per_meter <= 0.45 else "APPROXIMATE"

    def _ensure_visual_resources(self) -> None:
        if self.viewer_requested and self._viewer is None:
            from mujoco import viewer as mujoco_viewer

            self._viewer = mujoco_viewer.launch_passive(self.model, self.data)
        if self.record_video and self._renderer is None:
            self._renderer = mujoco.Renderer(self.model, height=480, width=640)

    def _render_if_due(self) -> None:
        if float(self.data.time) - self._last_render_time < self.render_period - 1e-12:
            return
        if self._viewer is not None:
            self._viewer.sync()
        if self._renderer is not None:
            self._renderer.update_scene(self.data, camera="track")
            self._video_frames.append(self._renderer.render().copy())
        self._last_render_time = float(self.data.time)


class BackendCommandNotImplemented(RuntimeError):
    pass


class BackendStateIncompatible(RuntimeError):
    pass
