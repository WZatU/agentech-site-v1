"""Render the approved Navi Agentech.stand() motion for the SDK library.

The source Navi MuJoCo package is supplied separately because it contains the
robot model and meshes. This renderer keeps the approved motion parameters in
version control and writes the browser-ready MP4 into the website asset folder.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


LOW_LEG_TARGET = np.array((0.0, -1.15, 2.30), dtype=float)
LOW_JOINT_TARGETS = np.tile(LOW_LEG_TARGET, 4)
START_HOLD_S = 0.75
RISE_DURATION_S = 1.5
FINAL_HOLD_S = 1.5


def smoothstep(progress: float) -> float:
    progress = float(np.clip(progress, 0.0, 1.0))
    return progress * progress * (3.0 - 2.0 * progress)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model-root",
        type=Path,
        required=True,
        help="Path to the extracted Navi_MuJoCo package",
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    model_root = args.model_root.resolve()
    if not (model_root / "scene.xml").is_file():
        raise FileNotFoundError(f"Navi scene.xml was not found under {model_root}")

    sys.path.insert(0, str(model_root))
    from controller import StandingPDController
    from model_config import (
        FOOT_RADIUS,
        LOWER_LEG_LENGTH,
        STANDING_JOINT_TARGETS,
        UPPER_LEG_LENGTH,
    )
    from simulation import load_model, reset_to_keyframe

    low_body_height = (
        UPPER_LEG_LENGTH * math.cos(abs(LOW_LEG_TARGET[1]))
        + LOWER_LEG_LENGTH * math.cos(abs(LOW_LEG_TARGET[1]))
        + FOOT_RADIUS
    )

    def stand_target(time_s: float) -> np.ndarray:
        if time_s < START_HOLD_S:
            return LOW_JOINT_TARGETS.copy()
        if time_s < START_HOLD_S + RISE_DURATION_S:
            progress = smoothstep((time_s - START_HOLD_S) / RISE_DURATION_S)
            return LOW_JOINT_TARGETS + progress * (
                STANDING_JOINT_TARGETS - LOW_JOINT_TARGETS
            )
        return STANDING_JOINT_TARGETS.copy()

    model = load_model()
    data = mujoco.MjData(model)
    controller = StandingPDController(model)
    reset_to_keyframe(model, data, "standing")
    data.qpos[2] = low_body_height
    data.qpos[controller.qpos_addresses] = LOW_JOINT_TARGETS
    data.qvel[:] = 0.0
    data.ctrl[:] = 0.0
    mujoco.mj_forward(model, data)

    duration_s = START_HOLD_S + RISE_DURATION_S + FINAL_HOLD_S
    frame_count = round(duration_s * args.fps)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=args.height, width=args.width)
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
                controller.set_targets(stand_target(float(data.time)))
                controller.apply(data)
                mujoco.mj_step(model, data)
            renderer.update_scene(data, camera="side")
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    print(
        f"Rendered {frame_count} frames ({duration_s:.2f}s) to {args.output.resolve()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
