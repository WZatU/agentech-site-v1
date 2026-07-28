"""Read-only MuJoCo state sampling and contact-foot slip observation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import mujoco
import numpy as np

from model_config import LEG_NAMES
from simulation import foot_contact_state
from simulation.orientation import quaternion_to_euler


@dataclass(frozen=True)
class SimulationState:
    simulation_time: float
    base_position: tuple[float, float, float]
    orientation_rpy: tuple[float, float, float]
    base_linear_velocity: tuple[float, float, float]
    base_angular_velocity: tuple[float, float, float]
    current_command_id: str | None
    current_method: str | None
    controller_mode: str
    contact_count: int
    foot_contacts: dict[str, bool]
    joint_positions: tuple[float, ...]
    joint_velocities: tuple[float, ...]
    actuator_controls: tuple[float, ...]
    actuator_forces: tuple[float, ...]
    imu_acceleration: tuple[float, ...] | dict[str, Any]
    imu_gyro: tuple[float, ...] | dict[str, Any]
    foot_slip_speeds: dict[str, float]
    max_slip_speed: float
    actuator_utilization: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class StateMonitor:
    def __init__(self, model: mujoco.MjModel, controller):
        self.model = model
        self.controller = controller
        self.foot_geom_ids = {
            leg: mujoco.mj_name2id(
                model, mujoco.mjtObj.mjOBJ_GEOM, f"{leg}_foot_contact"
            )
            for leg in LEG_NAMES
        }
        self.previous_foot_positions: dict[str, np.ndarray] | None = None
        self.previous_time: float | None = None

    def reset(self) -> None:
        self.previous_foot_positions = None
        self.previous_time = None

    def sample(
        self,
        data: mujoco.MjData,
        *,
        command_id: str | None,
        method: str | None,
        controller_mode: str,
    ) -> SimulationState:
        contacts = foot_contact_state(self.model, data)
        current_positions = {
            leg: np.asarray(data.geom_xpos[geom_id], dtype=float).copy()
            for leg, geom_id in self.foot_geom_ids.items()
        }
        dt = (
            float(data.time) - self.previous_time
            if self.previous_time is not None
            else 0.0
        )
        slips: dict[str, float] = {}
        for leg in LEG_NAMES:
            if (
                contacts[leg]
                and self.previous_foot_positions is not None
                and dt > 0.0
            ):
                delta = current_positions[leg][:2] - self.previous_foot_positions[leg][:2]
                slips[leg] = float(np.linalg.norm(delta) / dt)
            else:
                slips[leg] = 0.0
        self.previous_foot_positions = current_positions
        self.previous_time = float(data.time)

        roll, pitch, yaw = quaternion_to_euler(data.qpos[3:7])
        joints = data.qpos[self.controller.qpos_addresses]
        joint_velocities = data.qvel[self.controller.dof_addresses]
        actuator_controls = np.asarray(data.ctrl[self.controller.actuator_ids], dtype=float)
        torque_limits = np.asarray(self.controller.torque_limits, dtype=float)
        utilization = float(
            np.max(np.abs(actuator_controls) / np.maximum(torque_limits, 1e-12))
        )
        return SimulationState(
            simulation_time=float(data.time),
            base_position=tuple(float(value) for value in data.qpos[:3]),
            orientation_rpy=(roll, pitch, yaw),
            base_linear_velocity=tuple(float(value) for value in data.qvel[:3]),
            base_angular_velocity=tuple(float(value) for value in data.qvel[3:6]),
            current_command_id=command_id,
            current_method=method,
            controller_mode=controller_mode,
            contact_count=sum(contacts.values()),
            foot_contacts=contacts,
            joint_positions=tuple(float(value) for value in joints),
            joint_velocities=tuple(float(value) for value in joint_velocities),
            actuator_controls=tuple(float(value) for value in actuator_controls),
            actuator_forces=tuple(float(value) for value in data.actuator_force),
            imu_acceleration=self._sensor(data, "imu_accelerometer"),
            imu_gyro=self._sensor(data, "imu_gyro"),
            foot_slip_speeds=slips,
            max_slip_speed=max(slips.values(), default=0.0),
            actuator_utilization=utilization,
        )

    def _sensor(self, data: mujoco.MjData, name: str):
        sensor_id = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_SENSOR, name)
        if sensor_id < 0:
            return {"available": False, "reason": f"sensor {name!r} not found"}
        address = int(self.model.sensor_adr[sensor_id])
        dimension = int(self.model.sensor_dim[sensor_id])
        return tuple(float(value) for value in data.sensordata[address:address + dimension])
