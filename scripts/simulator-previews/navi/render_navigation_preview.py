"""Render approved Navi directional MuJoCo previews from one shared pipeline."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco


START_HOLD_S = 0.75
MOTION_DURATION_S = 3.0
STOP_HOLD_S = 1.25
TOTAL_DURATION_S = START_HOLD_S + MOTION_DURATION_S + STOP_HOLD_S

COMMANDS = {
    "lateral_right": "strafe_right",
    "diagonal_left": "diagonal_left",
    "diagonal_right": "diagonal_right",
    "turn_left": "turn_left",
    "turn_right": "turn_right",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=sorted(COMMANDS))
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def scheduled_command(time_s: float, command: str) -> str:
    if START_HOLD_S <= time_s < START_HOLD_S + MOTION_DURATION_S:
        return COMMANDS[command]
    return "stand"


def wrapped_degrees(start: float, end: float) -> float:
    return math.degrees((end - start + math.pi) % (2.0 * math.pi) - math.pi)


def main() -> int:
    args = parse_args()
    model_root = args.model_root.resolve()
    sys.path.insert(0, str(model_root))
    import controller as controller_module
    from controller import TrotGaitController, quaternion_to_rpy
    from simulation import load_model, reset_to_keyframe

    # Tuned for visible displacement without root-position assistance.
    controller_module.STEP_FREQUENCY = 1.30
    controller_module.LATERAL_STEP_LENGTH = 0.090
    controller_module.LATERAL_LEAN_FOOT_DELTA = 0.006
    controller_module.STEP_HEIGHT = 0.045
    controller_module.TURN_STEP_LENGTH = 0.080

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = TrotGaitController(model)
    start_position = data.qpos[:3].copy()
    start_yaw = quaternion_to_rpy(data.qpos[3:7])[2]
    active_position = start_position.copy()
    active_yaw = start_yaw
    max_roll = 0.0
    max_pitch = 0.0
    minimum_body_height = float(data.qpos[2])

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.7
    camera.azimuth = 135.0 if "diagonal" in args.command else 90.0
    camera.elevation = -18.0

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
                controller.set_command(scheduled_command(float(data.time), args.command))
                controller.apply(data)
                mujoco.mj_step(model, data)
                roll, pitch, yaw = quaternion_to_rpy(data.qpos[3:7])
                max_roll = max(max_roll, abs(roll))
                max_pitch = max(max_pitch, abs(pitch))
                minimum_body_height = min(minimum_body_height, float(data.qpos[2]))
                if float(data.time) <= START_HOLD_S + MOTION_DURATION_S:
                    active_position = data.qpos[:3].copy()
                    active_yaw = yaw
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": args.command,
        "body_dx_m": float(active_position[0] - start_position[0]),
        "body_dy_m": float(active_position[1] - start_position[1]),
        "body_yaw_deg": wrapped_degrees(start_yaw, active_yaw),
        "max_abs_roll_rad": max_roll,
        "max_abs_pitch_rad": max_pitch,
        "minimum_body_height_m": minimum_body_height,
        "root_position_assistance": False,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
