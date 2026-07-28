"""Render Navi's lie-down, two full-leg swim strokes, and stand-up action."""

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


DURATION_S = 6.8
SWIM_START_S = 1.65
SWIM_END_S = 5.05
SWIM_STROKES = 2


def lie_amount(t: float) -> float:
    if t < 0.25:
        return 0.0
    if t < 1.35:
        return smooth((t - 0.25) / 1.10)
    if t < 5.35:
        return 1.0
    if t < 6.50:
        return 1.0 - smooth((t - 5.35) / 1.15)
    return 0.0


def swim_amount(t: float) -> float:
    if not SWIM_START_S <= t < SWIM_END_S:
        return 0.0
    u = (t - SWIM_START_S) / (SWIM_END_S - SWIM_START_S)
    envelope = min(smooth(u / 0.10), smooth((1.0 - u) / 0.10))
    # Two simultaneous extend-retract strokes. At each peak, both front legs
    # are straight toward the head and both rear legs are straight behind.
    stroke = 0.5 - 0.5 * math.cos(2.0 * math.pi * SWIM_STROKES * u)
    return envelope * stroke


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
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_JOINT_TARGETS
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()
    mujoco.mj_forward(model, data)
    feet = {
        leg: data.site_xpos[
            mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
        ].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.12)
    camera.distance = 1.48
    camera.azimuth = 132.0
    camera.elevation = -13.0

    max_error = max_lift = 0.0
    minimum_knee_angle = math.inf
    minimum_height = float(root_start[2])
    recovery_start_targets: np.ndarray | None = None
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
            lying = lie_amount(t)
            stroke = swim_amount(t)

            # Keep the belly visibly low without allowing the body or extended
            # limbs to pass through the floor plane.
            data.qpos[:3] = root_start + np.array((0.0, 0.0, -0.142 * lying))
            data.qpos[3:7] = quaternion(0.0, math.radians(2.0) * lying, 0.0)
            data.qvel[:6] = 0.0

            for leg in LEG_NAMES:
                front = leg.startswith("front")
                left = leg.endswith("left")
                # Fold the legs beside the lowered body, then straighten all
                # four together: front feet reach forward and rear feet reach
                # backward. The small inward shift keeps each pair aligned.
                rest_x = 0.045 if front else -0.045
                side = 1.0 if left else -1.0
                direction = 1.0 if front else -1.0
                offset = np.array((rest_x, 0.065 * side, 0.015)) * lying
                offset += np.array(
                    (
                        0.185 * direction,
                        -0.035 * side,
                        0.032,
                    )
                ) * stroke

                q, error = solve_leg(
                    model,
                    data,
                    controller,
                    leg,
                    feet[leg] + offset,
                    controller.targets[LEG_INDEX[leg]],
                )
                # The reference action visibly locks the upper and lower leg
                # into one line at full reach. Blend the knee almost to zero
                # at each stroke peak instead of retaining the standing bend.
                straight_hip = 1.48 if front else -1.48
                q[0] = q[0] * (1.0 - stroke)
                q[1] = q[1] * (1.0 - stroke) + straight_hip * stroke
                q[2] = q[2] * (1.0 - stroke) + 0.02 * stroke
                controller.targets[LEG_INDEX[leg]] = q
                max_error = max(max_error, error)
                max_lift = max(max_lift, float(offset[2]))
                minimum_knee_angle = min(minimum_knee_angle, float(q[2]))

            # Freeze the settled post-stroke pose, then blend every joint to
            # the canonical standing target. This prevents either rear leg
            # from selecting the mirrored IK branch during stand-up.
            if t >= 5.10:
                if recovery_start_targets is None:
                    recovery_start_targets = controller.targets.copy()
                recovery = smooth((t - 5.10) / 1.40)
                controller.targets = (
                    recovery_start_targets * (1.0 - recovery)
                    + STANDING_JOINT_TARGETS * recovery
                )

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
        "command": "swim",
        "duration_s": DURATION_S,
        "visible_sequence": "lie_down_then_all_four_legs_extend_and_retract_twice_then_stand",
        "stroke_count": SWIM_STROKES,
        "minimum_root_height_m": minimum_height,
        "maximum_foot_lift_m": max_lift,
        "minimum_knee_angle_deg": math.degrees(minimum_knee_angle),
        "max_foot_site_error_m": max_error,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
