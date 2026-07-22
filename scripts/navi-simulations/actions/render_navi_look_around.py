"""Render Navi looking around with all four feet planted."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np

from render_navi_full_body_stretch import quaternion, solve_leg, window


DURATION_S = 4.6


def pose(t: float) -> tuple[float, float, float, float, float, float]:
    # Keep the front-down/rear-up posture throughout both looks.
    head_down = window(t, 0.20, 0.65, 2.75, 3.25)
    twist_left = window(t, 0.70, 1.15, 1.35, 1.72)
    twist_right = window(t, 1.65, 2.10, 2.35, 2.78)
    # Finish in the opposite stretch: head high and hips low.
    head_up = window(t, 2.90, 3.35, 3.65, 4.25)

    pitch = math.radians(18.0) * head_down - math.radians(18.0) * head_up
    yaw = math.radians(16.0) * twist_left - math.radians(16.0) * twist_right
    # Drop the root slightly more during the combined pitch/yaw poses so the
    # planted feet remain comfortably reachable by all four legs.
    z = -0.024 * (head_down + head_up) - 0.026 * max(twist_left, twist_right)
    x = 0.018 * head_down - 0.018 * head_up
    return 0.0, pitch, yaw, z, x, 0.0


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

    max_error = max_pitch = max_yaw = 0.0
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
            data.qpos[:3] = root_start + np.array((x, y, z))
            data.qpos[3:7] = quaternion(roll, pitch, yaw)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            _, measured_pitch, measured_yaw = quaternion_to_rpy(data.qpos[3:7])
            max_pitch = max(max_pitch, abs(measured_pitch))
            max_yaw = max(max_yaw, abs(measured_yaw))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "look_around",
        "duration_s": DURATION_S,
        "visible_sequence": "head_down_hips_up_then_twist_left_then_twist_right_then_head_up_hips_down",
        "ground_contact_targets_used": True,
        "max_foot_site_error_m": max_error,
        "max_abs_pitch_deg": math.degrees(max_pitch),
        "max_abs_yaw_deg": math.degrees(max_yaw),
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
