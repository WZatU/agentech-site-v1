"""Render Navi pointing its left front leg straight toward the sky."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 5.6
LIFT_START_S = 0.45
HOLD_START_S = 1.55
HOLD_END_S = 3.55
RETURN_END_S = 4.75


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def lift_amount(t: float) -> float:
    if t < LIFT_START_S:
        return 0.0
    if t < HOLD_START_S:
        return smooth((t - LIFT_START_S) / (HOLD_START_S - LIFT_START_S))
    if t < HOLD_END_S:
        return 1.0
    if t < RETURN_END_S:
        return 1.0 - smooth((t - HOLD_END_S) / (RETURN_END_S - HOLD_END_S))
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
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_LEG_TARGET
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()

    # Keep a visible elbow bend while the left-front paw points upward. This
    # matches the real action more closely than a fully locked vertical leg.
    sky_pose = np.array((0.12, 2.72, 0.70), dtype=float)

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.18)
    camera.distance = 1.45
    camera.azimuth = 120.0
    camera.elevation = -14.0

    maximum_lift = 0.0
    minimum_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output,
        format="FFMPEG",
        mode="I",
        fps=args.fps,
        codec="libx264",
        quality=8,
        macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            lift = lift_amount(t)
            maximum_lift = max(maximum_lift, lift)

            data.qpos[:3] = root_start
            data.qpos[3:7] = np.array((1.0, 0.0, 0.0, 0.0))
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                target = STANDING_LEG_TARGET.copy()
                if leg == "front_left":
                    target = STANDING_LEG_TARGET * (1.0 - lift) + sky_pose * lift
                controller.targets[LEG_INDEX[leg]] = target

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
        "command": "point_to_sky",
        "direction": "left",
        "duration_s": DURATION_S,
        "visible_sequence": "left_front_leg_lifts_up_with_visible_elbow_bend_holds_then_returns_to_stand",
        "hold_duration_s": HOLD_END_S - HOLD_START_S,
        "pointing_joint_angle_deg": math.degrees(sky_pose[2]),
        "minimum_root_height_m": minimum_height,
        "maximum_lift_amount": maximum_lift,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
