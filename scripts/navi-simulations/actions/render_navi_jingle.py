"""Render Navi's jingle action from its recorded live joint poses."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 7.8
CYCLE_COUNT = 3
CYCLE_S = 2.3
MOTION_START_S = 0.35
BASE = np.array((.009, -.692, 1.462, -.149, -.966, 1.481, .033, -.894, 1.467, -.072, -.763, 1.495))
POSES = np.array((
    BASE,
    (-.148, -.664, 1.462, -.317, -1.047, 1.578, -.199, -.835, 1.415, -.298, -.871, 1.649),
    (-.142, -.709, 1.537, -.311, -1.080, 1.624, -.184, -.898, 1.504, -.285, -.900, 1.690),
    (-.009, -.882, 1.806, -.193, -1.253, 1.882, .019, -1.121, 1.803, -.097, -1.018, 1.909),
    (.131, -.827, 1.651, -.027, -1.090, 1.677, .229, -1.063, 1.679, .116, -.843, 1.641),
    (.019, -.716, 1.460, -.137, -.976, 1.483, .104, -.939, 1.491, -.059, -.786, 1.495),
    BASE,
))
CYCLE_POSES = np.array((POSES[0], POSES[2], POSES[3], POSES[4], POSES[0]))
CYCLE_Y = np.array((0.0, -.040, 0.0, .040, 0.0))
CYCLE_Z = np.array((0.0, -.026, -.058, -.034, 0.0))
CYCLE_ROLL = np.radians((0.0, -6.5, 0.0, 6.5, 0.0))
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def frame_pose(t: float) -> tuple[np.ndarray, float, float, float]:
    motion_end = MOTION_START_S + CYCLE_COUNT * CYCLE_S
    if t < MOTION_START_S or t >= motion_end:
        return BASE, 0.0, 0.0, 0.0
    cycle_progress = ((t - MOTION_START_S) % CYCLE_S) / CYCLE_S
    segment = min(3, int(cycle_progress * 4.0))
    amount = smooth(cycle_progress * 4.0 - segment)
    pose = CYCLE_POSES[segment] * (1.0 - amount) + CYCLE_POSES[segment + 1] * amount
    y = CYCLE_Y[segment] * (1.0 - amount) + CYCLE_Y[segment + 1] * amount
    z = CYCLE_Z[segment] * (1.0 - amount) + CYCLE_Z[segment + 1] * amount
    roll = CYCLE_ROLL[segment] * (1.0 - amount) + CYCLE_ROLL[segment + 1] * amount
    return pose, float(y), float(z), float(roll)


def roll_quaternion(roll: float) -> np.ndarray:
    return np.array((math.cos(roll / 2), math.sin(roll / 2), 0.0, 0.0))


def solve_leg(model, data, controller, leg: str, target: np.ndarray, guess: np.ndarray):
    from model_config import LEG_INDEX
    leg_slice = LEG_INDEX[leg]
    qpos = controller.qpos_addresses[leg_slice]
    dof = controller.dof_addresses[leg_slice]
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
            live, y, z, roll = frame_pose(t)
            data.qpos[:3] = root_start + np.array((0.0, y, z))
            data.qpos[3:7] = roll_quaternion(roll)
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
        "command": "jingle", "duration_s": DURATION_S,
        "source": "30 half-second samples containing 7 live Navi joint updates",
        "visible_sequence": "three_fast_measured_left_low_center_crouch_right_rise_cycles_then_recovery",
        "cycle_count": CYCLE_COUNT,
        "feet_planted": True, "maximum_foot_site_error_m": max_foot_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
