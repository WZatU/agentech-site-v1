"""Render Navi's full-body stretch followed by left/right torso twists."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 5.8


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def window(t: float, rise_start: float, rise_end: float, fall_start: float, fall_end: float) -> float:
    if rise_start <= t < rise_end:
        return smooth((t - rise_start) / (rise_end - rise_start))
    if rise_end <= t < fall_start:
        return 1.0
    if fall_start <= t < fall_end:
        return 1.0 - smooth((t - fall_start) / (fall_end - fall_start))
    return 0.0


def quaternion(roll: float, pitch: float, yaw: float) -> np.ndarray:
    cr, sr = math.cos(roll / 2.0), math.sin(roll / 2.0)
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return np.array((
        cr * cp * cy + sr * sp * sy,
        sr * cp * cy - cr * sp * sy,
        cr * sp * cy + sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
    ))


def pose(t: float) -> tuple[float, float, float, float, float, float]:
    head_down = window(t, 0.25, 0.95, 1.15, 1.70)
    head_up = window(t, 1.30, 1.95, 2.20, 3.00)
    # Begin the left twist during the recovery from hips-down/head-up, so the
    # body levels and twists in one continuous motion with no neutral pause.
    twist_left = window(t, 2.20, 2.85, 3.18, 3.70)
    twist_right = window(t, 3.55, 4.15, 4.45, 5.15)

    pitch = math.radians(18.0) * head_down - math.radians(18.0) * head_up
    yaw = math.radians(15.0) * twist_left - math.radians(15.0) * twist_right
    # A small downward compensation keeps every planted leg within reach at
    # both ends of the pitch stretch.
    z = -0.024 * (head_down + head_up)
    x = 0.018 * head_down - 0.018 * head_up
    return 0.0, pitch, yaw, z, x, 0.0


def solve_leg(model, data, controller, leg: str, target: np.ndarray, guess: np.ndarray):
    from model_config import LEG_INDEX

    leg_slice = LEG_INDEX[leg]
    qpos_addresses = controller.qpos_addresses[leg_slice]
    dof_addresses = controller.dof_addresses[leg_slice]
    site_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
    q = guess.copy()
    jac_pos = np.zeros((3, model.nv))
    jac_rot = np.zeros((3, model.nv))
    lower = np.array((-1.134, -3.141, 0.436))
    upper = np.array((1.134, 2.792, 2.705))
    for _ in range(22):
        data.qpos[qpos_addresses] = q
        mujoco.mj_forward(model, data)
        error = target - data.site_xpos[site_id]
        if float(np.linalg.norm(error)) < 2e-6:
            break
        mujoco.mj_jacSite(model, data, jac_pos, jac_rot, site_id)
        delta = np.linalg.lstsq(jac_pos[:, dof_addresses], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(delta, -0.07, 0.07), lower, upper)
    data.qpos[qpos_addresses] = q
    mujoco.mj_forward(model, data)
    return q, float(np.linalg.norm(target - data.site_xpos[site_id]))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sys.path.insert(0, str(args.model_root.resolve()))
    from controller import StandingPDController, quaternion_to_rpy
    from model_config import LEG_INDEX, LEG_NAMES
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()
    mujoco.mj_forward(model, data)
    feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_error = max_roll = max_pitch = max_displacement = 0.0
    minimum_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264",
        quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            roll, pitch, yaw, z, x, y = pose(t)
            root = root_start + np.array((x, y, z))
            data.qpos[:3] = root
            data.qpos[3:7] = quaternion(roll, pitch, yaw)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            measured_roll, measured_pitch, _ = quaternion_to_rpy(data.qpos[3:7])
            max_roll = max(max_roll, abs(measured_roll))
            max_pitch = max(max_pitch, abs(measured_pitch))
            minimum_height = min(minimum_height, float(root[2]))
            max_displacement = max(max_displacement, math.hypot(x, y))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "full_body_stretch",
        "duration_s": DURATION_S,
        "visible_sequence": "head_down_hips_up_then_head_up_hips_down_then_level_while_twisting_left_then_twist_right",
        "ground_contact_targets_used": True,
        "max_foot_site_error_m": max_error,
        "max_abs_roll_deg": math.degrees(max_roll),
        "max_abs_pitch_deg": math.degrees(max_pitch),
        "minimum_body_height_m": minimum_height,
        "max_root_xy_displacement_m": max_displacement,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
