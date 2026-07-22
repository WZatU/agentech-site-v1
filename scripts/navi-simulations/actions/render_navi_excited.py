"""Render Navi's excited left-right hip motion with planted feet."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np

from render_navi_full_body_stretch import quaternion, solve_leg, smooth


DURATION_S = 3.4


def hip_sway(t: float) -> float:
    if t < 0.35 or t >= 3.05:
        return 0.0
    envelope = min(smooth((t - 0.35) / 0.30), smooth((3.05 - t) / 0.30))
    return math.sin(2.0 * math.pi * 1.55 * (t - 0.35)) * envelope


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
    camera.lookat[:] = (0.0, 0.0, 0.16)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_error = max_yaw = 0.0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            sway = hip_sway(t)
            yaw = math.radians(11.0) * sway

            # Pivot around the front shoulders so the rear/hips describe the
            # largest left-right arc while the forebody stays comparatively calm.
            pivot_length = 0.15
            x = pivot_length * (1.0 - math.cos(yaw))
            y = -pivot_length * math.sin(yaw)
            data.qpos[:3] = root_start + np.array((x, y, -0.008 * abs(sway)))
            data.qpos[3:7] = quaternion(0.0, 0.0, yaw)
            data.qvel[:6] = 0.0

            for leg in LEG_NAMES:
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            max_yaw = max(max_yaw, abs(yaw))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "excited",
        "duration_s": DURATION_S,
        "visible_sequence": "hips_left_right_then_stand",
        "hip_sway_cycles": 4,
        "max_abs_rear_yaw_deg": math.degrees(max_yaw),
        "max_foot_site_error_m": max_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
