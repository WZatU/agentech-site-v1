"""Render Navi's measured flex-muscles action with a quick recovery."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 5.2
BASE = np.array((.019, -.711, 1.459, -.137, -.976, 1.483, .093, -.928, 1.482, -.067, -.787, 1.495))
FLEX_LEFT = np.array((-.376, -.707, 1.615, -.325, -.975, 1.725, -.091, -.710, 1.383, -.240, -.553, 1.327))
FLEX_RIGHT = np.array((.090, -.731, 1.729, .141, -.477, 2.069, .194, -.619, 1.350, .021, -.526, 1.416))
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def mix(a: np.ndarray, b: np.ndarray, amount: float) -> np.ndarray:
    return a * (1.0 - amount) + b * amount


def pose(t: float) -> tuple[np.ndarray, float, float, float]:
    if t < .35:
        return BASE, 0.0, 0.0, 0.0
    if t < 1.45:
        u = smooth((t - .35) / 1.10)
        return mix(BASE, FLEX_LEFT, u), -.022 * u, -.030 * u, math.radians(-5) * u
    if t < 2.05:
        return FLEX_LEFT, -.022, -.030, math.radians(-5)
    if t < 3.15:
        u = smooth((t - 2.05) / 1.10)
        return mix(FLEX_LEFT, FLEX_RIGHT, u), -.022 + .044 * u, -.030 - .008 * u, math.radians(-5 + 10 * u)
    if t < 4.25:
        return FLEX_RIGHT, .022, -.038, math.radians(5)
    if t < 4.80:
        # Deliberately faster final recovery.
        u = smooth((t - 4.25) / .55)
        return mix(FLEX_RIGHT, BASE, u), .022 * (1 - u), -.038 * (1 - u), math.radians(5) * (1 - u)
    return BASE, 0.0, 0.0, 0.0


def roll_quaternion(roll: float) -> np.ndarray:
    return np.array((math.cos(roll / 2), math.sin(roll / 2), 0.0, 0.0))


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
    initial_feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, .15)
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
            t = frame_index / args.fps
            live, y, z, roll = pose(t)
            data.qpos[:3] = root_start + np.array((0.0, y, z))
            data.qpos[3:7] = roll_quaternion(roll)
            data.qvel[:6] = 0.0
            guesses = {}
            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                guesses[leg] = np.clip(
                    STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + live[source] - BASE[source],
                    (-1.134, -3.141, .436), (1.134, 2.792, 2.705),
                )
                controller.targets[LEG_INDEX[leg]] = guesses[leg]
            data.qpos[controller.qpos_addresses] = controller.targets
            mujoco.mj_forward(model, data)
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                target = data.site_xpos[site].copy()
                if leg.startswith("hind_"):
                    target[:2] = initial_feet[leg][:2]
                target[2] = initial_feet[leg][2]
                solved, error = solve_leg(model, data, controller, leg, target, guesses[leg])
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
        "command": "flex_muscles", "duration_s": DURATION_S,
        "source": "15 half-second samples containing 3 live Navi joint updates",
        "visible_sequence": "measured_left_flex_then_right_flex_then_fast_recovery",
        "final_recovery_duration_s": .55,
        "maximum_support_foot_error_m": max_foot_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
