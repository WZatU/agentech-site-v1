from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import imageio.v2 as imageio
import mujoco
import numpy as np
from PIL import Image, ImageDraw, ImageFont


FPS = 30
DURATION_SECONDS = 4
WIDTH = 640
HEIGHT = 640


JOINT_DEMOS = {
    "head-yaw": ("head_yaw_joint", 0.0, 0.35, "HEAD YAW", "turn left / right"),
    "head-pitch": ("head_pitch_joint", 0.0, 0.22, "HEAD PITCH", "look up / down"),
    "shoulder-pitch": ("right_shoulder_pitch_joint", 0.0, 0.42, "SHOULDER PITCH", "arm forward / back"),
    "shoulder-roll": ("right_shoulder_roll_joint", -0.42, 0.26, "SHOULDER ROLL", "arm out / in"),
    "shoulder-yaw": ("right_shoulder_yaw_joint", 0.0, 0.42, "SHOULDER YAW", "upper-arm twist"),
    "elbow": ("right_elbow_joint", 0.0, -0.78, "ELBOW FLEXION", "bend / extend"),
    "wrist-yaw": ("right_wrist_yaw_joint", 0.0, 0.55, "WRIST YAW", "turn hand left / right"),
    "wrist-pitch": ("right_wrist_pitch_joint", 0.0, 0.32, "WRIST PITCH", "hand up / down"),
    "wrist-roll": ("right_wrist_roll_joint", 0.18, 0.42, "WRIST ROLL", "rotate palm"),
}


# Move the demonstration arm away from the torso before animating it. This keeps
# the hand and forearm outside the robot body instead of visually clipping through
# the chest while an individual axis is isolated.
SAFE_ARM_POSES = {
    "shoulder-pitch": {"right_shoulder_roll_joint": -0.38},
    "shoulder-roll": {},
    "shoulder-yaw": {"right_shoulder_roll_joint": -0.38, "right_elbow_joint": -0.30},
    "elbow": {"right_shoulder_roll_joint": -0.42},
    "wrist-yaw": {"right_shoulder_roll_joint": -0.42, "right_elbow_joint": -0.68},
    "wrist-pitch": {"right_shoulder_roll_joint": -0.42, "right_elbow_joint": -0.68},
    "wrist-roll": {"right_shoulder_roll_joint": -0.42, "right_elbow_joint": -0.68},
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ["arialbd.ttf", "segoeuib.ttf"] if bold else ["arial.ttf", "segoeui.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def add_labels(frame: np.ndarray, title: str, direction: str) -> np.ndarray:
    image = Image.fromarray(frame)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((28, 26, 352, 116), radius=14, fill=(5, 25, 49, 224), outline=(69, 151, 205, 210), width=2)
    draw.text((48, 42), title, font=font(25, bold=True), fill=(255, 255, 255, 255))
    draw.text((48, 78), direction, font=font(18), fill=(133, 210, 255, 255))
    draw.ellipse((572, 42, 592, 62), fill=(23, 79, 122, 255), outline=(255, 255, 255, 225), width=2)
    draw.text((516, 70), "ACTIVE JOINT", font=font(12, bold=True), fill=(7, 26, 51, 230))
    return np.asarray(image)


def highlight_joint(model: mujoco.MjModel, joint_name: str) -> None:
    joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
    body_id = int(model.jnt_bodyid[joint_id])
    for geom_id in range(model.ngeom):
        if int(model.geom_bodyid[geom_id]) == body_id:
            model.geom_rgba[geom_id] = np.array([0.09, 0.31, 0.48, 1.0])


def motion_value(key: str, center: float, amplitude: float, phase: float) -> float:
    wave = 0.5 - 0.5 * math.cos(phase * math.tau)
    if key == "elbow":
        return center + amplitude * wave
    return center + amplitude * math.sin(phase * math.tau)


def set_joint_value(model: mujoco.MjModel, data: mujoco.MjData, joint_name: str, value: float) -> None:
    joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
    joint_min, joint_max = model.jnt_range[joint_id]
    if value < joint_min or value > joint_max:
        raise ValueError(f"{joint_name} value {value:.3f} is outside [{joint_min:.3f}, {joint_max:.3f}]")
    data.qpos[int(model.jnt_qposadr[joint_id])] = value


def render_clip(model_path: Path, output_path: Path, key: str) -> None:
    joint_name, center, amplitude, title, direction = JOINT_DEMOS[key]
    model = mujoco.MjModel.from_xml_path(str(model_path))
    model.vis.global_.offwidth = WIDTH
    model.vis.global_.offheight = HEIGHT
    data = mujoco.MjData(model)
    highlight_joint(model, joint_name)

    renderer = mujoco.Renderer(model, height=HEIGHT, width=WIDTH)
    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.82)
    camera.distance = 2.35
    camera.azimuth = 145
    camera.elevation = -8

    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer = imageio.get_writer(
        output_path,
        fps=FPS,
        codec="libx264",
        quality=8,
        macro_block_size=1,
        ffmpeg_log_level="error",
        output_params=["-movflags", "+faststart", "-pix_fmt", "yuv420p"],
    )
    try:
        for frame_index in range(FPS * DURATION_SECONDS):
            phase = frame_index / (FPS * DURATION_SECONDS - 1)
            data.qpos[:] = model.qpos0
            for pose_joint, pose_value in SAFE_ARM_POSES.get(key, {}).items():
                set_joint_value(model, data, pose_joint, pose_value)
            set_joint_value(model, data, joint_name, motion_value(key, center, amplitude, phase))
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            frame = renderer.render()
            writer.append_data(add_labels(frame, title, direction))
    finally:
        writer.close()
        renderer.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--only", choices=sorted(JOINT_DEMOS))
    args = parser.parse_args()

    keys = [args.only] if args.only else list(JOINT_DEMOS)
    for key in keys:
        output_path = args.output / f"master-{key}.mp4"
        print(f"Rendering {key} -> {output_path}", flush=True)
        render_clip(args.model.resolve(), output_path.resolve(), key)
    return 0


if __name__ == "__main__":
    sys.exit(main())
