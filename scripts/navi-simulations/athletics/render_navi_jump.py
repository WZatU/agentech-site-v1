"""Render Navi's vertical jump from the recorded 01_jump.mp4 reference."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 3.8
TAKEOFF_START_S = 0.19
FLIGHT_START_S = 0.33
FLIGHT_END_S = 0.62


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def crouch_amount(t: float) -> float:
    if FLIGHT_END_S <= t < 0.72:
        return smooth((t - FLIGHT_END_S) / (0.72 - FLIGHT_END_S))
    if 0.72 <= t < 1.69:
        return 1.0
    if 1.69 <= t < 3.48:
        return 1.0 - smooth((t - 1.69) / (3.48 - 1.69))
    return 0.0


def quaternion(pitch: float) -> np.ndarray:
    return np.array((math.cos(pitch / 2.0), 0.0, math.sin(pitch / 2.0), 0.0))


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
    for _ in range(24):
        data.qpos[qpos_addresses] = q
        mujoco.mj_forward(model, data)
        error = target - data.site_xpos[site_id]
        if float(np.linalg.norm(error)) < 2e-6:
            break
        mujoco.mj_jacSite(model, data, jac_pos, jac_rot, site_id)
        delta = np.linalg.lstsq(jac_pos[:, dof_addresses], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(delta, -0.08, 0.08), lower, upper)
    data.qpos[qpos_addresses] = q
    mujoco.mj_forward(model, data)
    return q, float(np.linalg.norm(target - data.site_xpos[site_id]))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=30)
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
    standing_targets = controller.targets.copy()
    mujoco.mj_forward(model, data)
    feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.19)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_contact_error = max_height = 0.0
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
            airborne = FLIGHT_START_S <= t < FLIGHT_END_S
            pitch = 0.0
            if t < TAKEOFF_START_S:
                z = 0.0
            elif t < FLIGHT_START_S:
                z = 0.040 * smooth((t - TAKEOFF_START_S) / (FLIGHT_START_S - TAKEOFF_START_S))
            elif airborne:
                u = (t - FLIGHT_START_S) / (FLIGHT_END_S - FLIGHT_START_S)
                z = 0.040 * (1.0 - u) + 0.160 * 4.0 * u * (1.0 - u)
                pitch = -math.radians(9.0) * math.sin(math.pi * u)
            else:
                z = -0.105 * crouch_amount(t)

            data.qpos[:3] = root_start + np.array((0.0, 0.0, z))
            data.qpos[3:7] = quaternion(pitch)
            data.qvel[:6] = 0.0
            max_height = max(max_height, z)

            if airborne:
                u = (t - FLIGHT_START_S) / (FLIGHT_END_S - FLIGHT_START_S)
                fold = math.sin(math.pi * u)
                controller.targets[:] = standing_targets
                for leg in LEG_NAMES:
                    leg_slice = LEG_INDEX[leg]
                    hind_scale = 0.72 if leg.startswith("hind") else 1.0
                    controller.targets[leg_slice] = np.array((
                        0.0,
                        -0.55 - 0.45 * fold * hind_scale,
                        1.10 + 0.90 * fold * hind_scale,
                    ))
            else:
                for leg in LEG_NAMES:
                    q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                    controller.targets[LEG_INDEX[leg]] = q
                    max_contact_error = max(max_contact_error, error)

            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "jump",
        "duration_s": DURATION_S,
        "reference_video": "videos/athletics/01_jump.mp4",
        "flight_duration_s": FLIGHT_END_S - FLIGHT_START_S,
        "maximum_root_rise_m": max_height,
        "landing_crouch_depth_m": 0.105,
        "max_ground_contact_error_m": max_contact_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
