"""In-memory trace recorder with CSV output support."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from simulation.state_monitor import SimulationState


class TraceRecorder:
    def __init__(self):
        self.rows: list[dict[str, Any]] = []

    def reset(self) -> None:
        self.rows.clear()

    def record(self, state: SimulationState) -> None:
        roll, pitch, yaw = state.orientation_rpy
        vx, vy, vz = state.base_linear_velocity
        wx, wy, wz = state.base_angular_velocity
        x, y, z = state.base_position
        self.rows.append({
            "simulation_time": state.simulation_time,
            "base_position_x": x,
            "base_position_y": y,
            "base_position_z": z,
            "roll": roll,
            "pitch": pitch,
            "yaw": yaw,
            "base_linear_velocity_x": vx,
            "base_linear_velocity_y": vy,
            "base_linear_velocity_z": vz,
            "base_angular_velocity_x": wx,
            "base_angular_velocity_y": wy,
            "base_angular_velocity_z": wz,
            "current_command_id": state.current_command_id,
            "current_method": state.current_method,
            "controller_mode": state.controller_mode,
            "contact_count": state.contact_count,
            "joint_positions": json.dumps(state.joint_positions),
            "joint_velocities": json.dumps(state.joint_velocities),
            "actuator_controls": json.dumps(state.actuator_controls),
            "actuator_forces": json.dumps(state.actuator_forces),
            "foot_contacts": json.dumps(state.foot_contacts),
            "imu_acceleration": json.dumps(state.imu_acceleration),
            "imu_gyro": json.dumps(state.imu_gyro),
            "foot_slip_speeds": json.dumps(state.foot_slip_speeds),
            "stance_foot_slip_speed": state.max_slip_speed,
            "max_slip_speed": state.max_slip_speed,
            "actuator_utilization": state.actuator_utilization,
        })

    def write_csv(self, path: str | Path) -> None:
        destination = Path(path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not self.rows:
            destination.write_text("", encoding="utf-8")
            return
        with destination.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(self.rows[0]))
            writer.writeheader()
            writer.writerows(self.rows)
