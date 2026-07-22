"""Render the first Navi reference actions with torque-only joint control."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco


ACTIONS = (
    "pee", "shake_hand", "knock", "hip_shake", "wave_hand", "bow", "wag_rear",
    "bark", "nod_head", "shake_head", "confused", "show_affection", "draw_heart",
    "dance", "cute",
    "ask_for_play", "enjoy_touch", "sniff_left", "sniff_ahead", "front_stretch",
    "full_body_stretch", "push_up", "look_around",
)
START_HOLD_S = 0.8
MOTION_DURATION_S = 4.0
STOP_HOLD_S = 1.2
TOTAL_DURATION_S = START_HOLD_S + MOTION_DURATION_S + STOP_HOLD_S


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=ACTIONS)
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def smooth_window(t: float, start: float, end: float, ramp: float = 0.35) -> float:
    if t <= start or t >= end:
        return 0.0
    return min(1.0, (t - start) / ramp, (end - t) / ramp)


def foot_targets(action: str, t: float, leg_name: str, standing_z: float, motion_end_s: float) -> tuple[float, float, float]:
    x = 0.0
    y = 0.0
    z = standing_z
    active = smooth_window(t, START_HOLD_S, motion_end_s, 0.25 if action == "wave_hand" else 0.35)
    phase = 2.0 * math.pi * (t - START_HOLD_S)

    if action == "pee":
        # Lift and open the hind-left leg while the other three remain planted.
        if leg_name == "hind_left":
            x = -0.020 * active
            y = 0.040 * active
            z += 0.060 * active
        elif leg_name.endswith("right"):
            z -= 0.006 * active
    elif action == "shake_hand":
        if leg_name == "front_right":
            wave = math.sin(phase * 0.65)
            x = (0.032 + 0.010 * wave) * active
            y = -0.012 * active
            z += 0.072 * active
        elif leg_name == "hind_left":
            z -= 0.008 * active
    elif action == "wave_hand":
        if leg_name == "front_right":
            x = 0.095 * active
            y = -0.006 * active
            z += 0.045 * active
        elif leg_name == "hind_left":
            z -= 0.006 * active
    elif action == "knock":
        if leg_name == "front_right":
            tap = 0.5 + 0.5 * math.sin(phase * 0.60)
            x = (0.018 + 0.050 * tap) * active
            z += (0.032 + 0.014 * tap) * active
        elif leg_name == "hind_left":
            z -= 0.008 * active
    elif action == "hip_shake":
        hind_wave = math.sin(phase * 1.25) * active
        if leg_name.startswith("hind"):
            y = 0.030 * hind_wave
            z += (0.012 if leg_name.endswith("left") else -0.012) * hind_wave
    elif action == "bow":
        if leg_name.startswith("front"):
            x = 0.040 * active
            z += 0.065 * active
        else:
            x = -0.015 * active
            z -= 0.006 * active
    elif action == "wag_rear":
        wag = math.sin(phase * 1.5) * active
        if leg_name.startswith("hind"):
            y = 0.038 * wag
            z += (0.010 if leg_name.endswith("left") else -0.010) * wag
        else:
            z -= 0.004 * active
    elif action == "bark":
        pulse = max(0.0, math.sin(phase * 1.35)) * active
        z += (0.025 * pulse if leg_name.startswith("front") else -0.008 * pulse)
        x += (0.014 * pulse if leg_name.startswith("front") else 0.0)
    elif action == "nod_head":
        nod = math.sin(phase * 1.15) * active
        z += (0.030 * nod if leg_name.startswith("front") else -0.012 * nod)
    elif action == "shake_head":
        shake = math.sin(phase * 1.15) * active
        x += (-0.022 if leg_name.endswith("left") else 0.022) * shake
    elif action == "confused":
        tilt = (0.65 + 0.35 * math.sin(phase * 0.65)) * active
        z += (0.026 if leg_name.endswith("left") else -0.012) * tilt
        if leg_name.startswith("front"):
            x += 0.012 * tilt
    elif action == "show_affection":
        sway = math.sin(phase * 0.75) * active
        z += (0.035 * active if leg_name.startswith("front") else -0.005 * active)
        y += 0.018 * sway
    elif action == "draw_heart":
        if leg_name == "front_right":
            heart_x = 0.038 + 0.014 * math.sin(phase)
            heart_y = -0.018 - 0.014 * math.sin(phase) * math.cos(phase)
            x = heart_x * active
            y = heart_y * active
            z += 0.073 * active
        elif leg_name == "hind_left":
            z -= 0.008 * active
    elif action == "dance":
        beat = math.sin(phase * 1.25) * active
        side = 1.0 if leg_name.endswith("left") else -1.0
        z += 0.018 * side * beat
        y += 0.020 * beat
    elif action == "cute":
        shimmy = math.sin(phase * 1.35) * active
        y += 0.024 * shimmy
        z += (0.012 if leg_name.endswith("left") else -0.012) * shimmy
    elif action == "ask_for_play":
        play = math.sin(phase * 0.75) * active
        if leg_name.startswith("front"):
            x += 0.045 * active
            z += 0.060 * active
        else:
            z -= 0.006 * active
        y += 0.015 * play
    elif action == "enjoy_touch":
        relax = math.sin(phase * 0.55) * active
        y += 0.016 * relax
        z += (0.014 if leg_name.endswith("left") else -0.014) * relax
    elif action == "sniff_left":
        if leg_name == "front_left":
            x += 0.035 * active
            y += 0.020 * active
            z += 0.060 * active
        elif leg_name.startswith("front"):
            z += 0.035 * active
    elif action == "sniff_ahead":
        if leg_name.startswith("front"):
            x += 0.035 * active
            z += 0.058 * active
    elif action == "front_stretch":
        if leg_name.startswith("front"):
            x += 0.065 * active
            z += 0.060 * active
        else:
            x -= 0.018 * active
    elif action == "full_body_stretch":
        x += (0.060 if leg_name.startswith("front") else -0.050) * active
        z += 0.030 * active
    elif action == "push_up":
        cycle = (0.5 + 0.5 * math.sin(phase * 1.0)) * active
        z += 0.050 * cycle
    elif action == "look_around":
        scan = math.sin(phase * 0.65) * active
        height = (0.5 + 0.5 * math.sin(phase * 0.35)) * active
        z += 0.026 * height
        x += (-0.020 if leg_name.endswith("left") else 0.020) * scan
    return x, y, z


def main() -> int:
    args = parse_args()
    model_root = args.model_root.resolve()
    sys.path.insert(0, str(model_root))
    from controller import StandingPDController, leg_ik, quaternion_to_rpy
    from model_config import LEG_INDEX, LEG_NAMES, STANDING_FOOT_Z
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    start_position = data.qpos[:3].copy()
    max_roll = max_pitch = max_displacement = 0.0
    min_height = float(data.qpos[2])
    motion_duration_s = 16.0 if args.action == "knock" else 1.5 if args.action == "wave_hand" else MOTION_DURATION_S
    motion_end_s = START_HOLD_S + motion_duration_s
    total_duration_s = motion_end_s + (0.63 if args.action == "wave_hand" else STOP_HOLD_S)

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance = 1.5
    camera.azimuth = 120.0
    camera.elevation = -15.0

    frame_count = round(total_duration_s * args.fps)
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
                for leg_name in LEG_NAMES:
                    x, y, z = foot_targets(args.action, float(data.time), leg_name, STANDING_FOOT_Z, motion_end_s)
                    controller.targets[LEG_INDEX[leg_name]] = leg_ik(x, y, z)
                controller.apply(data)
                mujoco.mj_step(model, data)
                roll, pitch, _ = quaternion_to_rpy(data.qpos[3:7])
                max_roll = max(max_roll, abs(roll))
                max_pitch = max(max_pitch, abs(pitch))
                min_height = min(min_height, float(data.qpos[2]))
                max_displacement = max(max_displacement, math.hypot(
                    float(data.qpos[0] - start_position[0]), float(data.qpos[1] - start_position[1])
                ))
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": args.action,
        "max_abs_roll_deg": math.degrees(max_roll),
        "max_abs_pitch_deg": math.degrees(max_pitch),
        "minimum_body_height_m": min_height,
        "max_root_displacement_m": max_displacement,
        "duration_s": total_duration_s,
        "root_position_assistance": False,
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
