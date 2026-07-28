"""Shared headless simulation helpers used by validation, tests, and demo."""

from __future__ import annotations

from pathlib import Path

import mujoco
import numpy as np

from controller import TrotGaitController, quaternion_to_rpy
from model_config import LEG_NAMES


PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_PATH = PROJECT_ROOT / "scene.xml"
FOOT_GEOM_NAMES = tuple(f"{leg}_foot_contact" for leg in LEG_NAMES)
# Keep the long-standing ``simulation.py`` public module while allowing the
# integration components requested for this phase to live under
# ``simulation/<component>.py``.  No legacy function or physics behavior is
# changed; this only gives the module a submodule search path.
__path__ = [str(PROJECT_ROOT / "simulation")]


def load_model() -> mujoco.MjModel:
    return mujoco.MjModel.from_xml_path(str(MODEL_PATH))


def keyframe_id(model: mujoco.MjModel, name: str = "standing") -> int:
    identifier = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_KEY, name)
    if identifier < 0:
        raise ValueError(f"Missing keyframe: {name}")
    return identifier


def reset_to_keyframe(
    model: mujoco.MjModel, data: mujoco.MjData, name: str = "standing"
) -> None:
    mujoco.mj_resetDataKeyframe(model, data, keyframe_id(model, name))
    mujoco.mj_forward(model, data)


def foot_contact_state(model: mujoco.MjModel, data: mujoco.MjData) -> dict[str, bool]:
    ground_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, "ground")
    foot_ids = {
        leg: mujoco.mj_name2id(
            model, mujoco.mjtObj.mjOBJ_GEOM, f"{leg}_foot_contact"
        )
        for leg in LEG_NAMES
    }
    result = {leg: False for leg in LEG_NAMES}
    for index in range(data.ncon):
        first = int(data.contact[index].geom1)
        second = int(data.contact[index].geom2)
        for leg, foot_id in foot_ids.items():
            if (first == ground_id and second == foot_id) or (
                second == ground_id and first == foot_id
            ):
                result[leg] = True
    return result


def state_snapshot(
    model: mujoco.MjModel, data: mujoco.MjData, controller: TrotGaitController
) -> dict[str, object]:
    roll, pitch, yaw = quaternion_to_rpy(data.qpos[3:7])
    joint_position = data.qpos[controller.qpos_addresses]
    joint_velocity = data.qvel[controller.dof_addresses]
    return {
        "time": float(data.time),
        "command": controller.command_name,
        "base_xyz": data.qpos[0:3].astype(float).tolist(),
        "base_rpy": [roll, pitch, yaw],
        "base_linear_velocity": data.qvel[0:3].astype(float).tolist(),
        "base_angular_velocity": data.qvel[3:6].astype(float).tolist(),
        "joint_position_range": [float(joint_position.min()), float(joint_position.max())],
        "joint_velocity_range": [float(joint_velocity.min()), float(joint_velocity.max())],
        "actuator_control_range": [float(data.ctrl.min()), float(data.ctrl.max())],
        "foot_contacts": foot_contact_state(model, data),
        "body_height": float(data.qpos[2]),
    }


def run_headless(
    command: str = "stand",
    duration: float = 5.0,
    settle_time: float = 0.5,
) -> tuple[mujoco.MjModel, mujoco.MjData, TrotGaitController, dict[str, object]]:
    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data)
    controller = TrotGaitController(model)
    contact_patterns: set[tuple[bool, ...]] = set()
    max_abs_roll = 0.0
    max_abs_pitch = 0.0
    joint_motion_min = np.full(12, np.inf)
    joint_motion_max = np.full(12, -np.inf)
    control_peak = 0.0
    start_xy = data.qpos[0:2].copy()
    start_yaw = quaternion_to_rpy(data.qpos[3:7])[2]
    previous_root_position = data.qpos[0:3].copy()
    maximum_root_position_step = 0.0

    total_steps = int(round((settle_time + duration) / model.opt.timestep))
    settle_steps = int(round(settle_time / model.opt.timestep))
    for step in range(total_steps):
        controller.set_command("stand" if step < settle_steps else command)
        controller.apply(data)
        mujoco.mj_step(model, data)
        root_step = float(np.linalg.norm(data.qpos[0:3] - previous_root_position))
        maximum_root_position_step = max(maximum_root_position_step, root_step)
        previous_root_position = data.qpos[0:3].copy()
        if step >= settle_steps:
            roll, pitch, _ = quaternion_to_rpy(data.qpos[3:7])
            max_abs_roll = max(max_abs_roll, abs(roll))
            max_abs_pitch = max(max_abs_pitch, abs(pitch))
            joints = data.qpos[controller.qpos_addresses]
            joint_motion_min = np.minimum(joint_motion_min, joints)
            joint_motion_max = np.maximum(joint_motion_max, joints)
            control_peak = max(control_peak, float(np.max(np.abs(data.ctrl))))
            state = foot_contact_state(model, data)
            contact_patterns.add(tuple(state[leg] for leg in LEG_NAMES))

    _, _, final_yaw = quaternion_to_rpy(data.qpos[3:7])
    metrics = {
        "command": command,
        "duration": duration,
        "finite": bool(np.all(np.isfinite(data.qpos)) and np.all(np.isfinite(data.qvel))),
        "start_xy": start_xy.astype(float).tolist(),
        "final_xy": data.qpos[0:2].astype(float).tolist(),
        "xy_displacement": (data.qpos[0:2] - start_xy).astype(float).tolist(),
        "yaw_change": float(final_yaw - start_yaw),
        "final_height": float(data.qpos[2]),
        "max_abs_roll": max_abs_roll,
        "max_abs_pitch": max_abs_pitch,
        "joint_peak_to_peak": (joint_motion_max - joint_motion_min).astype(float).tolist(),
        "control_peak": control_peak,
        "maximum_root_position_step": maximum_root_position_step,
        "contact_pattern_count": len(contact_patterns),
        "final_contacts": foot_contact_state(model, data),
        "snapshot": state_snapshot(model, data, controller),
    }
    return model, data, controller, metrics
