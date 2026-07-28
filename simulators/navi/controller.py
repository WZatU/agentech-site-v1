"""Torque controllers for the Navi MuJoCo model.

Locomotion is generated only through the 12 leg actuators.  This module reads
the floating-base state for feedback and safety, but never assigns root qpos,
quaternion, linear velocity, or angular velocity.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import mujoco
import numpy as np

from model_config import (
    BODY_PITCH_FOOT_DELTA,
    BACKWARD_LATERAL_LEAN_SCALE,
    BACKWARD_STEP_LENGTH,
    BACKWARD_STANCE_FRACTION,
    BACKWARD_STEP_HEIGHT,
    COMMAND_FILTER_TIME,
    COMMAND_VECTORS,
    EFFORT_LIMITS,
    FRONT_SIGN,
    FORWARD_FOOT_X_BIAS,
    FORWARD_HIND_FOOT_Z_OFFSET,
    FORWARD_STEP_LENGTH,
    FORWARD_STANCE_FRACTION,
    FORWARD_STEP_HEIGHT,
    FORWARD_SWING_HEIGHT_SCALE,
    HIP_OFFSET,
    JOINT_ORDER,
    KD,
    KP,
    LATERAL_LEAN_FOOT_DELTA,
    LATERAL_STEP_LENGTH,
    LATERAL_STANCE_FRACTION,
    LATERAL_STEP_HEIGHT,
    LEG_INDEX,
    LEG_NAMES,
    LOWER_LEG_LENGTH,
    MAX_BACKWARD_SPEED,
    MAX_FORWARD_SPEED,
    MAX_LATERAL_SPEED,
    MAX_LINEAR_SPEED,
    MAX_TORQUE,
    MAX_YAW_RATE,
    MIN_COMBINED_YAW_SCALE,
    NOMINAL_FOOT_POSITIONS,
    SAFETY_KD,
    SIDE_SIGN,
    STANCE_FRACTION,
    STANDING_FOOT_X,
    STANDING_FOOT_Z,
    STANDING_JOINT_TARGETS,
    STEP_FREQUENCY,
    STEP_HEIGHT,
    TARGET_FILTER_RATE,
    TROT_PHASE,
    TURN_STEP_LENGTH,
    TURN_FORWARD_BIAS,
    TURN_STANCE_FRACTION,
    TURN_STEP_HEIGHT,
    UPPER_LEG_LENGTH,
    VELOCITY_FILTER_TIMES,
    clipped_target,
)


@dataclass(frozen=True)
class JointMapping:
    name: str
    joint_id: int
    actuator_id: int
    qpos_address: int
    dof_address: int


@dataclass(frozen=True)
class VelocityCommand:
    """Continuous body-frame velocity request used by every locomotion path."""

    vx: float = 0.0
    vy: float = 0.0
    yaw_rate: float = 0.0

    def as_array(self) -> np.ndarray:
        return np.array((self.vx, self.vy, self.yaw_rate), dtype=float)


def normalize_velocity_command(
    vx: float, vy: float, yaw_rate: float
) -> VelocityCommand:
    """Direction-preserving linear scaling plus load-aware yaw limiting."""

    linear = np.array((vx, vy), dtype=float)
    if not np.all(np.isfinite(linear)) or not math.isfinite(float(yaw_rate)):
        raise ValueError("velocity command values must be finite")
    linear_norm = float(np.linalg.norm(linear))
    if linear_norm > MAX_LINEAR_SPEED:
        linear *= MAX_LINEAR_SPEED / linear_norm
        linear_norm = MAX_LINEAR_SPEED

    linear_load = float(np.clip(linear_norm / MAX_LINEAR_SPEED, 0.0, 1.0))
    available_yaw_scale = 1.0 - (1.0 - MIN_COMBINED_YAW_SCALE) * linear_load
    yaw_limit = MAX_YAW_RATE * available_yaw_scale
    normalized_yaw = float(np.clip(yaw_rate, -yaw_limit, yaw_limit))
    return VelocityCommand(float(linear[0]), float(linear[1]), normalized_yaw)


def quaternion_to_rpy(quaternion: np.ndarray) -> tuple[float, float, float]:
    """Convert a MuJoCo free-joint quaternion (w, x, y, z) to RPY."""

    w, x, y, z = (float(value) for value in quaternion)
    roll = math.atan2(2.0 * (w * x + y * z), 1.0 - 2.0 * (x * x + y * y))
    sin_pitch = float(np.clip(2.0 * (w * y - z * x), -1.0, 1.0))
    pitch = math.asin(sin_pitch)
    yaw = math.atan2(2.0 * (w * z + x * y), 1.0 - 2.0 * (y * y + z * z))
    return roll, pitch, yaw


def sagittal_leg_ik(x: float, z: float) -> tuple[float, float]:
    """Solve Navi hip/knee IK for axes (0, -1, 0) and positive knee bend."""

    down = max(-float(z), 0.04)
    radius = math.hypot(float(x), down)
    minimum = abs(UPPER_LEG_LENGTH - LOWER_LEG_LENGTH) + 0.003
    maximum = UPPER_LEG_LENGTH + LOWER_LEG_LENGTH - 0.003
    radius = float(np.clip(radius, minimum, maximum))
    scale = radius / max(math.hypot(float(x), down), 1e-9)
    x_scaled = float(x) * scale
    down_scaled = down * scale

    cosine_knee = (
        radius * radius - UPPER_LEG_LENGTH**2 - LOWER_LEG_LENGTH**2
    ) / (2.0 * UPPER_LEG_LENGTH * LOWER_LEG_LENGTH)
    knee = math.acos(float(np.clip(cosine_knee, -1.0, 1.0)))
    foot_angle = math.atan2(x_scaled, down_scaled)
    bend_angle = math.atan2(
        LOWER_LEG_LENGTH * math.sin(knee),
        UPPER_LEG_LENGTH + LOWER_LEG_LENGTH * math.cos(knee),
    )
    hip = foot_angle - bend_angle
    return hip, knee


def leg_ik(x: float, lateral_delta: float, z: float) -> np.ndarray:
    """Approximate 3-DOF IK using exact sagittal IK plus small-angle abad IK.

    The abad solution respects the Navi +X axis.  It accounts for the vertical
    lever arm and is intentionally limited to the small lateral excursions used
    by the conservative gait.
    """

    hip, knee = sagittal_leg_ik(x, z)
    abad = float(lateral_delta) / max(math.hypot(-z, HIP_OFFSET), 0.10)
    return np.array((abad, hip, knee), dtype=float)


class StandingPDController:
    """Joint-space PD controller mapped explicitly to Navi torque motors."""

    def __init__(
        self,
        model: mujoco.MjModel,
        targets: np.ndarray = STANDING_JOINT_TARGETS,
        kp: np.ndarray = KP,
        kd: np.ndarray = KD,
    ) -> None:
        self.model = model
        self.targets = clipped_target(np.asarray(targets, dtype=float))
        self.kp = np.asarray(kp, dtype=float).copy()
        self.kd = np.asarray(kd, dtype=float).copy()
        if not (self.targets.shape == self.kp.shape == self.kd.shape == (12,)):
            raise ValueError("targets, KP, and KD must each contain 12 values")

        mappings: list[JointMapping] = []
        for expected_actuator_id, joint_name in enumerate(JOINT_ORDER):
            joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
            actuator_name = f"{joint_name}_motor"
            actuator_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_ACTUATOR, actuator_name)
            if joint_id < 0 or actuator_id < 0:
                raise ValueError(f"Missing Navi mapping for {joint_name}")
            if actuator_id != expected_actuator_id:
                raise ValueError(
                    f"Actuator order mismatch for {joint_name}: "
                    f"expected {expected_actuator_id}, got {actuator_id}"
                )
            transmitted_joint = int(model.actuator_trnid[actuator_id, 0])
            if transmitted_joint != joint_id:
                raise ValueError(f"{actuator_name} does not drive {joint_name}")
            mappings.append(
                JointMapping(
                    name=joint_name,
                    joint_id=joint_id,
                    actuator_id=actuator_id,
                    qpos_address=int(model.jnt_qposadr[joint_id]),
                    dof_address=int(model.jnt_dofadr[joint_id]),
                )
            )
        self.mappings = tuple(mappings)
        self.qpos_addresses = np.array([item.qpos_address for item in mappings], dtype=int)
        self.dof_addresses = np.array([item.dof_address for item in mappings], dtype=int)
        self.actuator_ids = np.array([item.actuator_id for item in mappings], dtype=int)
        self.torque_limits = np.array(
            [min(MAX_TORQUE, EFFORT_LIMITS[name]) for name in JOINT_ORDER], dtype=float
        )

    def set_targets(self, targets: np.ndarray) -> None:
        self.targets = clipped_target(np.asarray(targets, dtype=float))

    def compute(self, data: mujoco.MjData, targets: np.ndarray | None = None) -> np.ndarray:
        desired = self.targets if targets is None else clipped_target(targets)
        position = data.qpos[self.qpos_addresses]
        velocity = data.qvel[self.dof_addresses]
        # MuJoCo's bias force supplies physically valid gravity/Coriolis
        # feed-forward at the actual leg DOFs; it is still applied exclusively
        # through the 12 torque motors.
        torque = (
            self.kp * (desired - position)
            - self.kd * velocity
            + data.qfrc_bias[self.dof_addresses]
        )
        return np.clip(torque, -self.torque_limits, self.torque_limits)

    def apply(self, data: mujoco.MjData) -> np.ndarray:
        torque = self.compute(data)
        data.ctrl[self.actuator_ids] = torque
        return torque

    def apply_safety_damping(self, data: mujoco.MjData) -> np.ndarray:
        velocity = data.qvel[self.dof_addresses]
        torque = np.clip(-SAFETY_KD * velocity, -self.torque_limits, self.torque_limits)
        data.ctrl[self.actuator_ids] = torque
        return torque


class TrotGaitController(StandingPDController):
    """Conservative diagonal trot with body-frame foot targets and torque PD."""

    def __init__(self, model: mujoco.MjModel) -> None:
        super().__init__(model)
        self.command_name = "stand"
        self.requested_command = np.zeros(4, dtype=float)
        self.filtered_command = np.zeros(4, dtype=float)
        self.requested_velocity = VelocityCommand()
        self.filtered_velocity = np.zeros(3, dtype=float)
        self.filtered_targets = STANDING_JOINT_TARGETS.copy()
        self.last_time: float | None = None
        self.last_dt = float(model.opt.timestep)
        self.last_phase = 0.0
        self.current_stance_fraction = STANCE_FRACTION

    def set_command(self, command_name: str) -> None:
        if command_name not in COMMAND_VECTORS:
            raise ValueError(f"Unknown command: {command_name}")
        self.command_name = command_name
        vx, vy, yaw_rate, pitch = COMMAND_VECTORS[command_name]
        command = normalize_velocity_command(vx, vy, yaw_rate)
        self.requested_velocity = command
        self.requested_command[:3] = command.as_array()
        self.requested_command[3] = pitch

    def set_velocity_command(
        self, vx: float, vy: float, yaw_rate: float
    ) -> VelocityCommand:
        """Set the sole continuous locomotion command without resetting phase."""

        command = normalize_velocity_command(vx, vy, yaw_rate)
        self.command_name = "velocity"
        self.requested_velocity = command
        self.requested_command[:3] = command.as_array()
        self.requested_command[3] = 0.0
        return command

    # Compatibility wrappers all feed the same body-frame velocity path.
    def forward(self, speed: float = MAX_FORWARD_SPEED) -> VelocityCommand:
        command = self.set_velocity_command(abs(float(speed)), 0.0, 0.0)
        self.command_name = "forward"
        return command

    def backward(self, speed: float = MAX_BACKWARD_SPEED) -> VelocityCommand:
        command = self.set_velocity_command(-abs(float(speed)), 0.0, 0.0)
        self.command_name = "backward"
        return command

    def lateral_left(self, speed: float = MAX_LATERAL_SPEED) -> VelocityCommand:
        command = self.set_velocity_command(0.0, abs(float(speed)), 0.0)
        self.command_name = "strafe_left"
        return command

    def lateral_right(self, speed: float = MAX_LATERAL_SPEED) -> VelocityCommand:
        command = self.set_velocity_command(0.0, -abs(float(speed)), 0.0)
        self.command_name = "strafe_right"
        return command

    def turn_left(self, rate: float = MAX_YAW_RATE) -> VelocityCommand:
        command = self.set_velocity_command(0.0, 0.0, abs(float(rate)))
        self.command_name = "turn_left"
        return command

    def turn_right(self, rate: float = MAX_YAW_RATE) -> VelocityCommand:
        command = self.set_velocity_command(0.0, 0.0, -abs(float(rate)))
        self.command_name = "turn_right"
        return command

    def _phase_trajectory(
        self, phase: float, stance_fraction: float | None = None
    ) -> tuple[float, float, bool]:
        stance_fraction = (
            self.current_stance_fraction
            if stance_fraction is None
            else float(stance_fraction)
        )
        if phase < stance_fraction:
            progress = phase / stance_fraction
            # Front-to-rear stance path with zero endpoint velocity.
            return 0.5 * math.cos(math.pi * progress), 0.0, False
        progress = (phase - stance_fraction) / (1.0 - stance_fraction)
        # Rear-to-front swing path.  Squaring the sinusoid keeps both height
        # and vertical velocity continuous at lift-off and touch-down.
        return (
            -0.5 * math.cos(math.pi * progress),
            math.sin(math.pi * progress) ** 2,
            True,
        )

    def raw_gait_targets(self, sim_time: float) -> np.ndarray:
        vx, vy, yaw_rate, pitch = self.filtered_command
        forward = float(vx) / (
            MAX_FORWARD_SPEED if vx >= 0.0 else MAX_BACKWARD_SPEED
        )
        lateral = float(vy) / MAX_LATERAL_SPEED
        turn = float(yaw_rate) / MAX_YAW_RATE
        locomotion = float(np.clip(max(abs(forward), abs(lateral), abs(turn)), 0.0, 1.0))
        forward_weight = max(float(forward), 0.0)
        backward_weight = max(-float(forward), 0.0)
        lateral_weight = abs(float(lateral))
        turn_weight = abs(float(turn))
        mode_weight = forward_weight + backward_weight + lateral_weight + turn_weight
        if mode_weight > 1e-9:
            self.current_stance_fraction = (
                forward_weight * FORWARD_STANCE_FRACTION
                + backward_weight * BACKWARD_STANCE_FRACTION
                + lateral_weight * LATERAL_STANCE_FRACTION
                + turn_weight * TURN_STANCE_FRACTION
            ) / mode_weight
            step_height = (
                forward_weight * FORWARD_STEP_HEIGHT
                + backward_weight * BACKWARD_STEP_HEIGHT
                + lateral_weight * LATERAL_STEP_HEIGHT
                + turn_weight * TURN_STEP_HEIGHT
            ) / mode_weight
        else:
            self.current_stance_fraction = STANCE_FRACTION
            step_height = STEP_HEIGHT
        targets = STANDING_JOINT_TARGETS.copy()

        for leg_name in LEG_NAMES:
            leg_slice = LEG_INDEX[leg_name]
            phase = (sim_time * STEP_FREQUENCY + TROT_PHASE[leg_name]) % 1.0
            profile, swing_height, _ = self._phase_trajectory(
                phase, self.current_stance_fraction
            )
            nominal_foot = NOMINAL_FOOT_POSITIONS[leg_name]
            foot_radius = max(math.hypot(nominal_foot[0], nominal_foot[1]), 1e-9)
            # Unified body-frame stance velocity.  Linear motion contributes
            # [-vx, -vy], and positive yaw contributes [yaw*y, -yaw*x].
            # The phase profile decreases during stance, so its displacement
            # amplitude is the negative of the desired stance velocity.
            linear_stance_velocity = np.array((-vx, -vy), dtype=float)
            yaw_stance_velocity = np.array(
                (yaw_rate * nominal_foot[1], -yaw_rate * nominal_foot[0]),
                dtype=float,
            )
            linear_travel_time = np.array(
                (
                    FORWARD_STEP_LENGTH / MAX_FORWARD_SPEED
                    if vx >= 0.0
                    else BACKWARD_STEP_LENGTH / MAX_BACKWARD_SPEED,
                    LATERAL_STEP_LENGTH / MAX_LATERAL_SPEED,
                ),
                dtype=float,
            )
            yaw_travel_time = TURN_STEP_LENGTH / (MAX_YAW_RATE * foot_radius)
            linear_stride = -linear_stance_velocity * linear_travel_time
            yaw_stride = -yaw_stance_velocity * yaw_travel_time
            stride_xy = linear_stride + yaw_stride

            bias_denominator = max(forward_weight + turn_weight, 1.0)
            foot_x_bias = (
                forward_weight * FORWARD_FOOT_X_BIAS
                + turn_weight * TURN_FORWARD_BIAS
            ) / bias_denominator
            x_delta = foot_x_bias + profile * stride_xy[0]
            lateral_delta = profile * stride_xy[1]
            foot_x = STANDING_FOOT_X + x_delta
            swing_height_scale = 1.0 + forward_weight * (
                FORWARD_SWING_HEIGHT_SCALE[leg_name] - 1.0
            )
            hind_height_offset = (
                forward_weight * FORWARD_HIND_FOOT_Z_OFFSET
                if FRONT_SIGN[leg_name] < 0.0
                else 0.0
            )
            foot_z = (
                STANDING_FOOT_Z
                + locomotion * step_height * swing_height_scale * swing_height
                + hind_height_offset
                - pitch * FRONT_SIGN[leg_name] * BODY_PITCH_FOOT_DELTA
                + lateral
                * SIDE_SIGN[leg_name]
                * LATERAL_LEAN_FOOT_DELTA
                * (
                    1.0
                    - backward_weight * (1.0 - BACKWARD_LATERAL_LEAN_SCALE)
                )
            )
            targets[leg_slice] = leg_ik(foot_x, lateral_delta, foot_z)
        return clipped_target(targets)

    def update_targets(self, data: mujoco.MjData) -> np.ndarray:
        sim_time = float(data.time)
        if self.last_time is None or sim_time < self.last_time:
            self.last_dt = float(self.model.opt.timestep)
        else:
            self.last_dt = max(sim_time - self.last_time, float(self.model.opt.timestep))
        self.last_time = sim_time

        velocity_alpha = 1.0 - np.exp(-self.last_dt / VELOCITY_FILTER_TIMES)
        self.filtered_command[:3] += velocity_alpha * (
            self.requested_command[:3] - self.filtered_command[:3]
        )
        pitch_alpha = 1.0 - math.exp(-self.last_dt / COMMAND_FILTER_TIME)
        self.filtered_command[3] += pitch_alpha * (
            self.requested_command[3] - self.filtered_command[3]
        )
        self.filtered_velocity = self.filtered_command[:3].copy()
        desired = self.raw_gait_targets(sim_time)
        target_alpha = 1.0 - math.exp(-TARGET_FILTER_RATE * self.last_dt)
        self.filtered_targets += target_alpha * (desired - self.filtered_targets)
        self.targets = clipped_target(self.filtered_targets)
        self.last_phase = (sim_time * STEP_FREQUENCY) % 1.0
        return self.targets.copy()

    def apply(self, data: mujoco.MjData) -> np.ndarray:
        self.update_targets(data)
        return super().apply(data)
