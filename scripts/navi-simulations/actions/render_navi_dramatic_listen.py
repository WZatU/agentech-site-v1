"""Render Navi's left/right dramatic-listening reaction."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 4.2


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def window(t: float, rise_start: float, rise_end: float, hold_end: float, fall_end: float) -> float:
    if rise_start <= t < rise_end:
        return smooth((t - rise_start) / (rise_end - rise_start))
    if rise_end <= t < hold_end:
        return 1.0
    if hold_end <= t < fall_end:
        return 1.0 - smooth((t - hold_end) / (fall_end - hold_end))
    return 0.0


def quaternion(roll: float) -> np.ndarray:
    return np.array((math.cos(roll / 2.0), math.sin(roll / 2.0), 0.0, 0.0))


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
    from controller import StandingPDController
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

    max_error = 0.0
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
            left = max(
                window(t, 0.15, 0.45, 0.55, 0.85),
                window(t, 1.85, 2.15, 2.25, 2.55),
            )
            right = max(
                window(t, 1.00, 1.30, 1.40, 1.70),
                window(t, 2.70, 3.00, 3.10, 3.45),
            )
            amount = left + right
            roll = math.radians(-8.0 * left + 8.0 * right)
            lateral = 0.018 * left - 0.018 * right
            data.qpos[:3] = root_start + np.array((0.0, lateral, -0.035 * amount))
            data.qpos[3:7] = quaternion(roll)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "dramatic_listen",
        "duration_s": DURATION_S,
        "visible_sequence": "fast_left_then_right_repeated_twice_then_stand",
        "repeat_count": 2,
        "ground_contact_targets_used": True,
        "max_foot_site_error_m": max_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
