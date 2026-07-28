"""Render Navi's full lucky-cat routine from recorded live joint poses."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


DURATION_S = 22.0
BASE = np.array((-.033, -.584, 1.412, .024, -.577, 1.401, -.061, -.638, 1.421, .059, -.629, 1.411))
DIVE = np.array((-.080, -.922, 1.739, .070, -.924, 1.754, -.192, -1.472, 2.557, .201, -1.464, 2.566))
LOW = np.array((-.002, -.704, .859, .108, -.682, .794, -.449, -1.949, 2.682, .496, -1.946, 2.684))
PAW_A = np.array((.077, .930, 2.047, -.251, -.474, 1.052, -.493, -1.845, 2.683, .453, -1.816, 2.683))
PAW_B = np.array((.073, 1.392, 2.110, -.256, -.472, 1.052, -.494, -1.845, 2.683, .453, -1.816, 2.683))
PAW_C = np.array((.072, 1.372, 1.265, -.257, -.471, 1.052, -.494, -1.845, 2.683, .453, -1.816, 2.683))
LOW_RETURN = np.array((.173, -.464, 1.762, -.305, -.493, 1.563, -.474, -1.697, 2.683, .414, -1.751, 2.683))
# First narrow the front stance without raising the right paw. Separating this
# pose removes the old planted-to-raised shoulder snap.
NARROW = LOW.copy()
NARROW[0] = PAW_A[0]
NARROW[3:6] = PAW_A[3:6]
VENDOR_LEG = {
    "front_right": slice(0, 3), "front_left": slice(3, 6),
    "hind_right": slice(6, 9), "hind_left": slice(9, 12),
}


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def mix(a: np.ndarray, b: np.ndarray, amount: float) -> np.ndarray:
    return a * (1.0 - amount) + b * amount


def phase(t: float) -> tuple[np.ndarray, float, float, bool]:
    if t < 0.5:
        return BASE, 0.0, 0.0, False
    if t < 3.1:
        u = smooth((t - .5) / 2.6)
        return mix(BASE, DIVE, u), -.090 * u, math.radians(7) * u, False
    if t < 5.7:
        u = smooth((t - 3.1) / 2.6)
        return mix(DIVE, LOW, u), -.090 - .035 * u, mix(np.array(math.radians(7)), np.array(math.radians(-22)), u).item(), False
    if t < 7.5:
        u = smooth((t - 5.7) / 1.8)
        return mix(LOW, NARROW, u), -.125, math.radians(-22), False
    if t < 9.0:
        u = smooth((t - 7.5) / 1.5)
        return mix(NARROW, PAW_B, u), -.125, math.radians(-22), True
    if t < 16.0:
        # The measured right-front paw extremes are repeated three times.
        cycle = 0.5 - 0.5 * math.cos(2.0 * math.pi * 3.0 * (t - 9.0) / 7.0)
        return mix(PAW_B, PAW_C, smooth(cycle)), -.125, math.radians(-22), True
    if t < 18.0:
        u = smooth((t - 16.0) / 2.0)
        return mix(PAW_C, LOW_RETURN, u), -.125, math.radians(-22), True
    if t < 21.2:
        u = smooth((t - 18.0) / 3.2)
        return mix(LOW_RETURN, BASE, u), -.125 * (1.0 - u), math.radians(-22) * (1.0 - u), False
    return BASE, 0.0, 0.0, False


def pitch_quaternion(pitch: float) -> np.ndarray:
    return np.array((math.cos(pitch / 2), 0.0, math.sin(pitch / 2), 0.0))


def solve_leg(model, data, controller, leg: str, target: np.ndarray, guess: np.ndarray):
    from model_config import LEG_INDEX
    leg_slice = LEG_INDEX[leg]
    qpos = controller.qpos_addresses[leg_slice]
    dof = controller.dof_addresses[leg_slice]
    site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
    q = guess.copy()
    jacp, jacr = np.zeros((3, model.nv)), np.zeros((3, model.nv))
    lower, upper = np.array((-1.134, -3.141, .436)), np.array((1.134, 2.792, 2.705))
    for _ in range(28):
        data.qpos[qpos] = q
        mujoco.mj_forward(model, data)
        error = target - data.site_xpos[site]
        if np.linalg.norm(error) < 2e-6:
            break
        mujoco.mj_jacSite(model, data, jacp, jacr, site)
        delta = np.linalg.lstsq(jacp[:, dof], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(delta, -.08, .08), lower, upper)
    data.qpos[qpos] = q
    mujoco.mj_forward(model, data)
    return q, float(np.linalg.norm(target - data.site_xpos[site]))


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
    from controller import StandingPDController
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_JOINT_TARGETS
    from simulation import load_model, reset_to_keyframe

    model, data = load_model(), None
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()
    mujoco.mj_forward(model, data)
    initial_feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, .13)
    camera.distance, camera.azimuth, camera.elevation = 1.48, 120.0, -14.0
    max_support_error = 0.0
    max_right_abad_step = 0.0
    minimum_foot_clearance = 1.0
    previous_right_abad = float(controller.targets[LEG_INDEX["front_right"]][0])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer = mujoco.Renderer(model, height=360, width=640)
    writer = imageio.get_writer(
        args.output, format="FFMPEG", mode="I", fps=args.fps, codec="libx264",
        quality=8, macro_block_size=1,
        ffmpeg_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(round(DURATION_S * args.fps)):
            t = frame_index / args.fps
            live, z, pitch, paw_raised = phase(t)
            previous_targets = controller.targets.copy()
            data.qpos[:3] = root_start + np.array((0.0, 0.0, z))
            data.qpos[3:7] = pitch_quaternion(pitch)
            data.qvel[:6] = 0.0
            raw_targets = {}
            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                raw_targets[leg] = np.clip(
                    STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + live[source] - BASE[source],
                    (-1.134, -3.141, .436), (1.134, 2.792, 2.705),
                )
                controller.targets[LEG_INDEX[leg]] = raw_targets[leg]
            data.qpos[controller.qpos_addresses] = controller.targets
            mujoco.mj_forward(model, data)
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                foot = data.site_xpos[site].copy()
                if paw_raised and leg == "front_right":
                    # Follow the measured paw position with continuous IK,
                    # seeded from the preceding frame so the shoulder cannot
                    # flip outward onto another solution branch.
                    foot[2] = max(foot[2], initial_feet[leg][2])
                    solved, error = solve_leg(
                        model, data, controller, leg, foot,
                        previous_targets[LEG_INDEX[leg]],
                    )
                    controller.targets[LEG_INDEX[leg]] = solved
                    max_support_error = max(max_support_error, error)
                    continue
                if leg.startswith("hind_"):
                    foot[:2] = initial_feet[leg][:2]
                foot[2] = initial_feet[leg][2]
                solved, error = solve_leg(model, data, controller, leg, foot, raw_targets[leg])
                controller.targets[LEG_INDEX[leg]] = solved
                max_support_error = max(max_support_error, error)
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[controller.dof_addresses] = 0.0
            mujoco.mj_forward(model, data)
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                clearance = float(data.site_xpos[site][2] - initial_feet[leg][2])
                minimum_foot_clearance = min(minimum_foot_clearance, clearance)
            right_abad = float(controller.targets[LEG_INDEX["front_right"]][0])
            max_right_abad_step = max(max_right_abad_step, abs(right_abad - previous_right_abad))
            previous_right_abad = right_abad
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": "lucky_cat", "style": "full", "duration_s": DURATION_S,
        "source": "10 live joint-state samples from Navi 192.168.4.65",
        "visible_sequence": "dive_then_head_up_hips_down_front_legs_narrow_right_paw_pulses_three_times_then_recovers",
        "right_paw_cycles": 3, "maximum_support_foot_error_m": max_support_error,
        "maximum_right_shoulder_frame_step_deg": math.degrees(max_right_abad_step),
        "minimum_foot_clearance_m": minimum_foot_clearance,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
