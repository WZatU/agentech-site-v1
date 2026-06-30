from __future__ import annotations

import base64
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


COMMANDS = {
    "stand": [],
    "forward": [MuJoCoCommand("forward", {"speed": 0.3, "seconds": 1.0})],
    "backward": [MuJoCoCommand("backward", {"speed": 0.2, "seconds": 1.0})],
    "lateral_left": [MuJoCoCommand("lateral_left", {"speed": 0.2, "seconds": 1.0})],
    "lateral_right": [MuJoCoCommand("lateral_right", {"speed": 0.2, "seconds": 1.0})],
    "turn_left": [MuJoCoCommand("turn_left", {"angle": 45.0, "speed": 0.45})],
    "turn_right": [MuJoCoCommand("turn_right", {"angle": 45.0, "speed": 0.45})],
    "twist_left": [MuJoCoCommand("twist_left", {"angle": 28.0, "speed": 0.45})],
    "twist_right": [MuJoCoCommand("twist_right", {"angle": 28.0, "speed": 0.45})],
    "look_up": [MuJoCoCommand("look_up", {"angle": 15.0, "speed": 0.12})],
    "look_down": [MuJoCoCommand("look_down", {"angle": 15.0, "speed": 0.12})],
    "sit": [MuJoCoCommand("sit", {})],
    "stop": [MuJoCoCommand("stop", {})],
    "battery_status": [MuJoCoCommand("get_battery_status", {})],
}


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


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


def command_frames(preview: MuJoCoPreview, commands: list[MuJoCoCommand]) -> list[dict[str, float]]:
    if not commands:
        return []
    result = preview.run(commands, timestep_s=1 / FPS)
    return result.frames[1:]


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
    images[0].save(
        output,
        save_all=True,
        append_images=images[1:],
        duration=int(1000 / FPS),
        loop=0,
        optimize=True,
        disposal=2,
    )
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
        frames = base_stand + command_frames(preview, commands)
        max_frames = min(len(frames), 78)
        data_urls = preview.render_data_urls(frames, max_frames=max_frames, width=WIDTH, height=HEIGHT)
        save_gif(name, data_urls)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
