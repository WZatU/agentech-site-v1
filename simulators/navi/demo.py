"""Interactive MuJoCo viewer for the Navi quadruped."""

from __future__ import annotations

import ctypes
import os
import time

import mujoco
import mujoco.viewer

from controller import TrotGaitController, VelocityCommand, quaternion_to_rpy
from model_config import (
    MAX_BACKWARD_SPEED,
    MAX_FORWARD_SPEED,
    MAX_LATERAL_SPEED,
    MAX_YAW_RATE,
    MIN_SAFE_BODY_HEIGHT,
    SAFETY_PITCH_LIMIT,
    SAFETY_ROLL_LIMIT,
)
from simulation import foot_contact_state, load_model, reset_to_keyframe, state_snapshot


KEY_ESCAPE = 256
KEY_SPACE = 32
KEY_A = 65
KEY_D = 68
KEY_S = 83
KEY_W = 87
KEY_RIGHT = 262
KEY_LEFT = 263
KEY_DOWN = 264
KEY_UP = 265

VK_ESCAPE = 0x1B
VK_SPACE = 0x20
VK_LEFT = 0x25
VK_UP = 0x26
VK_RIGHT = 0x27
VK_DOWN = 0x28
VK_A = 0x41
VK_D = 0x44
VK_S = 0x53
VK_W = 0x57

CALLBACK_KEYS = {
    KEY_UP,
    KEY_DOWN,
    KEY_LEFT,
    KEY_RIGHT,
    KEY_W,
    KEY_S,
    KEY_A,
    KEY_D,
    KEY_SPACE,
}
VIRTUAL_KEYS = {
    "forward": (VK_W, VK_UP),
    "backward": (VK_S, VK_DOWN),
    "left": (VK_A,),
    "right": (VK_D,),
    "yaw_left": (VK_LEFT,),
    "yaw_right": (VK_RIGHT,),
}
CALLBACK_GROUPS = {
    "forward": (KEY_W, KEY_UP),
    "backward": (KEY_S, KEY_DOWN),
    "left": (KEY_A,),
    "right": (KEY_D,),
    "yaw_left": (KEY_LEFT,),
    "yaw_right": (KEY_RIGHT,),
}


class KeyboardTeleop:
    """Hold-to-move key state that supports simultaneous body-frame axes."""

    def __init__(self) -> None:
        self.exit_requested = False
        self.callback_times: dict[int, float] = {}
        self.user32 = ctypes.windll.user32 if os.name == "nt" else None

    def key_callback(self, key: int) -> None:
        if key == KEY_ESCAPE:
            self.exit_requested = True
            return
        if key in CALLBACK_KEYS:
            if key == KEY_SPACE:
                self.callback_times.clear()
            self.callback_times[key] = time.perf_counter()

    @staticmethod
    def _compose(active: set[str]) -> VelocityCommand:
        forward_axis = float("forward" in active) - float("backward" in active)
        lateral_axis = float("left" in active) - float("right" in active)
        yaw_axis = float("yaw_left" in active) - float("yaw_right" in active)
        vx = (
            forward_axis * MAX_FORWARD_SPEED
            if forward_axis >= 0.0
            else forward_axis * MAX_BACKWARD_SPEED
        )
        return VelocityCommand(
            vx=vx,
            vy=lateral_axis * MAX_LATERAL_SPEED,
            yaw_rate=yaw_axis * MAX_YAW_RATE,
        )

    def command(self) -> VelocityCommand:
        if self.user32 is not None:
            if self.user32.GetAsyncKeyState(VK_ESCAPE) & 0x8000:
                self.exit_requested = True
            if self.user32.GetAsyncKeyState(VK_SPACE) & 0x8000:
                return VelocityCommand()
            active = {
                name
                for name, keys in VIRTUAL_KEYS.items()
                if any(self.user32.GetAsyncKeyState(key) & 0x8000 for key in keys)
            }
            return self._compose(active)

        now = time.perf_counter()
        self.callback_times = {
            key: timestamp
            for key, timestamp in self.callback_times.items()
            if now - timestamp < 0.25
        }
        if KEY_SPACE in self.callback_times:
            return VelocityCommand()
        active = {
            name
            for name, keys in CALLBACK_GROUPS.items()
            if any(key in self.callback_times for key in keys)
        }
        return self._compose(active)


def _print_debug(model, data, controller, safety_stop: bool) -> None:
    snapshot = state_snapshot(model, data, controller)
    print(
        f"command={snapshot['command']} safety={safety_stop} "
        f"time={snapshot['time']:.3f} base_xyz={snapshot['base_xyz']} "
        f"base_rpy={[round(v, 4) for v in snapshot['base_rpy']]} "
        f"base_linvel={[round(v, 4) for v in snapshot['base_linear_velocity']]} "
        f"base_angvel={[round(v, 4) for v in snapshot['base_angular_velocity']]} "
        f"q_range={[round(v, 4) for v in snapshot['joint_position_range']]} "
        f"qd_range={[round(v, 4) for v in snapshot['joint_velocity_range']]} "
        f"ctrl_range={[round(v, 4) for v in snapshot['actuator_control_range']]} "
        f"contacts={snapshot['foot_contacts']} height={snapshot['body_height']:.4f}",
        flush=True,
    )


def main() -> int:
    model = load_model()
    data = mujoco.MjData(model)
    reset_to_keyframe(model, data, "standing")
    controller = TrotGaitController(model)
    keyboard = KeyboardTeleop()
    current_command = VelocityCommand()
    last_debug = time.perf_counter()

    print(
        "Navi controls: hold W/S or Up/Down=forward/backward, "
        "A/D=lateral, Left/Right=turn, Space=stand, Esc=exit; combinations enabled"
    )
    with mujoco.viewer.launch_passive(
        model, data, key_callback=keyboard.key_callback, show_left_ui=True, show_right_ui=True
    ) as viewer:
        while viewer.is_running() and not keyboard.exit_requested:
            step_started = time.perf_counter()
            requested_command = keyboard.command()
            roll, pitch, _ = quaternion_to_rpy(data.qpos[3:7])
            safety_stop = (
                abs(roll) > SAFETY_ROLL_LIMIT
                or abs(pitch) > SAFETY_PITCH_LIMIT
                or float(data.qpos[2]) < MIN_SAFE_BODY_HEIGHT
            )
            if safety_stop:
                controller.set_velocity_command(0.0, 0.0, 0.0)
                controller.update_targets(data)
                controller.apply_safety_damping(data)
            else:
                controller.set_velocity_command(
                    requested_command.vx,
                    requested_command.vy,
                    requested_command.yaw_rate,
                )
                controller.apply(data)

            if requested_command != current_command:
                current_command = requested_command
                print(
                    f"command=(vx={current_command.vx:.3f}, "
                    f"vy={current_command.vy:.3f}, "
                    f"yaw_rate={current_command.yaw_rate:.3f})",
                    flush=True,
                )
            mujoco.mj_step(model, data)
            viewer.sync()

            now = time.perf_counter()
            if now - last_debug >= 1.0:
                _print_debug(model, data, controller, safety_stop)
                last_debug = now
            sleep_time = float(model.opt.timestep) - (time.perf_counter() - step_started)
            if sleep_time > 0.0:
                time.sleep(sleep_time)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
