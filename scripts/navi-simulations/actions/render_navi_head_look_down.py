"""Render head_up_down and look_down from their recorded action references."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np

from render_navi_full_body_stretch import quaternion, solve_leg, smooth, window


DURATIONS = {"head_up_down": 6.8, "look_down": 5.0}


def head_up_down_pose(t: float) -> tuple[np.ndarray, float]:
    head_down = window(t, 0.35, 1.20, 2.10, 2.80)
    head_up = window(t, 2.55, 3.45, 4.65, 5.65)
    pitch = math.radians(18.0) * head_down - math.radians(20.0) * head_up
    root = np.array((0.020 * head_down - 0.020 * head_up, 0.0, -0.026 * (head_down + head_up)))
    return root, pitch


def look_down_pose(t: float) -> tuple[float, float]:
    low = window(t, 0.20, 1.05, 3.85, 4.70)
    if 1.05 <= t < 3.85:
        phase = (t - 1.05) / 2.80
        pulses = (0.5 - 0.5 * math.cos(4.0 * math.pi * phase)) * low
    else:
        pulses = 0.0
    return low, pulses


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=DURATIONS)
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
    camera.lookat[:] = (0.0, 0.0, 0.14)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    max_error = max_pitch = 0.0
    minimum_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATIONS[args.action] * args.fps)):
            t = frame_index / args.fps
            if args.action == "head_up_down":
                root_delta, pitch = head_up_down_pose(t)
                low = pulses = 0.0
            else:
                low, pulses = look_down_pose(t)
                pitch = math.radians(7.0) * low + math.radians(4.0) * pulses
                root_delta = np.array((0.018 * low + 0.008 * pulses, 0.0, -0.158 * low - 0.006 * pulses))

            data.qpos[:3] = root_start + root_delta
            data.qpos[3:7] = quaternion(0.0, pitch, 0.0)
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                target = feet[leg].copy()
                if args.action == "look_down":
                    front = leg.startswith("front")
                    side = 1.0 if leg.endswith("left") else -1.0
                    target += np.array(((0.065 if front else -0.040) * low, 0.065 * side * low, 0.0))
                q, error = solve_leg(model, data, controller, leg, target, controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            max_pitch = max(max_pitch, abs(pitch))
            minimum_height = min(minimum_height, float(data.qpos[2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    source = "51_head_up_down.mp4" if args.action == "head_up_down" else "108_look_down.mp4"
    metrics = {
        "command": args.action,
        "duration_s": DURATIONS[args.action],
        "source_video": f"videos/actions/{source}",
        "max_foot_target_error_m": max_error,
        "max_abs_pitch_deg": math.degrees(max_pitch),
        "minimum_root_height_m": minimum_height,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
