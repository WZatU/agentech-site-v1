"""Render the long rear-puff action from the recorded long_fart reference."""

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


DURATION_S = 6.2


def motion(t: float) -> tuple[float, float]:
    if t < 0.30:
        lowered = 0.0
    elif t < 1.05:
        lowered = smooth((t - 0.30) / 0.75)
    elif t < 5.15:
        lowered = 1.0
    elif t < 5.90:
        lowered = 1.0 - smooth((t - 5.15) / 0.75)
    else:
        lowered = 0.0

    if 1.05 <= t < 5.05:
        envelope = min(smooth((t - 1.05) / 0.25), smooth((5.05 - t) / 0.25))
        shake = math.sin(2.0 * math.pi * 1.25 * (t - 1.05)) * envelope
    else:
        shake = 0.0
    return lowered, shake


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
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_error = max_yaw = 0.0
    minimum_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            lowered, shake = motion(t)
            pitch = -math.radians(17.0) * lowered
            yaw = math.radians(10.0) * shake * lowered

            # Rotate about the front shoulders: the forebody stays nearly fixed
            # while the lowered rear body swings from side to side.
            pivot_length = 0.15
            x = pivot_length * (1.0 - math.cos(pitch)) + pivot_length * (1.0 - math.cos(yaw))
            y = -pivot_length * math.sin(yaw)
            z = pivot_length * math.sin(pitch)
            data.qpos[:3] = root_start + np.array((x, y, z))
            data.qpos[3:7] = quaternion(0.0, pitch, yaw)
            data.qvel[:6] = 0.0

            for leg in LEG_NAMES:
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            max_yaw = max(max_yaw, abs(yaw))
            minimum_height = min(minimum_height, float(data.qpos[2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "rear_puff",
        "profile": "long_fart",
        "duration_s": DURATION_S,
        "source_video": "videos/actions/69_long_fart.mp4",
        "visible_sequence": "hips_down_then_rear_shake_then_stand",
        "max_foot_site_error_m": max_error,
        "max_abs_rear_yaw_deg": math.degrees(max_yaw),
        "minimum_root_height_m": minimum_height,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
