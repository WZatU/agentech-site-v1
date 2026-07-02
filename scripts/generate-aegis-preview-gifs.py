from __future__ import annotations

import base64
import io
import math
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SDK_ROOT = ROOT.parent / "agentech_sdk"
OUT_DIR = ROOT / "public" / "assets" / "products" / "aegis-previews"

sys.path.insert(0, str(SDK_ROOT))

from agentech import mujoco_sim as sim  # noqa: E402
from agentech.mujoco_sim import MuJoCoCommand, MuJoCoPreview  # noqa: E402


STAND_SECONDS = 4.0
FPS = 12
WIDTH = 520
HEIGHT = 360

STAND_POSE = {
    "FL_ABAD_JOINT": 0.0,
    "FL_HIP_JOINT": 0.58,
    "FL_KNEE_JOINT": -1.08,
    "FR_ABAD_JOINT": 0.0,
    "FR_HIP_JOINT": 0.58,
    "FR_KNEE_JOINT": -1.08,
    "RR_ABAD_JOINT": 0.0,
    "RR_HIP_JOINT": 0.58,
    "RR_KNEE_JOINT": -1.08,
    "RL_ABAD_JOINT": 0.0,
    "RL_HIP_JOINT": 0.58,
    "RL_KNEE_JOINT": -1.08,
}

LAY_POSE = {
    "FL_ABAD_JOINT": -0.28,
    "FL_HIP_JOINT": 1.05,
    "FL_KNEE_JOINT": -2.25,
    "FR_ABAD_JOINT": 0.28,
    "FR_HIP_JOINT": 1.05,
    "FR_KNEE_JOINT": -2.25,
    "RR_ABAD_JOINT": 0.28,
    "RR_HIP_JOINT": 1.05,
    "RR_KNEE_JOINT": -2.25,
    "RL_ABAD_JOINT": -0.28,
    "RL_HIP_JOINT": 1.05,
    "RL_KNEE_JOINT": -2.25,
}

LAY_BASE_Z = 0.2104
STAND_BASE_Z = 0.37
FLOOR_SIT_SECONDS = 3.0
EMERGENCY_STOP_SECONDS = 1.3
EMERGENCY_STOP_BASE_Z = 0.035

EMERGENCY_STOP_POSE = {
    "FL_ABAD_JOINT": 0.30,
    "FL_HIP_JOINT": 1.50,
    "FL_KNEE_JOINT": -2.90,
    "FR_ABAD_JOINT": -0.30,
    "FR_HIP_JOINT": 1.50,
    "FR_KNEE_JOINT": -2.90,
    "RR_ABAD_JOINT": -0.30,
    "RR_HIP_JOINT": 1.50,
    "RR_KNEE_JOINT": -2.90,
    "RL_ABAD_JOINT": 0.30,
    "RL_HIP_JOINT": 1.50,
    "RL_KNEE_JOINT": -2.90,
}

CROUCH_POSE = {
    **STAND_POSE,
    "FL_HIP_JOINT": 1.05,
    "FL_KNEE_JOINT": -1.75,
    "FR_HIP_JOINT": 1.05,
    "FR_KNEE_JOINT": -1.75,
    "RR_HIP_JOINT": 1.05,
    "RR_KNEE_JOINT": -1.75,
    "RL_HIP_JOINT": 1.05,
    "RL_KNEE_JOINT": -1.75,
}

FRONT_EXTEND_POSE = {
    "FL_ABAD_JOINT": 0.0,
    "FL_HIP_JOINT": 0.99,
    "FL_KNEE_JOINT": -1.64,
    "FR_ABAD_JOINT": 0.0,
    "FR_HIP_JOINT": 0.99,
    "FR_KNEE_JOINT": -1.64,
    "RR_ABAD_JOINT": CROUCH_POSE["RR_ABAD_JOINT"],
    "RR_HIP_JOINT": CROUCH_POSE["RR_HIP_JOINT"],
    "RR_KNEE_JOINT": CROUCH_POSE["RR_KNEE_JOINT"],
    "RL_ABAD_JOINT": CROUCH_POSE["RL_ABAD_JOINT"],
    "RL_HIP_JOINT": CROUCH_POSE["RL_HIP_JOINT"],
    "RL_KNEE_JOINT": CROUCH_POSE["RL_KNEE_JOINT"],
}

