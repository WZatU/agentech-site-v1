"""Render Navi's right-front-leg eating/pouring gesture."""

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


DURATION_S = 5.7


def lift_amount(t: float) -> float:
    if t < 0.25:
        return 0.0
    if t < 1.15:
        return smooth((t - 0.25) / 0.90)
    if t < 4.65:
        return 1.0
    if t < 5.45:
        return 1.0 - smooth((t - 4.65) / 0.80)
    return 0.0


def pour_amount(t: float) -> float:
    if 1.25 <= t < 4.45:
        envelope = min(smooth((t - 1.25) / 0.25), smooth((4.45 - t) / 0.25))
        return math.sin(2.0 * math.pi * 0.95 * (t - 1.25)) * envelope
    return 0.0


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
    standing_targets = controller.targets.copy()
    root_start = data.qpos[:3].copy()
    mujoco.mj_forward(model, data)
    feet = {leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy() for leg in LEG_NAMES}

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.18)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_ground_error = max_lift = 0.0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            lift = lift_amount(t)
            pour = pour_amount(t)
            max_lift = max(max_lift, lift)

            # Shift slightly away from the raised paw while the other three feet
            # remain at their original world positions.
            data.qpos[:3] = root_start + np.array((-0.004 * lift, 0.014 * lift, -0.014 * lift))
            data.qpos[3:7] = quaternion(0.0, -math.radians(6.0) * lift, 0.0)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                if leg == "front_right":
                    continue
                q, error = solve_leg(model, data, controller, leg, feet[leg], controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_ground_error = max(max_ground_error, error)

            # Fold the knee to a roughly 30-degree visible angle between the
            # upper and lower leg, then rock the hip for repeated pours.
            raised_pose = np.array((-0.10 + 0.06 * pour, math.radians(60.0) + 0.10 * pour, 2.27 + 0.04 * pour))
            right_slice = LEG_INDEX["front_right"]
            controller.targets[right_slice] = standing_targets[right_slice] * (1.0 - lift) + raised_pose * lift

            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "eat",
        "profile": "eating_only",
        "duration_s": DURATION_S,
        "source_video": "videos/actions/81_eating_only.mp4",
        "raised_leg": "front_right",
        "visible_upper_lower_leg_angle_deg": 50,
        "upper_leg_raise_angle_deg": 60,
        "pour_cycles": 3,
        "max_support_foot_error_m": max_ground_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
