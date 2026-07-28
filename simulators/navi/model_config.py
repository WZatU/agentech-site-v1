"""Single source of Navi geometry, limits, control, gait, and safety values."""

from __future__ import annotations

import math

import numpy as np


JOINT_ORDER = [
    "front_left_abad_joint",
    "front_left_hip_joint",
    "front_left_knee_joint",
    "front_right_abad_joint",
    "front_right_hip_joint",
    "front_right_knee_joint",
    "hind_left_abad_joint",
    "hind_left_hip_joint",
    "hind_left_knee_joint",
    "hind_right_abad_joint",
    "hind_right_hip_joint",
    "hind_right_knee_joint",
]

LEG_NAMES = ("front_left", "front_right", "hind_left", "hind_right")
LEG_JOINTS = {
    leg: tuple(f"{leg}_{kind}_joint" for kind in ("abad", "hip", "knee"))
    for leg in LEG_NAMES
}
LEG_INDEX = {leg: slice(3 * index, 3 * index + 3) for index, leg in enumerate(LEG_NAMES)}
SIDE_SIGN = {"front_left": 1.0, "front_right": -1.0, "hind_left": 1.0, "hind_right": -1.0}
FRONT_SIGN = {"front_left": 1.0, "front_right": 1.0, "hind_left": -1.0, "hind_right": -1.0}
TROT_PHASE = {"front_left": 0.0, "hind_right": 0.0, "front_right": 0.5, "hind_left": 0.5}

JOINT_LIMITS = {
    **{f"{leg}_abad_joint": (-1.134, 1.134) for leg in LEG_NAMES},
    **{f"{leg}_hip_joint": (-3.141, 2.792) for leg in LEG_NAMES},
    **{f"{leg}_knee_joint": (0.436, 2.705) for leg in LEG_NAMES},
}
EFFORT_LIMITS = {joint: 9.1 for joint in JOINT_ORDER}
VELOCITY_LIMITS = {joint: 16.29 for joint in JOINT_ORDER}

# Derived from the Navi joint axes and equal 0.15 m leg segments.  With the
# foot directly below the hip, hip=-knee/2; knee=1.10 leaves useful range in
# both directions and places the four feet at equal height.
STANDING_LEG_TARGET = np.array((0.0, -0.55, 1.10), dtype=float)
STANDING_JOINT_TARGETS = np.tile(STANDING_LEG_TARGET, 4)

# The first standing pass used hip/knee gains of 38/32.  Joint-direction and
# contact audits showed that those gains could stand, but did not hold the
# stance feet firmly enough to overcome swing-leg inertia.  The values below
# are the lowest tested pair that keeps the intended stance trajectory moving
# the floating base in the same direction as the body-frame command.
KP = np.tile(np.array((28.0, 75.0, 60.0), dtype=float), 4)
KD = np.tile(np.array((1.3, 1.8, 1.4), dtype=float), 4)
SAFETY_KD = np.tile(np.array((1.3, 1.6, 1.2), dtype=float), 4)
MAX_TORQUE = 9.1

UPPER_LEG_LENGTH = 0.15
LOWER_LEG_LENGTH = 0.15
HIP_OFFSET = 0.077
ABAD_MOUNT_Y = 0.0525
FRONT_HIP_X = 0.176
HIND_HIP_X = -0.176
FOOT_RADIUS = 0.0205
STANDING_FOOT_X = 0.0
STANDING_FOOT_Z = -(
    UPPER_LEG_LENGTH * math.cos(STANDING_LEG_TARGET[1])
    + LOWER_LEG_LENGTH * math.cos(STANDING_LEG_TARGET[1] + STANDING_LEG_TARGET[2])
)
BODY_HEIGHT = -STANDING_FOOT_Z + FOOT_RADIUS

# Nominal contact points in the body frame.  These are also used to construct
# the turn tangent (-yaw*y, yaw*x); no world-frame position target is used.
NOMINAL_FOOT_POSITIONS = {
    "front_left": np.array(
        (FRONT_HIP_X, ABAD_MOUNT_Y + HIP_OFFSET, STANDING_FOOT_Z), dtype=float
    ),
    "front_right": np.array(
        (FRONT_HIP_X, -(ABAD_MOUNT_Y + HIP_OFFSET), STANDING_FOOT_Z), dtype=float
    ),
    "hind_left": np.array(
        (HIND_HIP_X, ABAD_MOUNT_Y + HIP_OFFSET, STANDING_FOOT_Z), dtype=float
    ),
    "hind_right": np.array(
        (HIND_HIP_X, -(ABAD_MOUNT_Y + HIP_OFFSET), STANDING_FOOT_Z), dtype=float
    ),
}

