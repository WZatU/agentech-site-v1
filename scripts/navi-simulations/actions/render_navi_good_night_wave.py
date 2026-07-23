"""Render Navi's good-night wave from recorded live joint poses."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 7.0
BASE = np.array((.061, -.747, 1.510, -.020, -.715, 1.483, .128, -.901, 1.449, -.319, -.886, 1.511))
PREP = np.array((.002, -.638, 1.506, -.077, -.619, 1.488, .069, -.829, 1.496, -.387, -.807, 1.549))
MID_LIFT = np.array((-.014, .421, 2.212, -.136, -.466, 1.483, .032, -.692, 1.500, -.437, -.679, 1.596))
WAVE_LEFT = np.array((-.080, 1.781, 1.368, -.143, -.450, 1.089, -.009, -.903, 1.601, -.496, -.908, 1.708))
WAVE_RIGHT = np.array((.018, 1.781, 1.368, -.140, -.450, 1.089, -.009, -.903, 1.605, -.497, -.910, 1.713))
RECOVER = np.array((.030, -.674, 1.385, .028, -.573, 1.377, .205, -.878, 1.534, -.253, -.846, 1.592))
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
    if t < .3:
        return BASE, 0.0, 0.0, 0.0
    if t < .8:
        u = smooth((t - .3) / .5)
        return mix(BASE, PREP, u), .012 * u, -.014 * u, math.radians(2) * u
    if t < 1.8:
        u = smooth((t - .8) / 1.0)
        return mix(PREP, MID_LIFT, u), .012 + .018 * u, -.014 - .026 * u, math.radians(2 + 3 * u)
    if t < 2.7:
        u = smooth((t - 1.8) / .9)
        return mix(MID_LIFT, WAVE_LEFT, u), .030, -.040 - .008 * u, math.radians(5 + 1 * u)
    if t < 4.5:
        u = (t - 2.7) / 1.8
        wave = smooth(.5 - .5 * math.cos(2 * math.pi * 3 * u))
        return mix(WAVE_LEFT, WAVE_RIGHT, wave), .030, -.048, math.radians(6)
    if t < 6.1:
        u = smooth((t - 4.5) / 1.6)
        return mix(WAVE_LEFT, RECOVER, u), .030 * (1 - u), -.048 * (1 - u), math.radians(6) * (1 - u)
    if t < 6.6:
        u = smooth((t - 6.1) / .5)
        return mix(RECOVER, BASE, u), 0.0, 0.0, 0.0
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
    camera.distance, camera.azimuth, camera.elevation = 1.48, 145.0, -14.0
    max_support_error = 0.0
    min_foot_clearance = 1.0
    previous_targets = controller.targets.copy()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264",
        quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            live, y, z, roll = phase(frame_index / args.fps)
            data.qpos[:3] = root_start + np.array((0.0, y, z))
            data.qpos[3:7] = roll_quaternion(roll)
            data.qvel[:6] = 0.0
            raw = {}
            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                raw[leg] = np.clip(
                    STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + live[source] - BASE[source],
                    (-1.134, -3.141, .436), (1.134, 2.792, 2.705),
                )
                controller.targets[LEG_INDEX[leg]] = raw[leg]
            data.qpos[controller.qpos_addresses] = controller.targets
            mujoco.mj_forward(model, data)
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                target = data.site_xpos[site].copy()
                if leg != "front_right":
                    target = initial_feet[leg].copy()
                    guess = raw[leg]
                else:
                    target[2] = max(target[2], initial_feet[leg][2])
                    guess = previous_targets[LEG_INDEX[leg]]
                solved, error = solve_leg(model, data, controller, leg, target, guess)
                controller.targets[LEG_INDEX[leg]] = solved
                max_support_error = max(max_support_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            previous_targets = controller.targets.copy()
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                min_foot_clearance = min(min_foot_clearance, float(data.site_xpos[site][2] - initial_feet[leg][2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "good_night_wave", "duration_s": DURATION_S,
        "source": "23 half-second samples containing 6 live Navi joint updates",
        "wave_cycles": 3, "moving_leg": "front_right",
        "maximum_foot_target_error_m": max_support_error,
        "minimum_foot_clearance_m": min_foot_clearance,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
