"""Render a Navi action directly from a half-second live joint capture."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import mujoco
import numpy as np

try:
    import imageio.v2 as imageio
except ImportError:  # The bundled desktop runtime can render through Pillow/WebP.
    imageio = None


if not hasattr(mujoco, "MjModel"):
    # Some bundled MuJoCo installs contain only the compiled extension modules.
    # Re-export their public symbols so the shared Navi model code can use the
    # standard top-level API.
    from mujoco import (
        _callbacks,
        _constants,
        _enums,
        _errors,
        _functions,
        _render,
        _specs,
        _structs,
    )

    for _module in (
        _callbacks,
        _constants,
        _enums,
        _errors,
        _functions,
        _render,
        _specs,
        _structs,
    ):
        for _name in dir(_module):
            if not _name.startswith("_"):
                setattr(mujoco, _name, getattr(_module, _name))


VENDOR_LEG = {
    "front_right": slice(0, 3),
    "front_left": slice(3, 6),
    "hind_right": slice(6, 9),
    "hind_left": slice(9, 12),
}
MOVING_LEG = {
    "playful_greeting": "front_right",
    "push_ahead": "front_right",
    "shake_hand_quick": "front_right",
    "pee_quick": "hind_right",
}
TIME_SCALE = 0.55
LEAD_S = 0.45
RECOVERY_S = 1.15
FOOT_LOCK_ITERATIONS = 18
FOOT_LOCK_DAMPING = 1e-5
FOOT_LOCK_TOLERANCE_M = 2e-5
PLAYFUL_DURATION_S = 10.9
PLAYFUL_VENDOR_BASE = np.array((.011, -.669, 1.474))
PLAYFUL_RAISE = np.array((-.365, 1.936, 1.338))
PLAYFUL_ACCENT = np.array((-.360, .438, 2.428))
PUSH_AHEAD_EXTENSION_START_S = 1.55
PUSH_AHEAD_EXTENSION_PEAK_S = 2.65
PUSH_AHEAD_EXTENSION_RETURN_S = 4.05
# Open the front-right knee while rotating the hip just enough to aim the
# lower leg forward.  The smaller knee value makes the two leg sections much
# straighter; hip + knee ~= pi/2 makes the shin point ahead instead of down.
PUSH_AHEAD_FRONT_RIGHT_HIP = 0.86
PUSH_AHEAD_FRONT_RIGHT_KNEE = 0.70


class PillowAnimationWriter:
    """Small animated-WebP writer used when FFmpeg/imageio is unavailable."""

    def __init__(self, output: Path, fps: int) -> None:
        from PIL import Image

        self.Image = Image
        self.output = output
        self.frame_duration_ms = round(1000 / fps)
        self.frames = []

    def append_data(self, frame: np.ndarray) -> None:
        self.frames.append(self.Image.fromarray(frame, mode="RGB"))

    def close(self) -> None:
        if not self.frames:
            return
        self.frames[0].save(
            self.output,
            format="WEBP",
            save_all=True,
            append_images=self.frames[1:],
            duration=self.frame_duration_ms,
            loop=1,
            quality=82,
            method=4,
        )


class GlfwRenderer:
    """Minimal offscreen renderer for compiled-only MuJoCo installations."""

    def __init__(self, model: mujoco.MjModel, height: int, width: int) -> None:
        import ctypes

        glfw_path = Path(next(iter(mujoco.__path__))).parent / "glfw" / "glfw3.dll"
        glfw = ctypes.WinDLL(str(glfw_path))
        glfw.glfwInit.restype = ctypes.c_int
        glfw.glfwWindowHint.argtypes = (ctypes.c_int, ctypes.c_int)
        glfw.glfwCreateWindow.argtypes = (
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_void_p,
            ctypes.c_void_p,
        )
        glfw.glfwCreateWindow.restype = ctypes.c_void_p
        glfw.glfwMakeContextCurrent.argtypes = (ctypes.c_void_p,)
        glfw.glfwDestroyWindow.argtypes = (ctypes.c_void_p,)
        self.glfw = glfw
        self.model = model
        self.height = height
        self.width = width
        if not glfw.glfwInit():
            raise RuntimeError("GLFW initialization failed")
        glfw.glfwWindowHint(0x00020004, 0)  # GLFW_VISIBLE = GLFW_FALSE
        self.window = glfw.glfwCreateWindow(width, height, b"Navi render", None, None)
        if self.window is None:
            glfw.glfwTerminate()
            raise RuntimeError("GLFW offscreen window creation failed")
        glfw.glfwMakeContextCurrent(self.window)
        self.scene = mujoco.MjvScene(model, maxgeom=10000)
        self.option = mujoco.MjvOption()
        self.perturb = mujoco.MjvPerturb()
        self.context = mujoco.MjrContext(
            model,
            mujoco.mjtFontScale.mjFONTSCALE_150.value,
        )
        self.viewport = mujoco.MjrRect(0, 0, width, height)

    def update_scene(self, data: mujoco.MjData, camera: mujoco.MjvCamera) -> None:
        self.glfw.glfwMakeContextCurrent(self.window)
        mujoco.mjv_updateScene(
            self.model,
            data,
            self.option,
            self.perturb,
            camera,
            mujoco.mjtCatBit.mjCAT_ALL.value,
            self.scene,
        )

    def render(self) -> np.ndarray:
        self.glfw.glfwMakeContextCurrent(self.window)
        mujoco.mjr_render(self.viewport, self.scene, self.context)
        rgb = np.empty((self.height, self.width, 3), dtype=np.uint8)
        depth = np.empty((self.height, self.width), dtype=np.float32)
        mujoco.mjr_readPixels(rgb, depth, self.viewport, self.context)
        return np.flipud(rgb)

    def close(self) -> None:
        self.glfw.glfwMakeContextCurrent(self.window)
        self.context.free()
        self.glfw.glfwDestroyWindow(self.window)
        self.glfw.glfwTerminate()


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument("--fps", type=int, default=24)
    return parser.parse_args()


def load_keyframes(path: Path) -> tuple[str, np.ndarray, np.ndarray, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    unique: list[tuple[float, np.ndarray]] = []
    for sample in payload["samples"]:
        pose = np.asarray(sample["positions"][:12], dtype=float)
        if pose.shape != (12,):
            continue
        received = float(sample.get("source_received_s") or sample["time_s"])
        if not unique or np.max(np.abs(pose - unique[-1][1])) > 1e-4:
            unique.append((received, pose))
    if len(unique) < 2:
        raise RuntimeError(f"Capture has too few distinct poses: {path}")
    origin = unique[0][0]
    times = np.asarray([(item[0] - origin) * TIME_SCALE + LEAD_S for item in unique])
    poses = np.stack([item[1] for item in unique])
    return str(payload["action"]), times, poses, int(payload["sample_count"])


def sampled_pose(t: float, times: np.ndarray, poses: np.ndarray) -> np.ndarray:
    if t <= times[0]:
        return poses[0]
    if t >= times[-1]:
        return poses[-1]
    index = int(np.searchsorted(times, t, side="right") - 1)
    amount = smooth((t - times[index]) / (times[index + 1] - times[index]))
    return poses[index] * (1.0 - amount) + poses[index + 1] * amount


def body_quaternion(pitch: float, yaw: float) -> np.ndarray:
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return np.array((cp * cy, -sp * sy, sp * cy, cp * sy))


def playful_phase(t: float, standing_front_right: np.ndarray):
    """Exact reviewed Playful Greeting sequence, with the right hand as gesture leg."""
    root_delta = np.zeros(3)
    pitch = 0.0
    yaw = 0.0
    roll = 0.0
    hand = standing_front_right.copy()

    if t < .45:
        pass
    elif t < 1.0:
        pitch = math.radians(-9.0) * smooth((t - .45) / .55)
    elif t < 2.15:
        pitch = math.radians(-9.0)
        yaw = math.radians(7.0) * math.sin(2.0 * math.pi * 3.0 * (t - 1.0) / 1.15)
    elif t < 3.35:
        pitch = math.radians(-9.0)
        # Two distinct forward head/body pushes.
        u = (t - 2.15) / 1.2
        root_delta[0] = .042 * math.sin(2.0 * math.pi * u) ** 2
    elif t < 3.9:
        u = smooth((t - 3.35) / .55)
        pitch = math.radians(-9.0 + 18.0 * u)
    elif t < 5.05:
        pitch = math.radians(9.0)
        yaw = math.radians(7.0) * math.sin(2.0 * math.pi * 3.0 * (t - 3.9) / 1.15)
    elif t < 5.65:
        # Dip the planted front-right shoulder, then return to level.
        pitch = math.radians(9.0)
        u = (t - 5.05) / .60
        roll = math.radians(10.0) * math.sin(math.pi * u)
    elif t < 6.25:
        # Follow with the planted front-left shoulder, then return to level.
        pitch = math.radians(9.0)
        u = (t - 5.65) / .60
        roll = -math.radians(10.0) * math.sin(math.pi * u)
    elif t < 7.0:
        u = smooth((t - 6.25) / .75)
        pitch = math.radians(9.0) * (1.0 - u)
        raised = standing_front_right + PLAYFUL_RAISE - PLAYFUL_VENDOR_BASE
        hand = standing_front_right * (1.0 - u) + raised * u
    elif t < 7.75:
        # One Encourage beat while the hand remains raised.
        u = (t - 7.0) / .75
        beat = math.sin(math.pi * u) ** 2
        live = PLAYFUL_RAISE * (1.0 - beat) + PLAYFUL_ACCENT * beat
        hand = standing_front_right + live - PLAYFUL_VENDOR_BASE
    elif t < 9.35:
        # Three airborne knocks made at the elbow/knee joint.
        u = (t - 7.75) / 1.6
        beat = math.sin(3.0 * math.pi * u) ** 2
        hand = standing_front_right + PLAYFUL_RAISE - PLAYFUL_VENDOR_BASE
        hand[2] += .48 * beat
    elif t < 10.45:
        u = smooth((t - 9.35) / 1.1)
        raised = standing_front_right + PLAYFUL_RAISE - PLAYFUL_VENDOR_BASE
        hand = raised * (1.0 - u) + standing_front_right * u

    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    cr, sr = math.cos(roll / 2.0), math.sin(roll / 2.0)
    quaternion = np.array((
        cr * cp * cy + sr * sp * sy,
        sr * cp * cy - cr * sp * sy,
        cr * sp * cy + sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
    ))
    return root_delta, quaternion, np.clip(
        hand, (-1.134, -3.141, .436), (1.134, 2.792, 2.705)
    )


def push_ahead_front_right(t: float, recorded_target: np.ndarray) -> np.ndarray:
    """Straighten the knee into a forward-pointing reach, then fold it back."""
    if t < PUSH_AHEAD_EXTENSION_START_S or t >= PUSH_AHEAD_EXTENSION_RETURN_S:
        return recorded_target
    if t < PUSH_AHEAD_EXTENSION_PEAK_S:
        amount = smooth(
            (t - PUSH_AHEAD_EXTENSION_START_S)
            / (PUSH_AHEAD_EXTENSION_PEAK_S - PUSH_AHEAD_EXTENSION_START_S)
        )
    else:
        amount = 1.0 - smooth(
            (t - PUSH_AHEAD_EXTENSION_PEAK_S)
            / (PUSH_AHEAD_EXTENSION_RETURN_S - PUSH_AHEAD_EXTENSION_PEAK_S)
        )

    target = recorded_target.copy()
    target[1] = target[1] * (1.0 - amount) + PUSH_AHEAD_FRONT_RIGHT_HIP * amount
    target[2] = target[2] * (1.0 - amount) + PUSH_AHEAD_FRONT_RIGHT_KNEE * amount
    return target


def lock_support_feet(
    model: mujoco.MjModel,
    data: mujoco.MjData,
    support_sites: list[int],
    support_targets: list[np.ndarray],
    active_dofs: np.ndarray,
    joint_qpos_addresses: np.ndarray,
) -> float:
    """Use damped least-squares IK to keep every planted foot fixed in XYZ."""
    for _ in range(FOOT_LOCK_ITERATIONS):
        mujoco.mj_forward(model, data)
        errors = np.concatenate([
            target - data.site_xpos[site]
            for site, target in zip(support_sites, support_targets)
        ])
        maximum_error = float(np.max(np.abs(errors)))
        if maximum_error < FOOT_LOCK_TOLERANCE_M:
            return maximum_error

        rows = []
        for site in support_sites:
            jacobian = np.zeros((3, model.nv))
            mujoco.mj_jacSite(model, data, jacobian, None, site)
            rows.append(jacobian[:, active_dofs])
        jacobian = np.vstack(rows)
        system = jacobian @ jacobian.T
        correction = jacobian.T @ np.linalg.solve(
            system + FOOT_LOCK_DAMPING * np.eye(system.shape[0]),
            errors,
        )
        velocity = np.zeros(model.nv)
        velocity[active_dofs] = correction
        mujoco.mj_integratePos(model, data.qpos, velocity, 0.85)
        data.qpos[joint_qpos_addresses] = np.clip(
            data.qpos[joint_qpos_addresses],
            (-1.134, -3.141, 0.436) * (len(joint_qpos_addresses) // 3),
            (1.134, 2.792, 2.705) * (len(joint_qpos_addresses) // 3),
        )

    mujoco.mj_forward(model, data)
    return float(max(
        np.max(np.abs(target - data.site_xpos[site]))
        for site, target in zip(support_sites, support_targets)
    ))


def keep_gesture_foot_above_floor(
    model: mujoco.MjModel,
    data: mujoco.MjData,
    site: int,
    floor_height: float,
    active_dofs: np.ndarray,
) -> None:
    """Correct only the gesturing leg if its foot would dip below the floor."""
    for _ in range(10):
        mujoco.mj_forward(model, data)
        error = floor_height - float(data.site_xpos[site][2])
        if error <= FOOT_LOCK_TOLERANCE_M:
            return
        jacobian = np.zeros((3, model.nv))
        mujoco.mj_jacSite(model, data, jacobian, None, site)
        row = jacobian[2, active_dofs]
        correction = row * error / (float(row @ row) + FOOT_LOCK_DAMPING)
        velocity = np.zeros(model.nv)
        velocity[active_dofs] = correction
        mujoco.mj_integratePos(model, data.qpos, velocity, 0.85)


def main() -> int:
    args = parse_args()
    action, times, poses, sample_count = load_keyframes(args.capture)
    duration = PLAYFUL_DURATION_S if action == "playful_greeting" else float(times[-1] + RECOVERY_S + 0.35)
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
    initial_feet = {
        leg: data.site_xpos[mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")].copy()
        for leg in LEG_NAMES
    }
    base = poses[0]
    moving_leg = MOVING_LEG.get(action)
    supports = [leg for leg in LEG_NAMES if leg != moving_leg]
    support_sites = [
        mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
        for leg in supports
    ]
    support_targets = [initial_feet[leg] for leg in supports]
    all_joint_indices = np.arange(len(controller.qpos_addresses))
    support_joint_indices = np.concatenate([
        all_joint_indices[LEG_INDEX[leg]] for leg in supports
    ])
    support_qpos_addresses = controller.qpos_addresses[support_joint_indices]
    support_dofs = np.asarray([
        int(model.jnt_dofadr[np.flatnonzero(model.jnt_qposadr == address)[0]])
        for address in support_qpos_addresses
    ])
    # Playful Greeting has an explicitly authored body path, so support-leg IK
    # must solve around that body pose instead of moving the root away from it.
    active_dofs = support_dofs if action == "playful_greeting" else np.concatenate((np.arange(6), support_dofs))
    moving_site = None
    moving_dofs = None
    if moving_leg:
        moving_site = mujoco.mj_name2id(
            model, mujoco.mjtObj.mjOBJ_SITE, f"{moving_leg}_foot_site"
        )
        moving_joint_indices = all_joint_indices[LEG_INDEX[moving_leg]]
        moving_qpos_addresses = controller.qpos_addresses[moving_joint_indices]
        moving_dofs = np.asarray([
            int(model.jnt_dofadr[np.flatnonzero(model.jnt_qposadr == address)[0]])
            for address in moving_qpos_addresses
        ])

    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = (0.0, 0.0, 0.15)
    camera.distance, camera.azimuth, camera.elevation = 1.46, 125.0, -14.0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    renderer_type = getattr(mujoco, "Renderer", GlfwRenderer)
    renderer = renderer_type(model, height=360, width=640)
    if args.output.suffix.lower() == ".webp":
        writer = PillowAnimationWriter(args.output, args.fps)
    elif imageio is not None:
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
    else:
        raise RuntimeError("MP4 output requires imageio; use a .webp output instead")
    minimum_clearance = math.inf
    maximum_support_foot_error = 0.0
    try:
        for frame_index in range(round(duration * args.fps)):
            t = frame_index / args.fps
            live = sampled_pose(t, times, poses)
            if t > times[-1]:
                recovery = smooth((t - times[-1]) / RECOVERY_S)
                live = live * (1.0 - recovery) + base * recovery

            for leg in LEG_NAMES:
                source = VENDOR_LEG[leg]
                controller.targets[LEG_INDEX[leg]] = np.clip(
                    STANDING_JOINT_TARGETS[LEG_INDEX[leg]] + live[source] - base[source],
                    (-1.134, -3.141, 0.436),
                    (1.134, 2.792, 2.705),
                )
            data.qpos[:3] = root_start
            data.qpos[3:7] = (1.0, 0.0, 0.0, 0.0)
            if action == "playful_greeting":
                root_delta, root_quaternion, hand_target = playful_phase(
                    t,
                    STANDING_JOINT_TARGETS[LEG_INDEX["front_right"]],
                )
                data.qpos[:3] += root_delta
                data.qpos[3:7] = root_quaternion
                for leg in LEG_NAMES:
                    controller.targets[LEG_INDEX[leg]] = STANDING_JOINT_TARGETS[LEG_INDEX[leg]]
                controller.targets[LEG_INDEX["front_right"]] = hand_target
            elif action == "push_ahead":
                controller.targets[LEG_INDEX["front_right"]] = push_ahead_front_right(
                    t,
                    controller.targets[LEG_INDEX["front_right"]],
                )
            data.qpos[controller.qpos_addresses] = controller.targets
            data.qvel[:] = 0.0
            mujoco.mj_forward(model, data)
            maximum_support_foot_error = max(
                maximum_support_foot_error,
                lock_support_feet(
                    model,
                    data,
                    support_sites,
                    support_targets,
                    active_dofs,
                    controller.qpos_addresses,
                ),
            )
            # In Playful Greeting the hand does not lift until 6.25 s. Keep the
            # fourth foot fixed through both head/hip-shake sections and the
            # two shoulder dips, then release it for Encourage + knocks.
            if (
                action == "playful_greeting"
                and t < 6.25
                and moving_site is not None
                and moving_dofs is not None
            ):
                maximum_support_foot_error = max(
                    maximum_support_foot_error,
                    lock_support_feet(
                        model,
                        data,
                        [moving_site],
                        [initial_feet[moving_leg]],
                        moving_dofs,
                        controller.qpos_addresses,
                    ),
                )
            if moving_site is not None and moving_dofs is not None:
                keep_gesture_foot_above_floor(
                    model,
                    data,
                    moving_site,
                    float(initial_feet[moving_leg][2]),
                    moving_dofs,
                )
            for leg in LEG_NAMES:
                site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, f"{leg}_foot_site")
                minimum_clearance = min(
                    minimum_clearance,
                    float(data.site_xpos[site][2] - initial_feet[leg][2]),
                )
            renderer.update_scene(data, camera=camera)
            writer.append_data(renderer.render())
    finally:
        writer.close()
        renderer.close()

    metrics = {
        "command": action,
        "duration_s": duration,
        "source_sample_count": sample_count,
        "distinct_live_joint_poses": int(len(poses)),
        "sample_interval_s": 0.5,
        "timeline_scale": TIME_SCALE,
        "moving_leg": moving_leg,
        "support_feet_used_for_body_alignment": supports,
        "support_foot_lock": "full_xyz_damped_least_squares_ik",
        "maximum_support_foot_error_m": maximum_support_foot_error,
        "minimum_foot_clearance_m": minimum_clearance,
        "ending": "smooth_normal_standing_recovery",
    }
    if args.metrics:
        args.metrics.parent.mkdir(parents=True, exist_ok=True)
        args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
