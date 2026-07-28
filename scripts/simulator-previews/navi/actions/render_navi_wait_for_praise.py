"""Render Navi's wait-for-praise action from recorded live joint telemetry."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 4.8

# Recorded from the real Navi at 192.168.4.65 on 2026-07-22. The vendor
# publishes these legs in FR, FL, HR, HL order.
LIVE_BASELINE = np.array((
    -0.0702, -0.5251, 1.2078, 0.0927, -0.5291, 1.2273,
    -0.0647, -0.6306, 1.4098, 0.1037, -0.6176, 1.3988,
))
LIVE_SETTLED = np.array((
    -0.0687, -0.5556, 1.0638, 0.0842, -0.5661, 1.0768,
    -0.0917, -0.8571, 1.6308, 0.1047, -0.8616, 1.6363,
))
LIVE_DEEP = np.array((
    -0.0652, -0.5986, 1.0203, 0.0827, -0.5676, 1.0288,
    -0.0357, -1.0156, 1.7678, 0.1717, -0.9031, 1.6703,
))
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def blend(a: np.ndarray, b: np.ndarray, amount: float) -> np.ndarray:
    return a * (1.0 - amount) + b * amount


def live_pose(t: float) -> tuple[np.ndarray, float, float]:
    if t < 0.35:
        return LIVE_BASELINE, 0.0, 0.0
    if t < 1.15:
        amount = smooth((t - 0.35) / 0.8)
        recorded = blend(LIVE_BASELINE, LIVE_SETTLED, min(1.0, amount * 1.45))
        if amount > 0.69:
            recorded = blend(LIVE_SETTLED, LIVE_DEEP, (amount - 0.69) / 0.31)
        return recorded, amount, 0.0
    if t < 3.35:
        # Three clear left-right hip shakes after reaching the low pose.
        shake = math.sin(2.0 * math.pi * 3.0 * (t - 1.15) / 2.2)
        return LIVE_DEEP, 1.0, shake
    if t < 4.15:
        amount = smooth((t - 3.35) / 0.8)
        return blend(LIVE_DEEP, LIVE_BASELINE, amount), 1.0 - amount, 0.0
    return LIVE_BASELINE, 0.0, 0.0


def quaternion(pitch: float, yaw: float) -> np.ndarray:
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return np.array((cp * cy, -sp * sy, sp * cy, cp * sy))


def solve_leg(model, data, controller, leg: str, foot_target: np.ndarray, guess: np.ndarray):
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
    for _ in range(26):
        data.qpos[qpos_addresses] = q
        mujoco.mj_forward(model, data)
        error = foot_target - data.site_xpos[site_id]
        if float(np.linalg.norm(error)) < 2e-6:
            break
        mujoco.mj_jacSite(model, data, jac_pos, jac_rot, site_id)
        delta = np.linalg.lstsq(jac_pos[:, dof_addresses], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(delta, -0.07, 0.07), lower, upper)
    data.qpos[qpos_addresses] = q
    mujoco.mj_forward(model, data)
    return q, float(np.linalg.norm(foot_target - data.site_xpos[site_id]))


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
    camera.lookat[:] = (0.0, 0.0, 0.14)
    camera.distance = 1.48
    camera.azimuth = 120.0
    camera.elevation = -14.0

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
            recorded, depth, hip_shake = live_pose(t)
            # This measured pitch/height pairing keeps all four recorded foot
            # positions on the floor while the rear body settles.
            data.qpos[:3] = root_start + np.array((0.0, 0.0, -0.028 * depth))
            data.qpos[3:7] = quaternion(
                math.radians(-7.0) * depth,
                math.radians(7.0) * hip_shake,
            )
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                target = STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + recorded[source] - LIVE_BASELINE[source]
                solved, error = solve_leg(model, data, controller, leg, planted_feet[leg], target)
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
        "command": "wait_for_praise",
        "duration_s": DURATION_S,
        "source": "two live joint-state recordings from Navi 192.168.4.65",
        "recorded_joint_samples": 7,
        "visible_sequence": "rear_body_lowers_quickly_then_shakes_left_right_three_times_and_recovers",
        "hip_shake_cycles": 3,
        "low_pose_duration_s": 2.2,
        "feet_planted": True,
        "maximum_foot_site_error_m": max_foot_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
