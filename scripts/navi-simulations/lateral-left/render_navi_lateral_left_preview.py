"""Render the Navi lateral-left SDK Library preview."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco


START_HOLD_S = 0.75
MOTION_DURATION_S = 3.0
STOP_HOLD_S = 1.5
TOTAL_DURATION_S = START_HOLD_S + MOTION_DURATION_S + STOP_HOLD_S
STEP_FREQUENCY_HZ = 1.30
LATERAL_STEP_LENGTH_M = 0.090
LATERAL_LEAN_FOOT_DELTA_M = 0.006
LATERAL_STEP_HEIGHT_M = 0.045


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def scheduled_command(time_s: float) -> str:
    if time_s < START_HOLD_S:
        return "stand"
    if time_s < START_HOLD_S + MOTION_DURATION_S:
        return "strafe_left"
    return "stand"


def main() -> int:
    args = parse_args()
    model_root = args.model_root.resolve()
    if not (model_root / "scene.xml").is_file():
        raise FileNotFoundError(f"Navi scene.xml was not found under {model_root}")

    sys.path.insert(0, str(model_root))
    import controller as controller_module
    from controller import TrotGaitController
    from simulation import load_model, reset_to_keyframe

    controller_module.STEP_FREQUENCY = STEP_FREQUENCY_HZ
    controller_module.LATERAL_STEP_LENGTH = LATERAL_STEP_LENGTH_M
    controller_module.LATERAL_LEAN_FOOT_DELTA = LATERAL_LEAN_FOOT_DELTA_M
    controller_module.STEP_HEIGHT = LATERAL_STEP_HEIGHT_M

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = TrotGaitController(model)

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.04, 0.15)
    camera.distance = 1.5
    camera.azimuth = 90.0
    camera.elevation = -15.0

    frame_count = round(TOTAL_DURATION_S * args.fps)
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
        for frame_index in range(frame_count):
            frame_time = frame_index / args.fps
            while float(data.time) + model.opt.timestep / 2.0 < frame_time:
                controller.set_command(scheduled_command(float(data.time)))
                controller.apply(data)
                mujoco.mj_step(model, data)
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    print(f"Rendered {frame_count} frames to {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
