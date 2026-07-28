"""Render Navi Agentech.pee() from the 02_pee.mp4 reference timeline."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco


TOTAL_DURATION_S = 20.03
LIFT_START_S = 6.35
POSE_START_S = 8.00
POSE_END_S = 15.25
LOWER_END_S = 17.10


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def pose_amount(time_s: float) -> float:
    if LIFT_START_S <= time_s < POSE_START_S:
        return smoothstep((time_s - LIFT_START_S) / (POSE_START_S - LIFT_START_S))
    if POSE_START_S <= time_s < POSE_END_S:
        return 1.0
    if POSE_END_S <= time_s < LOWER_END_S:
        return 1.0 - smoothstep((time_s - POSE_END_S) / (LOWER_END_S - POSE_END_S))
    return 0.0


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
    from controller import StandingPDController, leg_ik, quaternion_to_rpy
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_FOOT_Z
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    start_position = data.qpos[:3].copy()
    start_roll, start_pitch, start_yaw = quaternion_to_rpy(data.qpos[3:7])
    max_roll = max_pitch = max_displacement = 0.0
    min_height = float(data.qpos[2])

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps,
        codec="libx264", quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(TOTAL_DURATION_S * args.fps)):
            frame_time = frame_index / args.fps
            while float(data.time) + model.opt.timestep / 2.0 < frame_time:
                amount = pose_amount(float(data.time))
                # Hold the floating body level while the reference leg lifts.
                # This prevents the three unchanged standing legs from folding
                # under a large balance correction that is absent in the video.
                roll_now, pitch_now, yaw_now = quaternion_to_rpy(data.qpos[3:7])
                data.qfrc_applied[:] = 0.0
                data.qfrc_applied[0] = 180.0 * (start_position[0] - data.qpos[0]) - 18.0 * data.qvel[0]
                data.qfrc_applied[1] = 180.0 * (start_position[1] - data.qpos[1]) - 18.0 * data.qvel[1]
                data.qfrc_applied[3] = 8.0 * (start_roll - roll_now) - 1.2 * data.qvel[3]
                data.qfrc_applied[4] = 8.0 * (start_pitch - pitch_now) - 1.2 * data.qvel[4]
                data.qfrc_applied[5] = 5.0 * (start_yaw - yaw_now) - 0.8 * data.qvel[5]
                for leg_name in LEG_NAMES:
                    x = y = 0.0
                    z = STANDING_FOOT_Z
                    if leg_name == "hind_right":
                        # Lift the rear leg on the visible left side while the
                        # other three legs retain the standing target.
                        x = -0.020 * amount
                        y = -0.070 * amount
                        z += 0.115 * amount
                    controller.targets[LEG_INDEX[leg_name]] = leg_ik(x, y, z)
                controller.apply(data)
                mujoco.mj_step(model, data)
                roll, pitch, _ = quaternion_to_rpy(data.qpos[3:7])
                max_roll = max(max_roll, abs(roll))
                max_pitch = max(max_pitch, abs(pitch))
                min_height = min(min_height, float(data.qpos[2]))
                max_displacement = max(max_displacement, math.hypot(
                    float(data.qpos[0] - start_position[0]), float(data.qpos[1] - start_position[1])))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {"command": "pee", "max_abs_roll_deg": math.degrees(max_roll),
        "max_abs_pitch_deg": math.degrees(max_pitch), "minimum_body_height_m": min_height,
        "max_root_displacement_m": max_displacement, "duration_s": TOTAL_DURATION_S,
        "reference_motion_window_s": [LIFT_START_S, LOWER_END_S],
        "lifted_model_leg": "hind_right", "displayed_leg": "back_left",
        "body_level_stabilization": True}
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