STEP_HEIGHT = 0.024
FORWARD_STEP_HEIGHT = 0.026
BACKWARD_STEP_HEIGHT = 0.024
LATERAL_STEP_HEIGHT = 0.024
TURN_STEP_HEIGHT = 0.024
FORWARD_STEP_LENGTH = 0.0625
BACKWARD_STEP_LENGTH = 0.040
# Kept as the public/default stride for compatibility with existing callers.
STEP_LENGTH = FORWARD_STEP_LENGTH
LATERAL_STEP_LENGTH = 0.035
LATERAL_LEAN_FOOT_DELTA = 0.012
# Backward motion already pitches load toward the hind pair, so retaining the
# full lateral height differential in a backward diagonal over-rolls the body.
BACKWARD_LATERAL_LEAN_SCALE = 0.75
# Tangential displacement magnitude at each nominal foot radius.  The x/y
# components are derived from the foot coordinates, rather than hard-coded
# left/right or front/hind turn offsets.
TURN_STEP_LENGTH = 0.050
STEP_FREQUENCY = 1.00
STANCE_FRACTION = 0.62
FORWARD_STANCE_FRACTION = 0.54
BACKWARD_STANCE_FRACTION = 0.62
LATERAL_STANCE_FRACTION = 0.56
TURN_STANCE_FRACTION = 0.62
# The original symmetric +/- stride touched down about 30 mm ahead of the
# nominal foot point and spent much of the following stance sliding.  This
# offset retains the same travel while placing forward touchdown only about
# 6 mm ahead of nominal, leaving a longer useful rearward push.
FORWARD_FOOT_X_BIAS = -0.025
# Forward load balance: shorten the hind legs slightly during locomotion and
# reduce front-right lift to equalize the two diagonal contact groups.
FORWARD_HIND_FOOT_Z_OFFSET = 0.008
FORWARD_SWING_HEIGHT_SCALE = {
    "front_left": 1.0,
    "front_right": 0.75,
    "hind_left": 1.0,
    "hind_right": 1.0,
}
# A small foot-trajectory-only compensation cancels the common backward
# transient of both yaw directions.  It never writes or assists the root.
TURN_FORWARD_BIAS = -0.015
BODY_PITCH_FOOT_DELTA = 0.012
COMMAND_FILTER_TIME = 0.12
# Each body-frame velocity axis is filtered independently.  Forward and yaw
# retain the stage-two response; lateral is slightly more conservative during
# A/D reversal so the abad targets cannot flip in a single gait step.
VELOCITY_FILTER_TIMES = np.array((0.12, 0.16, 0.12), dtype=float)
TARGET_FILTER_RATE = 18.0

# Nominal expected command speeds for UI/debug only.  No root velocity is
# assigned or assisted; all motion comes from joint torque and contact.
FORWARD_SPEED = 0.12
BACKWARD_SPEED = 0.09
STRAFE_SPEED = 0.07
TURN_SPEED = 0.45
MAX_FORWARD_SPEED = FORWARD_SPEED
MAX_BACKWARD_SPEED = BACKWARD_SPEED
MAX_LATERAL_SPEED = STRAFE_SPEED
MAX_LINEAR_SPEED = FORWARD_SPEED
MAX_YAW_RATE = TURN_SPEED
# At full linear command, retain 65% of the yaw envelope.  Pure turning keeps
# the complete stage-two yaw rate, while arcs remain inside the normalized
# linear/yaw foot workspace.
MIN_COMBINED_YAW_SCALE = 0.50

SAFETY_ROLL_LIMIT = 0.65
SAFETY_PITCH_LIMIT = 0.65
MIN_SAFE_BODY_HEIGHT = 0.12

COMMAND_VECTORS = {
    "stand": (0.0, 0.0, 0.0, 0.0),
    "forward": (MAX_FORWARD_SPEED, 0.0, 0.0, 0.0),
    "backward": (-MAX_BACKWARD_SPEED, 0.0, 0.0, 0.0),
    "strafe_left": (0.0, MAX_LATERAL_SPEED, 0.0, 0.0),
    "strafe_right": (0.0, -MAX_LATERAL_SPEED, 0.0, 0.0),
    "turn_left": (0.0, 0.0, MAX_YAW_RATE, 0.0),
    "turn_right": (0.0, 0.0, -MAX_YAW_RATE, 0.0),
    "pitch_up": (0.0, 0.0, 0.0, 1.0),
    "pitch_down": (0.0, 0.0, 0.0, -1.0),
}


def clipped_target(targets: np.ndarray) -> np.ndarray:
    """Clip a target vector to the original Navi URDF joint limits."""

    result = np.asarray(targets, dtype=float).copy()
    for index, joint_name in enumerate(JOINT_ORDER):
        lower, upper = JOINT_LIMITS[joint_name]
        result[index] = np.clip(result[index], lower, upper)
    return result