TAKEOFF_POSE = {
    **FRONT_EXTEND_POSE,
    "RR_HIP_JOINT": CROUCH_POSE["RR_HIP_JOINT"],
    "RR_KNEE_JOINT": CROUCH_POSE["RR_KNEE_JOINT"],
    "RL_HIP_JOINT": CROUCH_POSE["RL_HIP_JOINT"],
    "RL_KNEE_JOINT": CROUCH_POSE["RL_KNEE_JOINT"],
}

TUCK_POSE = {
    "FL_ABAD_JOINT": -0.10,
    "FL_HIP_JOINT": 1.34,
    "FL_KNEE_JOINT": -2.28,
    "FR_ABAD_JOINT": 0.10,
    "FR_HIP_JOINT": 1.34,
    "FR_KNEE_JOINT": -2.28,
    "RR_ABAD_JOINT": 0.10,
    "RR_HIP_JOINT": 1.18,
    "RR_KNEE_JOINT": -2.12,
    "RL_ABAD_JOINT": -0.10,
    "RL_HIP_JOINT": 1.18,
    "RL_KNEE_JOINT": -2.12,
}

FRONT_LAND_POSE = {
    "FL_ABAD_JOINT": 0.0,
    "FL_HIP_JOINT": 0.70,
    "FL_KNEE_JOINT": -0.95,
    "FR_ABAD_JOINT": 0.0,
    "FR_HIP_JOINT": 0.70,
    "FR_KNEE_JOINT": -0.95,
    "RR_ABAD_JOINT": 0.10,
    "RR_HIP_JOINT": 1.24,
    "RR_KNEE_JOINT": -2.08,
    "RL_ABAD_JOINT": -0.10,
    "RL_HIP_JOINT": 1.24,
    "RL_KNEE_JOINT": -2.08,
}

REAR_LAND_POSE = STAND_POSE

BACKFLIP_SECONDS = 4.2
BACKFLIP_CROUCH_BASE_Z = 0.27
BACKFLIP_JUMP_HEIGHT = 0.56
BACKFLIP_BACKWARD_DISTANCE = -0.44
BACKFLIP_FRONT_LANDING_PITCH = -2.0 * math.pi + 0.42
BACKFLIP_REAR_SETTLE_PITCH = -2.0 * math.pi
BACKFLIP_FRONT_TOUCHDOWN_BASE_Z = STAND_BASE_Z - 0.04
BACKFLIP_REAR_TOUCHDOWN_BASE_Z = STAND_BASE_Z


COMMANDS = {
    "stand": [],
    "forward": [MuJoCoCommand("forward", {"speed": 0.3, "seconds": 1.0})],
    "backward": [MuJoCoCommand("backward", {"speed": 0.2, "seconds": 1.0})],
    "lateral_left": [MuJoCoCommand("lateral_left", {"speed": 0.2, "seconds": 1.0})],
    "lateral_right": [MuJoCoCommand("lateral_right", {"speed": 0.2, "seconds": 1.0})],
    "turn_left": [MuJoCoCommand("turn_left", {"angle": 45.0, "speed": 0.45})],
    "turn_right": [MuJoCoCommand("turn_right", {"angle": 45.0, "speed": 0.45})],
    "twist_left": [],
    "twist_right": [],
    "backflip": [],
    "look_up": [MuJoCoCommand("look_up", {"angle": 15.0, "speed": 0.12})],
    "look_down": [MuJoCoCommand("look_down", {"angle": 15.0, "speed": 0.12})],
    "sit": [MuJoCoCommand("sit", {})],
    "stop": [MuJoCoCommand("stop", {})],
    "emergency_stop": [],
    "battery_status": [MuJoCoCommand("get_battery_status", {})],
}


