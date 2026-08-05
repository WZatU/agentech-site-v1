"""Render a measured Navi action as a MuJoCo motion-replay preview."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np


VENDOR_JOINT_NAMES = (
    "front_right_abad_joint", "front_right_hip_joint", "front_right_knee_joint",
    "front_left_abad_joint", "front_left_hip_joint", "front_left_knee_joint",
    "hind_right_abad_joint", "hind_right_hip_joint", "hind_right_knee_joint",
    "hind_left_abad_joint", "hind_left_hip_joint", "hind_left_knee_joint",
)
INTENTIONALLY_LIFTED_LEGS = {
    "prepare_camera": {"front_left"},
    "drink": {"front_left"},
    "apply_toothpaste": {"front_left"},
    "brush_teeth_horizontal_30s": {"front_left"},
    "brush_teeth_back_and_forth_30s": {"front_left"},
    "brush_teeth_horizontal_23s": {"front_left"},
    "raise_camera": {"front_left"},
    "photo_wave_hand": {"front_left"},
    "brush_teeth_vertical_30s": {"front_left"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--command", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--metrics", type=Path, required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--lead-in", type=float, default=2.0)
    return parser.parse_args()


def euler_quaternion(roll: float, pitch: float, yaw: float) -> np.ndarray:
    cr, sr = math.cos(roll / 2.0), math.sin(roll / 2.0)
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return np.array((
        cr * cp * cy + sr * sp * sy,
        sr * cp * cy - cr * sp * sy,
        cr * sp * cy + sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
    ))


def sample_time_s(sample: dict) -> float:
    stamp = sample.get("message", {}).get("header", {}).get("stamp", {})
    if "secs" in stamp:
        return float(stamp["secs"]) + float(stamp.get("nsecs", 0)) * 1e-9
    return float(sample["wall_time_s"])


def measured_rows(payload: dict, lead_in: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    action_start = float(payload["action_started_wall_time_s"])
    rows: list[tuple[float, list[float], list[float]]] = []
    for sample in payload["samples"]:
        if sample.get("topic") != "/alphadog_node/robot_ctrl_status":
            continue
        status = sample.get("message", {}).get("status", {}).get("current_status", {})
        body = status.get("body", {})
        legs = status.get("legs", ())
        if len(legs) != 4:
            continue
        joints = [float(joint["q"]) for leg in legs for joint in leg.get("joints", ())]
        if len(joints) != 12:
            continue
        body_pose = [float(body[key]) for key in ("x", "y", "z", "roll", "pitch", "yaw")]
        rows.append((sample_time_s(sample) - action_start, joints, body_pose))
    if len(rows) < 2 or max(row[0] for row in rows) < 0.25:
        rows = []
        for sample in payload["samples"]:
            if sample.get("topic") != "/alphadog_node/joint_states":
                continue
            message = sample.get("message", {})
            names = tuple(message.get("name", ()))
            positions = tuple(message.get("position", ()))
            if len(names) != 12 or len(positions) != 12:
                continue
            by_name = dict(zip(names, positions))
            if any(name not in by_name for name in VENDOR_JOINT_NAMES):
                continue
            joints = [float(by_name[name]) for name in VENDOR_JOINT_NAMES]
            # The lower-rate fallback still provides measured motor positions;
            # keep the MuJoCo floating base fixed when synchronized body data
            # was unavailable on the recorder connection.
            rows.append((
                sample_time_s(sample) - action_start,
                joints,
                [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            ))
    if len(rows) < 2:
        raise ValueError("capture does not contain enough measured motor samples")
    rows.sort(key=lambda row: row[0])
    clip_start = max(rows[0][0], -lead_in)
    rows = [row for row in rows if row[0] >= clip_start]
    times = np.array([row[0] - clip_start for row in rows], dtype=float)
    joints = np.array([row[1] for row in rows], dtype=float)
    body = np.array([row[2] for row in rows], dtype=float)
    body[:, 5] = np.unwrap(body[:, 5])
    return times, joints, body


def interpolate(times: np.ndarray, values: np.ndarray, t: float) -> np.ndarray:
    return np.array([np.interp(t, times, values[:, index]) for index in range(values.shape[1])])


def solve_foot_target(
    model: mujoco.MjModel,
    data: mujoco.MjData,
    controller: object,
    leg_slice: slice,
    site_id: int,
    target: np.ndarray,
    lower: np.ndarray,
    upper: np.ndarray,
) -> float:
    qpos = controller.qpos_addresses[leg_slice]
    dof = controller.dof_addresses[leg_slice]
    q = data.qpos[qpos].copy()
    jac_pos = np.zeros((3, model.nv))
    jac_rot = np.zeros((3, model.nv))
    for _ in range(32):
        data.qpos[qpos] = q
        mujoco.mj_forward(model, data)
        error = target - data.site_xpos[site_id]
        if np.linalg.norm(error) < 2e-5:
            break
        mujoco.mj_jacSite(model, data, jac_pos, jac_rot, site_id)
        step = np.linalg.lstsq(jac_pos[:, dof], error, rcond=1e-5)[0]
        q = np.clip(q + np.clip(step, -0.08, 0.08), lower, upper)
    # If a full fixed contact point is unreachable in the measured body pose,
    # prioritize exact floor height so a support foot never floats or sinks.
    for _ in range(20):
        data.qpos[qpos] = q
        mujoco.mj_forward(model, data)
        vertical_error = float(target[2] - data.site_xpos[site_id][2])
        if abs(vertical_error) < 2e-5:
            break
        mujoco.mj_jacSite(model, data, jac_pos, jac_rot, site_id)
        gradient = jac_pos[2, dof]
        denominator = float(np.dot(gradient, gradient)) + 1e-8
        q = np.clip(q + np.clip(gradient * vertical_error / denominator, -0.05, 0.05), lower, upper)
    data.qpos[qpos] = q
    mujoco.mj_forward(model, data)
    return float(np.linalg.norm(target - data.site_xpos[site_id]))


def compress_idle_timeline(
    source_times: np.ndarray, joints: np.ndarray, body: np.ndarray
) -> np.ndarray:
    """Keep measured motion timing while shortening long motionless controller holds."""

    joint_change = np.max(np.abs(np.diff(joints, axis=0)), axis=1)
    translation_change = np.linalg.norm(np.diff(body[:, :3], axis=0), axis=1)
    rotation_change = np.max(np.abs(np.diff(body[:, 3:], axis=0)), axis=1)
    active_interval = (
        (joint_change > 0.0025)
        | (translation_change > 0.0008)
        | (rotation_change > 0.0015)
    )
    if not np.any(active_interval):
        source_duration = float(source_times[-1])
        target_duration = min(source_duration, 3.0)
        return source_times * (target_duration / source_duration)
    active_sample = np.r_[active_interval, active_interval[-1]]
    padded_active = active_sample.copy()
    active_times = source_times[active_sample]
    for active_time in active_times:
        padded_active |= np.abs(source_times - active_time) <= 0.5

    replay_times = np.zeros_like(source_times)
    for index in range(1, len(source_times)):
        source_dt = source_times[index] - source_times[index - 1]
        scale = 1.0 if padded_active[index] or padded_active[index - 1] else 0.04
        replay_times[index] = replay_times[index - 1] + source_dt * scale
    return replay_times


def main() -> int:
    args = parse_args()
    payload = json.loads(args.capture.read_text(encoding="utf-8"))
    if payload.get("action") != args.command:
        raise ValueError(f"capture action is {payload.get('action')!r}, not {args.command!r}")
    source_times, vendor_joints, body = measured_rows(payload, args.lead_in)
    times = compress_idle_timeline(source_times, vendor_joints, body)
    sparse_body_sway_reconstruction = (
        args.command in {"enjoy_eating", "main_brush"} and len(source_times) < 30
    )
    replay_speed = 1.0
    if args.command == "main_brush":
        # The firmware routine runs for roughly two minutes. Speed up its
        # repeating measured body-sway cycle so the reference card is useful.
        replay_speed = 8.0
        times = times / replay_speed
    elif args.command in {
        "brush_teeth_horizontal_30s",
        "brush_teeth_back_and_forth_30s",
        "brush_teeth_horizontal_23s",
        "brush_teeth_vertical_30s",
    }:
        replay_speed = 2.5
        times = times / replay_speed

    sys.path.insert(0, str(args.model_root.resolve()))
    from controller import StandingPDController
    from model_config import JOINT_LIMITS, JOINT_ORDER, LEG_INDEX, LEG_NAMES
    from simulation import load_model, reset_to_keyframe

    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = StandingPDController(model)
    root_start = data.qpos[:3].copy()
    body_start = body[0].copy()
    vendor_start = vendor_joints[0].copy()
    vendor_index = {name: index for index, name in enumerate(VENDOR_JOINT_NAMES)}
    model_from_vendor = np.array([vendor_index[name] for name in JOINT_ORDER], dtype=int)
    foot_sites = {
        leg: mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
        for leg in LEG_NAMES
    }
    lower = np.array([JOINT_LIMITS[name][0] for name in JOINT_ORDER], dtype=float)
    upper = np.array([JOINT_LIMITS[name][1] for name in JOINT_ORDER], dtype=float)
    mujoco.mj_forward(model, data)
    ground_z = float(np.mean([data.site_xpos[site][2] for site in foot_sites.values()]))
    data.qpos[controller.qpos_addresses] = vendor_start[model_from_vendor]
    mujoco.mj_forward(model, data)
    ground_targets = {
        leg: np.array((*data.site_xpos[site][:2], ground_z), dtype=float)
        for leg, site in foot_sites.items()
    }
    lifted_legs = INTENTIONALLY_LIFTED_LEGS.get(args.command, set())
    support_legs = tuple(leg for leg in LEG_NAMES if leg not in lifted_legs)

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance, camera.azimuth, camera.elevation = 1.48, 120.0, -14.0

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
    duration = float(times[-1])
    max_support_foot_error = 0.0
    max_support_vertical_error = 0.0
    try:
        for frame_index in range(math.ceil(duration * args.fps) + 1):
            t = min(frame_index / args.fps, duration)
            live_vendor = interpolate(times, vendor_joints, t)
            relative_body = interpolate(times, body, t) - body_start
            if sparse_body_sway_reconstruction:
                # These routines encode a planted-feet body sway as a common
                # shift across all four abad joints. Transfer that common mode
                # to the floating body instead of showing four sliding legs.
                abad = np.array((0, 3, 6, 9))
                common_abad = float(np.mean(live_vendor[abad] - vendor_start[abad]))
                live_vendor[abad] -= common_abad
                relative_body[1] -= 0.28 * common_abad
                relative_body[3] -= 0.45 * common_abad
            shutter = 0.0
            if args.command == "take_photo":
                progress = t / max(duration, 1e-6)
                shutter = max(0.0, 1.0 - abs(progress - 0.48) / 0.055)
                nod = max(0.0, 1.0 - abs(progress - 0.52) / 0.20)
                relative_body[2] -= 0.014 * nod
                relative_body[4] -= 0.10 * nod
            live_model = live_vendor[model_from_vendor]
            for index, name in enumerate(JOINT_ORDER):
                live_model[index] = np.clip(live_model[index], *JOINT_LIMITS[name])
            data.qpos[:3] = root_start + relative_body[:3]
            data.qpos[3:7] = euler_quaternion(*relative_body[3:6])
            data.qpos[controller.qpos_addresses] = live_model
            data.qvel[:] = 0.0
            mujoco.mj_forward(model, data)
            if args.command not in {"enjoy_eating", "main_brush", "take_photo"}:
                current_centroid = np.mean(
                    [data.site_xpos[foot_sites[leg]] for leg in support_legs], axis=0
                )
                target_centroid = np.mean(
                    [ground_targets[leg] for leg in support_legs], axis=0
                )
                data.qpos[:3] += target_centroid - current_centroid
                mujoco.mj_forward(model, data)
            for leg in support_legs:
                leg_slice = LEG_INDEX[leg]
                error = solve_foot_target(
                    model,
                    data,
                    controller,
                    leg_slice,
                    foot_sites[leg],
                    ground_targets[leg],
                    lower[leg_slice],
                    upper[leg_slice],
                )
                max_support_foot_error = max(max_support_foot_error, error)
                max_support_vertical_error = max(
                    max_support_vertical_error,
                    abs(float(data.site_xpos[foot_sites[leg]][2] - ground_targets[leg][2])),
                )
            renderer.update_scene(data, camera=camera)
            frame = renderer.render()
            if shutter:
                frame = np.clip(frame * (1.0 - 0.78 * shutter) + 255.0 * 0.78 * shutter, 0, 255).astype(np.uint8)
            writer.append_data(frame)
    finally:
        writer.close()
        renderer.close()

    compact_profile = {
        "schema_version": 1,
        "command": args.command,
        "source": "physical_navi_robot_ctrl_status",
        "source_sha256": hashlib.sha256(args.capture.read_bytes()).hexdigest(),
        "joint_names": list(VENDOR_JOINT_NAMES),
        "body_fields": ["x", "y", "z", "roll", "pitch", "yaw"],
        "samples": [
            {
                "time_s": round(float(t), 6),
                "source_time_s": round(float(source_t), 6),
                "joints": q.tolist(),
                "body": pose.tolist(),
            }
            for t, source_t, q, pose in zip(times, source_times, vendor_joints, body)
        ],
    }
    args.profile.parent.mkdir(parents=True, exist_ok=True)
    args.profile.write_text(json.dumps(compact_profile, separators=(",", ":")) + "\n", encoding="utf-8")

    joint_span = np.ptp(vendor_joints, axis=0)
    body_delta = body - body_start
    metrics = {
        "command": args.command,
        "duration_s": duration,
        "source_duration_s": float(source_times[-1]),
        "replay_speed": replay_speed,
        "fps": args.fps,
        "measured_samples": len(times),
        "median_sample_rate_hz": (
            float(1.0 / np.median(np.diff(source_times))) if len(source_times) > 1 else 0.0
        ),
        "source": "physical Navi controller telemetry",
        "maximum_joint_excursion_rad": float(joint_span.max()),
        "maximum_body_translation_m": float(np.linalg.norm(body_delta[:, :3], axis=1).max()),
        "maximum_abs_relative_roll_rad": float(np.abs(body_delta[:, 3]).max()),
        "maximum_abs_relative_pitch_rad": float(np.abs(body_delta[:, 4]).max()),
        "intentionally_lifted_legs": sorted(lifted_legs),
        "maximum_support_foot_error_m": max_support_foot_error,
        "maximum_support_vertical_error_m": max_support_vertical_error,
        "capture_sha256": compact_profile["source_sha256"],
        "visual_correction": ({
            "look_at_food": "measured_crouch_with_all_four_feet_inverse-kinematics-pinned_to_ground",
            "enjoy_eating": "common_abad_motion_rendered_as_planted-feet_body_sway",
            "main_brush": "common_abad_motion_rendered_as_planted-feet_body_sway_and_accelerated_for_preview",
            "take_photo": "camera_shutter_flash_and_body_shutter_nod_for_unmodeled_camera_hardware",
        }.get(args.command) if args.command not in {"enjoy_eating", "main_brush"} or sparse_body_sway_reconstruction else None),
    }
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
