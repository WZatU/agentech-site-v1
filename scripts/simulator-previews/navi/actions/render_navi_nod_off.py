"""Render Navi's staged nod-off routine from the user's reference sequence."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np

from render_navi_full_body_stretch import quaternion, solve_leg, smooth, window


DURATION_S = 6.5


def gesture_pulse(t: float) -> float:
    if not 3.00 <= t < 4.70:
        return 0.0
    u = (t - 3.00) / 1.70
    envelope = min(smooth(u / 0.10), smooth((1.0 - u) / 0.10))
    return (0.5 - 0.5 * math.cos(6.0 * math.pi * u)) * envelope


def phase_pose(t: float) -> tuple[np.ndarray, float, float, float]:
    front_root = np.array((0.016, 0.0, -0.082))
    low_root = np.array((-0.012, 0.0, -0.145))
    front_pitch = math.radians(14.0)
    low_pitch = -math.radians(10.0)

    if t < 0.30:
        return np.zeros(3), 0.0, 0.0, 0.0
    if t < 1.20:
        u = smooth((t - 0.30) / 0.90)
        return front_root * u, front_pitch * u, u, 0.0
    if t < 1.65:
        return front_root, front_pitch, 1.0, 0.0
    if t < 2.65:
        u = smooth((t - 1.65) / 1.00)
        return front_root * (1.0 - u) + low_root * u, front_pitch * (1.0 - u) + low_pitch * u, 1.0 - u, u
    if t < 4.75:
        nod = math.radians(4.0) * gesture_pulse(t)
        return low_root + np.array((0.006, 0.0, -0.004)) * (nod / math.radians(4.0)), low_pitch + nod, 0.0, 1.0
    if t < 5.90:
        u = 1.0 - smooth((t - 4.75) / 1.15)
        return low_root * u, low_pitch * u, 0.0, u
    return np.zeros(3), 0.0, 0.0, 0.0


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
    mujoco.mj_forward(model, data)
    feet = {leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy() for leg in LEG_NAMES}

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.13)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_support_error = max_lower_leg_lift = 0.0
    minimum_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            root_delta, pitch, front_mix, low_mix = phase_pose(t)
            data.qpos[:3] = root_start + root_delta
            data.qpos[3:7] = quaternion(0.0, pitch, 0.0)
            data.qvel[:6] = 0.0

            for leg in LEG_NAMES:
                front = leg.startswith("front")
                side = 1.0 if leg.endswith("left") else -1.0
                offset = np.zeros(3)
                if front:
                    offset += np.array((0.055 * front_mix, 0.045 * side * front_mix, 0.0))
                    offset += np.array((0.065 * low_mix, 0.060 * side * low_mix, 0.0))
                else:
                    offset += np.array((-0.045 * low_mix, 0.055 * side * low_mix, 0.0))
                q, error = solve_leg(model, data, controller, leg, feet[leg] + offset, controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_support_error = max(max_support_error, error)

            # Once both elbows are low and the hips have settled, fold both
            # front knees a little farther so only the lower leg sections lift.
            lower_leg_lift = gesture_pulse(t)
            max_lower_leg_lift = max(max_lower_leg_lift, lower_leg_lift)
            for leg in ("front_left", "front_right"):
                leg_slice = LEG_INDEX[leg]
                controller.targets[leg_slice][2] = min(2.705, controller.targets[leg_slice][2] + 0.30 * lower_leg_lift)

            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            minimum_height = min(minimum_height, float(data.qpos[2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "nod_off",
        "duration_s": DURATION_S,
        "source_video": "videos/actions/123_nod_off.mp4",
        "visible_sequence": "front_elbows_down_then_rear_down_head_up_then_three_synchronized_front_lower_leg_lifts_and_head_nods_then_stand",
        "max_support_foot_target_error_m": max_support_error,
        "front_lower_leg_joint_lift_rad": 0.30 * max_lower_leg_lift,
        "head_nod_count": 3,
        "head_nod_deg": 4.0,
        "minimum_root_height_m": minimum_height,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
