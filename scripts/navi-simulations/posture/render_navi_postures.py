"""Render the Navi SDK posture commands as concise enter/hold/recover clips."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "actions"))
from render_navi_full_body_stretch import quaternion, solve_leg, smooth


COMMANDS = (
    "squat", "sit", "lie_down", "lie_on_elbows", "prostrate",
    "sphinx_lie", "sphinx_left_lie", "sphinx_right_lie",
    "stand_high", "stand_at_ease", "stand_at_attention",
)
DURATION_S = 4.2
PERSISTENT = {"lie_down", "stand_high"}


def amount(t: float, command: str) -> float:
    if t < 0.35:
        return 0.0
    if t < 1.15:
        return smooth((t - 0.35) / 0.80)
    if command in PERSISTENT:
        return 1.0
    if t < 2.45:
        return 1.0
    if t < 3.65:
        return 1.0 - smooth((t - 2.45) / 1.20)
    return 0.0


def target_pose(command: str) -> tuple[np.ndarray, tuple[float, float, float]]:
    poses = {
        "squat": (np.array((0.0, 0.0, -0.125)), (0.0, 0.0, 0.0)),
        "sit": (np.array((-0.018, 0.0, -0.105)), (0.0, math.radians(-18), 0.0)),
        "lie_down": (np.array((0.0, 0.0, -0.165)), (0.0, 0.0, 0.0)),
        "lie_on_elbows": (np.array((0.012, 0.0, -0.145)), (0.0, math.radians(11), 0.0)),
        "prostrate": (np.array((0.0, 0.0, -0.175)), (0.0, 0.0, 0.0)),
        "sphinx_lie": (np.array((-0.016, 0.0, -0.125)), (0.0, math.radians(-17), 0.0)),
        "sphinx_left_lie": (np.array((0.0, 0.020, -0.145)), (math.radians(23), 0.0, 0.0)),
        "sphinx_right_lie": (np.array((0.0, -0.020, -0.145)), (math.radians(-23), 0.0, 0.0)),
        "stand_high": (np.array((0.0, 0.0, 0.022)), (0.0, 0.0, 0.0)),
        "stand_at_ease": (np.zeros(3), (0.0, 0.0, 0.0)),
        "stand_at_attention": (np.array((0.0, 0.0, 0.018)), (0.0, 0.0, 0.0)),
    }
    return poses[command]


def foot_offset(command: str, leg: str) -> np.ndarray:
    left = leg.endswith("left")
    front = leg.startswith("front")
    side = 1.0 if left else -1.0
    offset = np.zeros(3)
    if command == "squat":
        offset[1] = 0.050 * side
    elif command == "sit" and not front:
        offset[0] = -0.040
        offset[1] = 0.025 * side
    elif command == "lie_down":
        offset[1] = 0.070 * side
        offset[0] = 0.025 if front else -0.025
    elif command == "lie_on_elbows":
        offset[1] = 0.045 * side
        offset[0] = 0.030 if front else -0.025
    elif command == "prostrate":
        offset[1] = 0.095 * side
        offset[0] = 0.050 if front else -0.050
    elif command == "sphinx_lie":
        offset[0] = 0.035 if front else -0.075
        offset[1] = 0.025 * side
    elif command in {"sphinx_left_lie", "sphinx_right_lie"}:
        lying_left = command == "sphinx_left_lie"
        lying_side = left == lying_left
        offset[1] = (0.055 if lying_left else -0.055) if lying_side else (-0.015 if lying_left else 0.015)
        offset[0] = 0.020 if front else -0.045
    elif command == "stand_at_ease" and leg == "front_left":
        offset[0] = 0.055
    elif command == "stand_at_attention":
        offset[1] = -0.035 * side
        offset[0] = -0.012 if front else 0.012
    return offset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=COMMANDS)
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
    root_delta, rotation = target_pose(args.command)

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.13)
    camera.distance = 1.45
    camera.azimuth = 125.0
    camera.elevation = -14.0

    max_error = 0.0
    minimum_root_height = float(root_start[2])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            active = amount(t, args.command)
            data.qpos[:3] = root_start + root_delta * active
            data.qpos[3:7] = quaternion(*(value * active for value in rotation))
            data.qvel[:6] = 0.0
            for leg in LEG_NAMES:
                target = feet[leg] + foot_offset(args.command, leg) * active
                q, error = solve_leg(model, data, controller, leg, target, controller.targets[LEG_INDEX[leg]])
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            minimum_root_height = min(minimum_root_height, float(data.qpos[2]))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {"command": args.command, "duration_s": DURATION_S, "persistent_pose": args.command in PERSISTENT,
               "max_foot_target_error_m": max_error, "minimum_root_height_m": minimum_root_height}
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