TWIST_SECONDS = 2.2
TWIST_LEFT_KEYFRAMES = [{'base': (0.0, -0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': -0.0,
             'FL_HIP_JOINT': 0.58,
             'FL_KNEE_JOINT': -1.08,
             'FR_ABAD_JOINT': -0.0,
             'FR_HIP_JOINT': 0.58,
             'FR_KNEE_JOINT': -1.08,
             'RL_ABAD_JOINT': -0.0,
             'RL_HIP_JOINT': 0.58,
             'RL_KNEE_JOINT': -1.08,
             'RR_ABAD_JOINT': -0.0,
             'RR_HIP_JOINT': 0.58,
             'RR_KNEE_JOINT': -1.08},
  't': 0.0,
  'yaw': 0.0},
 {'base': (0.0, -0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': -0.06,
             'FL_HIP_JOINT': 0.5515,
             'FL_KNEE_JOINT': -1.1225,
             'FR_ABAD_JOINT': -0.0525,
             'FR_HIP_JOINT': 0.598,
             'FR_KNEE_JOINT': -1.0095,
             'RL_ABAD_JOINT': 0.0575,
             'RL_HIP_JOINT': 0.4945,
             'RL_KNEE_JOINT': -1.025,
             'RR_ABAD_JOINT': 0.064,
             'RR_HIP_JOINT': 0.651,
             'RR_KNEE_JOINT': -1.119},
  't': 0.25,
  'yaw': 0.12217305},
 {'base': (0.0, -0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': -0.1275,
             'FL_HIP_JOINT': 0.5275,
             'FL_KNEE_JOINT': -1.16,
             'FR_ABAD_JOINT': -0.0975,
             'FR_HIP_JOINT': 0.622,
             'FR_KNEE_JOINT': -0.9405,
             'RL_ABAD_JOINT': 0.1065,
             'RL_HIP_JOINT': 0.3825,
             'RL_KNEE_JOINT': -0.931,
             'RR_ABAD_JOINT': 0.137,
             'RR_HIP_JOINT': 0.711,
             'RR_KNEE_JOINT': -1.149},
  't': 0.5,
  'yaw': 0.2443461},
 {'base': (0.0, -0.0, 0.3685),
  'joints': {'FL_ABAD_JOINT': -0.199,
             'FL_HIP_JOINT': 0.5035,
             'FL_KNEE_JOINT': -1.184,
             'FR_ABAD_JOINT': -0.134,
             'FR_HIP_JOINT': 0.6385,
             'FR_KNEE_JOINT': -0.853,
             'RL_ABAD_JOINT': 0.1475,
             'RL_HIP_JOINT': 0.2735,
             'RL_KNEE_JOINT': -0.846,
             'RR_ABAD_JOINT': 0.2135,
             'RR_HIP_JOINT': 0.7585,
             'RR_KNEE_JOINT': -1.1725},
  't': 0.75,
  'yaw': 0.36651914},
 {'base': (0.0, -0.0, 0.3685),
  'joints': {'FL_ABAD_JOINT': -0.274,
             'FL_HIP_JOINT': 0.479,
             'FL_KNEE_JOINT': -1.1865,
             'FR_ABAD_JOINT': -0.16,
             'FR_HIP_JOINT': 0.64,
             'FR_KNEE_JOINT': -0.7355,
             'RL_ABAD_JOINT': 0.179,
             'RL_HIP_JOINT': 0.1435,
             'RL_KNEE_JOINT': -0.7235,
             'RR_ABAD_JOINT': 0.292,
             'RR_HIP_JOINT': 0.7795,
             'RR_KNEE_JOINT': -1.1665},
  't': 1.0,
  'yaw': 0.48869219}]

