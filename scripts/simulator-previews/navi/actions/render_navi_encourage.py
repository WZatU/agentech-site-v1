"""Render Navi's encourage action from recorded live joint poses."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 8.8
BASE = np.array((.011, -.669, 1.474, .010, -.551, 1.443, .174, -.764, 1.438, -.264, -.723, 1.472))
PREP = np.array((-.170, -.512, 1.347, -.153, -.442, 1.446, .033, -.673, 1.458, -.425, -.649, 1.547))
RAISE = np.array((-.365, 1.936, 1.338, -.147, -.425, .969, .005, -1.003, 1.683, -.498, -.990, 1.780))
ACCENT = np.array((-.360, .438, 2.428, -.147, -.453, 1.257, .040, -.849, 1.598, -.442, -.821, 1.691))
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def mix(a: np.ndarray, b: np.ndarray, amount: float) -> np.ndarray:
    return a * (1.0 - amount) + b * amount


def phase(t: float) -> tuple[np.ndarray, float, float, float, float, float]:
    if t < .4:
        return BASE, 0.0, 0.0, 0.0, 0.0, 0.0
    if t < 2.1:
        u = smooth((t - .4) / 1.7)
        return mix(BASE, PREP, u), 0.0, .020 * u, -.018 * u, math.radians(-2) * u, math.radians(4) * u
    if t < 4.55:
        u = smooth((t - 2.1) / 2.45)
        return mix(PREP, RAISE, u), 0.0, .020 + .015 * u, -.018 - .024 * u, math.radians(-2 - 3 * u), math.radians(4 + 2 * u)
    if t < 7.1:
        u = (t - 4.55) / 2.55
        beat = smooth(.5 - .5 * math.cos(2 * math.pi * 3 * u))
        return mix(RAISE, ACCENT, beat), .022 * beat, .035, -.042, math.radians(-5 + 4 * beat), math.radians(6)
    if t < 8.35:
        u = smooth((t - 7.1) / 1.25)
        return mix(RAISE, BASE, u), 0.0, .035 * (1 - u), -.042 * (1 - u), math.radians(-5) * (1 - u), math.radians(6) * (1 - u)
    return BASE, 0.0, 0.0, 0.0, 0.0, 0.0


def quaternion(roll: float, pitch: float) -> np.ndarray:
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
    for _ in range(30):
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
    camera.distance, camera.azimuth, camera.elevation = 1.48, 125.0, -14.0
    max_error = 0.0
    min_clearance = 1.0
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
            t = frame_index / args.fps
            live, x, y, z, pitch, roll = phase(t)
            data.qpos[:3] = root_start + np.array((x, y, z))
            data.qpos[3:7] = quaternion(roll, pitch)
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
                    if t >= 7.1:
                        recovery = smooth((t - 7.1) / 1.25)
                        target = target * (1 - recovery) + initial_feet[leg] * recovery
                        guess = (
                            previous_targets[LEG_INDEX[leg]] * (1 - recovery)
                            + STANDING_JOINT_TARGETS[LEG_INDEX[leg]] * recovery
                        )
                    else:
                        guess = previous_targets[LEG_INDEX[leg]]
                solved, error = solve_leg(model, data, controller, leg, target, guess)
                controller.targets[LEG_INDEX[leg]] = solved
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            previous_targets = controller.targets.copy()
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                min_clearance = min(min_clearance, float(data.site_xpos[site][2] - initial_feet[leg][2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "encourage", "duration_s": DURATION_S,
        "source": "18 half-second samples containing 4 live Navi joint updates",
        "moving_leg": "front_right", "encouragement_beats": 3,
        "recovery_target": "normal_standing_front_right_leg",
        "maximum_foot_target_error_m": max_error,
        "minimum_foot_clearance_m": min_clearance,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
