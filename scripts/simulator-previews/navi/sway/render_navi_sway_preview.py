"""Render Navi Agentech.sway() with planted feet and torque actuators."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco


TOTAL_DURATION_S = 17.03
SWAY_START_S = 5.00
SWAY_END_S = 8.75
SWAY_CYCLES = 2.0
SWAY_FOOT_DELTA_M = 0.018


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    model_root = args.model_root.resolve()
    sys.path.insert(0, str(model_root))

    from controller import StandingPDController, leg_ik, quaternion_to_rpy
    from model_config import LEG_INDEX, LEG_NAMES, SIDE_SIGN, STANDING_FOOT_Z
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    start_position = data.qpos[:3].copy()
    max_abs_roll = 0.0
    max_abs_pitch = 0.0
    max_root_displacement = 0.0
    minimum_body_height = float(data.qpos[2])

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    frame_count = round(TOTAL_DURATION_S * args.fps)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264",
        quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(frame_count):
            frame_time = frame_index / args.fps
            while float(data.time) + model.opt.timestep / 2.0 < frame_time:
                time_s = float(data.time)
                if SWAY_START_S <= time_s < SWAY_END_S:
                    progress = (time_s - SWAY_START_S) / (SWAY_END_S - SWAY_START_S)
                    envelope = math.sin(math.pi * progress) ** 2
                    sway = math.sin(2.0 * math.pi * SWAY_CYCLES * progress) * envelope
                else:
                    sway = 0.0
                for leg_name in LEG_NAMES:
                    foot_z = STANDING_FOOT_Z + SIDE_SIGN[leg_name] * SWAY_FOOT_DELTA_M * sway
                    controller.targets[LEG_INDEX[leg_name]] = leg_ik(0.0, 0.0, foot_z)
                controller.apply(data)
                mujoco.mj_step(model, data)
                roll, pitch, _ = quaternion_to_rpy(data.qpos[3:7])
                max_abs_roll = max(max_abs_roll, abs(roll))
                max_abs_pitch = max(max_abs_pitch, abs(pitch))
                minimum_body_height = min(minimum_body_height, float(data.qpos[2]))
                displacement = math.hypot(
                    float(data.qpos[0] - start_position[0]),
                    float(data.qpos[1] - start_position[1]),
                )
                max_root_displacement = max(max_root_displacement, displacement)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "sway",
        "max_abs_roll_deg": math.degrees(max_abs_roll),
        "max_abs_pitch_deg": math.degrees(max_abs_pitch),
        "max_root_displacement_m": max_root_displacement,
        "minimum_body_height_m": minimum_body_height,
        "duration_s": TOTAL_DURATION_S,
        "reference_motion_window_s": [SWAY_START_S, SWAY_END_S],
        "body_lowering": False,
        "root_position_assistance": False,
        "feet_commanded_to_step": False,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