TWIST_RIGHT_KEYFRAMES = [{'base': (0.0, 0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': 0.0,
             'FL_HIP_JOINT': 0.58,
             'FL_KNEE_JOINT': -1.08,
             'FR_ABAD_JOINT': 0.0,
             'FR_HIP_JOINT': 0.58,
             'FR_KNEE_JOINT': -1.08,
             'RL_ABAD_JOINT': 0.0,
             'RL_HIP_JOINT': 0.58,
             'RL_KNEE_JOINT': -1.08,
             'RR_ABAD_JOINT': 0.0,
             'RR_HIP_JOINT': 0.58,
             'RR_KNEE_JOINT': -1.08},
  't': 0.0,
  'yaw': -0.0},
 {'base': (0.0, 0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': 0.0525,
             'FL_HIP_JOINT': 0.598,
             'FL_KNEE_JOINT': -1.0095,
             'FR_ABAD_JOINT': 0.06,
             'FR_HIP_JOINT': 0.5515,
             'FR_KNEE_JOINT': -1.1225,
             'RL_ABAD_JOINT': -0.064,
             'RL_HIP_JOINT': 0.651,
             'RL_KNEE_JOINT': -1.119,
             'RR_ABAD_JOINT': -0.0575,
             'RR_HIP_JOINT': 0.4945,
             'RR_KNEE_JOINT': -1.025},
  't': 0.25,
  'yaw': -0.12217305},
 {'base': (0.0, 0.0, 0.37),
  'joints': {'FL_ABAD_JOINT': 0.0975,
             'FL_HIP_JOINT': 0.622,
             'FL_KNEE_JOINT': -0.9405,
             'FR_ABAD_JOINT': 0.1275,
             'FR_HIP_JOINT': 0.5275,
             'FR_KNEE_JOINT': -1.16,
             'RL_ABAD_JOINT': -0.137,
             'RL_HIP_JOINT': 0.711,
             'RL_KNEE_JOINT': -1.149,
             'RR_ABAD_JOINT': -0.1065,
             'RR_HIP_JOINT': 0.3825,
             'RR_KNEE_JOINT': -0.931},
  't': 0.5,
  'yaw': -0.2443461},
 {'base': (0.0, 0.0, 0.3685),
  'joints': {'FL_ABAD_JOINT': 0.134,
             'FL_HIP_JOINT': 0.6385,
             'FL_KNEE_JOINT': -0.853,
             'FR_ABAD_JOINT': 0.199,
             'FR_HIP_JOINT': 0.5035,
             'FR_KNEE_JOINT': -1.184,
             'RL_ABAD_JOINT': -0.2135,
             'RL_HIP_JOINT': 0.7585,
             'RL_KNEE_JOINT': -1.1725,
             'RR_ABAD_JOINT': -0.1475,
             'RR_HIP_JOINT': 0.2735,
             'RR_KNEE_JOINT': -0.846},
  't': 0.75,
  'yaw': -0.36651914},
 {'base': (0.0, 0.0, 0.3685),
  'joints': {'FL_ABAD_JOINT': 0.16,
             'FL_HIP_JOINT': 0.64,
             'FL_KNEE_JOINT': -0.7355,
             'FR_ABAD_JOINT': 0.274,
             'FR_HIP_JOINT': 0.479,
             'FR_KNEE_JOINT': -1.1865,
             'RL_ABAD_JOINT': -0.292,
             'RL_HIP_JOINT': 0.7795,
             'RL_KNEE_JOINT': -1.1665,
             'RR_ABAD_JOINT': -0.179,
             'RR_HIP_JOINT': 0.1435,
             'RR_KNEE_JOINT': -0.7235},
  't': 1.0,
  'yaw': -0.4886921905584123}]


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix_pose(a: dict[str, float], b: dict[str, float], t: float) -> dict[str, float]:
    t = smoothstep(t)
    return {name: mix(a[name], b[name], t) for name in STAND_POSE}


