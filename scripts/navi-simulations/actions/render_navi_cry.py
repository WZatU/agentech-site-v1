"""Render Navi's cry action from recorded live joint poses."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 9.2
BASE = np.array((.030, -.674, 1.384, .028, -.573, 1.376, .205, -.878, 1.534, -.253, -.846, 1.592))
DROOP = np.array((.029, -.527, .686, .019, -.416, .618, .215, -1.267, 1.728, -.301, -1.233, 1.775))
REBOUND = np.array((.018, -.691, 1.601, .017, -.565, 1.564, .194, -.805, 1.580, -.275, -.761, 1.619))
RECOVER = np.array((.012, -.696, 1.558, .014, -.576, 1.516, .172, -.750, 1.439, -.271, -.711, 1.474))
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def mix(a: np.ndarray, b: np.ndarray, amount: float) -> np.ndarray:
    return a * (1.0 - amount) + b * amount


def phase(t: float) -> tuple[np.ndarray, float, float, float]:
    if t < .45:
        return BASE, 0.0, 0.0, 0.0
    if t < 3.0:
        u = smooth((t - .45) / 2.55)
        return mix(BASE, DROOP, u), -.045 * u, math.radians(14) * u, math.radians(-4) * u
    if t < 5.7:
        u = smooth((t - 3.0) / 2.7)
        sob = math.sin(2 * math.pi * 2 * u) * math.radians(2.5) * math.sin(math.pi * u)
        return mix(DROOP, REBOUND, u), -.045 + .019 * u, math.radians(14 - 16 * u) + sob, math.radians(-4 + 6 * u)
    if t < 8.3:
        u = smooth((t - 5.7) / 2.6)
        return mix(REBOUND, RECOVER, u), -.026 * (1 - u), math.radians(-2) * (1 - u), math.radians(2) * (1 - u)
    if t < 8.85:
        u = smooth((t - 8.3) / .55)
        return mix(RECOVER, BASE, u), 0.0, 0.0, 0.0
    return BASE, 0.0, 0.0, 0.0


def quaternion(pitch: float, roll: float) -> np.ndarray:
    cr, sr = math.cos(roll / 2), math.sin(roll / 2)
    cp, sp = math.cos(pitch / 2), math.sin(pitch / 2)
    return np.array((cr * cp, sr * cp, cr * sp, -sr * sp))


def solve_leg(model, data, controller, leg: str, target: np.ndarray, guess: np.ndarray):
    from model_config import LEG_INDEX
    leg_slice = LEG_INDEX[leg]
    qpos, dof = controller.qpos_addresses[leg_slice], controller.dof_addresses[leg_slice]
    site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
    q = guess.copy()
    jacp, jacr = np.zeros((3, model.nv)), np.zeros((3, model.nv))
    lower, upper = np.array((-1.134, -3.141, .436)), np.array((1.134, 2.792, 2.705))
    for _ in range(28):
        data.qpos[qpos] = q
        mujoco.mj_forward(model, data)
        error = target - data.site_xpos[site]
        if np.linalg.norm(error) < 2e-6:
            break
        mujoco.mj_jacSite(model, data, jacp, jacr, site)
        delta = np.linalg.lstsq(jacp[:, dof], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(delta, -.07, .07), lower, upper)
    data.qpos[qpos] = q
    mujoco.mj_forward(model, data)
    return q, float(np.linalg.norm(target - data.site_xpos[site]))


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
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_JOINT_TARGETS
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()
    mujoco.mj_forward(model, data)
    planted_feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, .14)
    camera.distance, camera.azimuth, camera.elevation = 1.48, 120.0, -14.0
    max_foot_error = 0.0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264",
        quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            live, z, pitch, roll = phase(frame_index / args.fps)
            data.qpos[:3] = root_start + np.array((0.0, 0.0, z))
            data.qpos[3:7] = quaternion(pitch, roll)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                guess = np.clip(
                    STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + live[source] - BASE[source],
                    (-1.134, -3.141, .436), (1.134, 2.792, 2.705),
                )
                solved, error = solve_leg(model, data, controller, leg, planted_feet[leg], guess)
                controller.targets[LEG_INDEX[leg]] = solved
                max_foot_error = max(max_foot_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "cry", "duration_s": DURATION_S,
        "source": "20 half-second samples containing 5 live Navi joint updates",
        "visible_sequence": "measured_uneven_forebody_droop_two_sob_pulses_rebound_then_recovery",
        "feet_planted": True, "maximum_foot_site_error_m": max_foot_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
