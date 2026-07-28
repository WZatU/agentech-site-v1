"""Map the five documented sensing methods to labeled MuJoCo data."""

from __future__ import annotations

from typing import Any

from simulation.state_monitor import SimulationState


class QueryProvider:
    supported_methods = {
        "get_status",
        "get_battery_status",
        "body_status",
        "joint_states",
        "diagnose",
    }

    def __init__(self, joint_names: tuple[str, ...] = ()):
        self.joint_names = tuple(joint_names)

    def query(self, method: str, state: SimulationState) -> dict[str, Any]:
        if method not in self.supported_methods:
            raise KeyError(method)
        base = {
            "simulated": True,
            "backend": "mujoco",
            "method": method,
            "simulation_time": state.simulation_time,
        }
        if method == "get_status":
            return {
                **base,
                "status": "IMPLEMENTED",
                "available": True,
                "source": "mujoco_state",
                "unit": None,
                "value": {
                    "connected": True,
                    "ready": True,
                    "healthy": state.base_position[2] >= 0.12,
                    "standing": state.controller_mode in {"STAND", "STOP_HOLD"},
                    "controller_mode": state.controller_mode,
                },
            }
        if method == "get_battery_status":
            return {
                **base,
                "status": "HARDWARE_ONLY",
                "available": False,
                "source": "unsupported_hardware_state",
                "unit": None,
                "value": None,
                "reason": "MuJoCo model has no battery, voltage, current, temperature, or supply state",
            }
        if method == "body_status":
            return {
                **base,
                "status": "IMPLEMENTED",
                "available": True,
                "source": "mujoco_data",
                "unit": {
                    "position": "m",
                    "orientation": "rad_rpy",
                    "linear_velocity": "m/s",
                    "angular_velocity": "rad/s",
                    "acceleration": "m/s^2",
                },
                "value": {
                    "position": state.base_position,
                    "orientation_rpy": state.orientation_rpy,
                    "linear_velocity": state.base_linear_velocity,
                    "angular_velocity": state.base_angular_velocity,
                    "imu_acceleration": state.imu_acceleration,
                    "imu_gyro": state.imu_gyro,
                },
            }
        if method == "joint_states":
            return {
                **base,
                "status": "IMPLEMENTED",
                "available": True,
                "source": "mujoco_data",
                "unit": {"position": "rad", "velocity": "rad/s", "effort": "N*m"},
                "value": {
                    "joint_names": self.joint_names,
                    "positions": state.joint_positions,
                    "velocities": state.joint_velocities,
                    "efforts": state.actuator_forces,
                },
            }
        status = self.query("get_status", state)
        battery = self.query("get_battery_status", state)
        return {
            **base,
            "status": "SIMULATED",
            "available": True,
            "source": "mujoco_state_with_explicit_hardware_gaps",
            "unit": None,
            "value": {
                "status": status["value"],
                "battery": {
                    "available": battery["available"],
                    "value": battery["value"],
                    "reason": battery["reason"],
                },
                "firmware": {
                    "available": False,
                    "value": None,
                    "reason": "No firmware exists in the MuJoCo model",
                },
            },
        }