def stand_frames() -> list[dict[str, float]]:
    frames: list[dict[str, float]] = []
    count = int(STAND_SECONDS * FPS)
    for index in range(count):
        time_s = index / FPS
        progress = smoothstep((index + 1) / count)
        root_z = mix(LAY_BASE_Z, STAND_BASE_Z, progress)
        frames.append(
            {
                "x": 0.0,
                "y": 0.0,
                "root_x": 0.0,
                "root_y": 0.0,
                "root_z": root_z,
                "z": root_z,
                "yaw": 0.0,
                "pitch": 0.0,
                "gait_phase": 0.0,
                "gait_settle": 0.0,
                "gait_direction": 1.0,
                "stand_progress": progress,
                "time_s": time_s,
            }
        )
    for index in range(FPS // 2):
        frames.append({**frames[-1], "time_s": STAND_SECONDS + index / FPS})
    return frames


def backflip_pose(elapsed: float) -> tuple[float, float, float, dict[str, float]]:
    t = elapsed / BACKFLIP_SECONDS

    if t < 0.18:
        phase = t / 0.18
        x = mix(0.0, BACKFLIP_BACKWARD_DISTANCE * 0.03, smoothstep(phase))
        return x, 0.0, mix(STAND_BASE_Z, BACKFLIP_CROUCH_BASE_Z, smoothstep(phase)), mix_pose(STAND_POSE, CROUCH_POSE, phase)

    if t < 0.30:
        phase = (t - 0.18) / 0.12
        base_z = mix(BACKFLIP_CROUCH_BASE_Z, STAND_BASE_Z + 0.05, smoothstep(phase))
        x = mix(BACKFLIP_BACKWARD_DISTANCE * 0.03, BACKFLIP_BACKWARD_DISTANCE * 0.10, smoothstep(phase))
        return x, -0.14 * smoothstep(phase), base_z, mix_pose(CROUCH_POSE, FRONT_EXTEND_POSE, phase)

    if t < 0.40:
        phase = (t - 0.30) / 0.10
        base_z = mix(STAND_BASE_Z + 0.05, STAND_BASE_Z + 0.16, smoothstep(phase))
        x = mix(BACKFLIP_BACKWARD_DISTANCE * 0.10, BACKFLIP_BACKWARD_DISTANCE * 0.24, smoothstep(phase))
        return x, mix(-0.14, -0.42, smoothstep(phase)), base_z, mix_pose(FRONT_EXTEND_POSE, TAKEOFF_POSE, phase)

    if t < 0.80:
        phase = (t - 0.40) / 0.40
        eased = smoothstep(phase)
        pitch = mix(-0.42, BACKFLIP_FRONT_LANDING_PITCH, eased)
        arc = math.sin(math.pi * phase)
        base_z = mix(STAND_BASE_Z + 0.16, BACKFLIP_FRONT_TOUCHDOWN_BASE_Z, eased) + BACKFLIP_JUMP_HEIGHT * arc
        x = mix(BACKFLIP_BACKWARD_DISTANCE * 0.24, BACKFLIP_BACKWARD_DISTANCE * 0.92, eased)
        if phase < 0.55:
            joints = mix_pose(TAKEOFF_POSE, TUCK_POSE, phase / 0.55)
        else:
            joints = mix_pose(TUCK_POSE, FRONT_LAND_POSE, (phase - 0.55) / 0.45)
        return x, pitch, base_z, joints

    if t < 1.0:
        phase = (t - 0.80) / 0.20
        x = mix(BACKFLIP_BACKWARD_DISTANCE * 0.92, BACKFLIP_BACKWARD_DISTANCE, smoothstep(phase))
        base_z = mix(BACKFLIP_FRONT_TOUCHDOWN_BASE_Z, BACKFLIP_REAR_TOUCHDOWN_BASE_Z, smoothstep(phase))
        pitch = mix(BACKFLIP_FRONT_LANDING_PITCH, BACKFLIP_REAR_SETTLE_PITCH, smoothstep(phase))
        return x, pitch, base_z, mix_pose(FRONT_LAND_POSE, REAR_LAND_POSE, phase)

    return BACKFLIP_BACKWARD_DISTANCE, BACKFLIP_REAR_SETTLE_PITCH, BACKFLIP_REAR_TOUCHDOWN_BASE_Z, REAR_LAND_POSE


def backflip_frames(start_time_s: float) -> list[dict[str, object]]:
    frames: list[dict[str, object]] = []
    count = int(BACKFLIP_SECONDS * FPS)
    for index in range(count):
        elapsed = index / FPS
        root_x, pitch, root_z, joints = backflip_pose(elapsed)
        frames.append(
            {
                "x": root_x,
                "y": 0.0,
                "root_x": root_x,
                "root_y": 0.0,
                "root_z": root_z,
                "z": root_z,
                "yaw": 0.0,
                "pitch": -math.degrees(pitch),
                "gait_phase": 0.0,
                "gait_settle": 0.0,
                "gait_direction": 1.0,
                "stand_progress": 1.0,
                "time_s": start_time_s + elapsed,
                "joints": joints,
                "clip_joints": False,
            }
        )
    for index in range(FPS // 2):
        frames.append({**frames[-1], "time_s": frames[-1]["time_s"] + (index + 1) / FPS})
    return frames


def command_frames(preview: MuJoCoPreview, commands: list[MuJoCoCommand]) -> list[dict[str, float]]:
    if not commands:
        return []
    result = preview.run(commands, timestep_s=1 / FPS)
    return result.frames[1:]


def interpolated_twist_keyframe(
    keyframes: list[dict[str, object]], t: float
) -> tuple[float, tuple[float, float, float], dict[str, float]]:
    if t <= 0.0:
        frame = keyframes[0]
        return frame["yaw"], frame["base"], frame["joints"]
    if t >= 1.0:
        frame = keyframes[-1]
        return frame["yaw"], frame["base"], frame["joints"]

    for left, right in zip(keyframes, keyframes[1:]):
        if left["t"] <= t <= right["t"]:
            span_t = smoothstep((t - left["t"]) / (right["t"] - left["t"]))
            yaw = mix(left["yaw"], right["yaw"], span_t)
            base = tuple(mix(a, b, span_t) for a, b in zip(left["base"], right["base"]))
            joints = {
                name: mix(left["joints"][name], right["joints"][name], span_t)
                for name in STAND_POSE
            }
            return yaw, base, joints

    frame = keyframes[-1]
    return frame["yaw"], frame["base"], frame["joints"]


def twist_frames(keyframes: list[dict[str, object]], start_time_s: float) -> list[dict[str, object]]:
    frames: list[dict[str, object]] = []
    count = int(TWIST_SECONDS * FPS)
    for index in range(count):
        t = smoothstep((index + 1) / count)
        yaw, base, joints = interpolated_twist_keyframe(keyframes, t)
        root_x, root_y, root_z = base
        frames.append(
            {
                "x": root_x,
                "y": root_y,
                "root_x": root_x,
                "root_y": root_y,
                "root_z": root_z,
                "z": root_z,
                "yaw": math.degrees(yaw),
                "pitch": 0.0,
                "gait_phase": 0.0,
                "gait_settle": 0.0,
                "gait_direction": 1.0,
                "stand_progress": 1.0,
                "time_s": start_time_s + index / FPS,
                "joints": joints,
            }
        )
    return frames


def floor_sit_frames(start_time_s: float) -> list[dict[str, object]]:
    frames: list[dict[str, object]] = []
    count = int(FLOOR_SIT_SECONDS * FPS)
    for index in range(count):
        progress = smoothstep((index + 1) / count)
        root_z = mix(STAND_BASE_Z, LAY_BASE_Z, progress)
        joints = {
            name: mix(STAND_POSE[name], LAY_POSE[name], progress)
            for name in STAND_POSE
        }
        frames.append(
            {
                "x": 0.0,
                "y": 0.0,
                "root_x": 0.0,
                "root_y": 0.0,
                "root_z": root_z,
                "z": root_z,
                "yaw": 0.0,
                "pitch": 0.0,
                "gait_phase": 0.0,
                "gait_settle": 0.0,
                "gait_direction": 1.0,
                "stand_progress": 1.0,
                "time_s": start_time_s + index / FPS,
                "joints": joints,
            }
        )
    return frames


def emergency_stop_frames(start_time_s: float) -> list[dict[str, object]]:
    frames: list[dict[str, object]] = []
    count = int(EMERGENCY_STOP_SECONDS * FPS)
    for index in range(count):
        progress = smoothstep((index + 1) / count)
        root_z = mix(STAND_BASE_Z, EMERGENCY_STOP_BASE_Z, progress)
        joints = {
            name: mix(STAND_POSE[name], EMERGENCY_STOP_POSE[name], progress)
            for name in STAND_POSE
        }
        frames.append(
            {
                "x": 0.0,
                "y": 0.0,
                "root_x": 0.0,
                "root_y": 0.0,
                "root_z": root_z,
                "z": root_z,
                "yaw": 0.0,
                "pitch": 0.0,
                "gait_phase": 0.0,
                "gait_settle": 0.0,
                "gait_direction": 1.0,
                "stand_progress": 1.0,
                "time_s": start_time_s + index / FPS,
                "joints": joints,
                "clip_joints": False,
            }
        )
    return frames


def render_data_urls(preview: MuJoCoPreview, frames: list[dict[str, object]], *, max_frames: int) -> list[str]:
    if not any("joints" in frame for frame in frames):
        return preview.render_data_urls(frames, max_frames=max_frames, width=WIDTH, height=HEIGHT)

    try:
        import mujoco
    except ImportError as exc:
        raise RuntimeError("Install MuJoCo support before generating Aegis preview GIFs.") from exc

    model = sim._build_ff_preview_model(mujoco, preview.model_path, width=WIDTH, height=HEIGHT)
    sim._style_aegis_model(model, mujoco)
    data = mujoco.MjData(model)
    root_qpos = int(model.jnt_qposadr[0]) if model.njnt else 0
    joint_addresses = sim._joint_qpos_addresses(model, mujoco)
    renderer = mujoco.Renderer(model, height=HEIGHT, width=WIDTH)
    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE

    stride = max(1, len(frames) // max_frames)
    selected = frames[::stride][:max_frames]
    if selected[-1] is not frames[-1]:
        selected.append(frames[-1])

    images: list[str] = []
    try:
        for frame in selected:
            yaw_rad = math.radians(float(frame.get("yaw", 0.0)))
            pitch_rad = math.radians(float(frame.get("pitch", 0.0)))
            x = float(frame.get("x", 0.0))
            y = float(frame.get("y", 0.0))
            root_x = float(frame.get("root_x", x))
            root_y = float(frame.get("root_y", y))
            root_z = float(frame.get("root_z", frame.get("z", sim.STAND_ROOT_Z)))
            gait_phase = float(frame.get("gait_phase", 0.0))
            gait_settle = float(frame.get("gait_settle", 0.0))
            gait_direction = float(frame.get("gait_direction", 1.0))
            stand_progress = float(frame.get("stand_progress", 1.0))
            time_s = float(frame.get("time_s", 0.0))

            data.qpos[:] = 0.0
            data.qvel[:] = 0.0
            data.qpos[root_qpos : root_qpos + 3] = [root_x, root_y, root_z]
            data.qpos[root_qpos + 3 : root_qpos + 7] = sim._quat_from_yaw_pitch(yaw_rad, -pitch_rad)
            joints = frame.get("joints")
            if isinstance(joints, dict):
                for joint_name, value in joints.items():
                    address = joint_addresses.get(joint_name)
                    if address is not None:
                        data.qpos[address] = (
                            sim._clip_joint(model, mujoco, joint_name, float(value))
                            if frame.get("clip_joints", True)
                            else float(value)
                        )
            else:
                sim._apply_ff_demo_gait(
                    model,
                    mujoco,
                    data,
                    joint_addresses,
                    gait_phase,
                    gait_settle,
                    gait_direction,
                    float(frame.get("pitch", 0.0)),
                    stand_progress,
                )
            mujoco.mj_forward(model, data)
            sim._update_ff_demo_camera(model, mujoco, data, camera, time_s)
            renderer.update_scene(data, camera=camera)
            image = Image.fromarray(renderer.render())
            buffer = io.BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            images.append(f"data:image/png;base64,{encoded}")
    finally:
        renderer.close()

    return images


def decode_data_url(url: str) -> Image.Image:
    encoded = url.split(",", 1)[1]
    path = OUT_DIR / "_frame.png"
    path.write_bytes(base64.b64decode(encoded))
    image = Image.open(path).convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
    path.unlink(missing_ok=True)
    return image


def save_gif(name: str, data_urls: list[str]) -> None:
    images = [decode_data_url(url) for url in data_urls]
    output = OUT_DIR / f"{name}.gif"
    temp_output = OUT_DIR / f"{name}.tmp.gif"
    images[0].save(
        temp_output,
        save_all=True,
        append_images=images[1:],
        duration=int(1000 / FPS),
        loop=0,
        optimize=True,
        disposal=2,
    )
    temp_output.replace(output)
    print(f"wrote {output.relative_to(ROOT)} ({len(images)} frames)")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Reuse the SDK renderer but replace its old damping start with the correct
    # lay-to-stand pose from aegis_lay_to_stand_simple.py.
    sim.DAMPING_POSE = LAY_POSE
    sim.DAMPING_ROOT_Z = LAY_BASE_Z

    preview = MuJoCoPreview.aegis()
    base_stand = stand_frames()
    for name, commands in COMMANDS.items():
        if name == "twist_left":
            frames = base_stand + twist_frames(TWIST_LEFT_KEYFRAMES, base_stand[-1]["time_s"] + 1 / FPS)
        elif name == "twist_right":
            frames = base_stand + twist_frames(TWIST_RIGHT_KEYFRAMES, base_stand[-1]["time_s"] + 1 / FPS)
        elif name == "backflip":
            frames = backflip_frames(0.0)
        elif name == "sit":
            frames = floor_sit_frames(0.0)
        elif name == "emergency_stop":
            frames = emergency_stop_frames(0.0)
        else:
            frames = base_stand + command_frames(preview, commands)
        max_frames = min(len(frames), 78)
        data_urls = render_data_urls(preview, frames, max_frames=max_frames)
        save_gif(name, data_urls)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
