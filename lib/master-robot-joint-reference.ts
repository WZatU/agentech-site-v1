import "server-only";

export const X2_LIMITS_SOURCE_URL =
  "https://x2-aimdk.agibot.com/zh-cn/latest/about_agibot_X2/joint_name_and_limit.html";
export const X2_JOINT_DIAGRAM_URL =
  "https://x2-aimdk.agibot.com/zh-cn/latest/_images/joint_name_and_limit.png";

export type OfficialJointLimit = {
  joint: string;
  minimumDegrees: number;
  maximumDegrees: number;
};

export type RuntimeJointLimit = {
  joint: string;
  minimumRadians: number;
  maximumRadians: number;
  kp: number;
  kd: number;
};

export const OFFICIAL_X2_LIMIT_GROUPS: ReadonlyArray<{
  label: string;
  note: string;
  joints: ReadonlyArray<OfficialJointLimit>;
}> = [
  {
    label: "Arm · each side",
    note: "Manufacturer guaranteed envelope; left/right direction must still be reconciled.",
    joints: [
      { joint: "J1 · Shoulder pitch", minimumDegrees: -116.5, maximumDegrees: 176.5 },
      { joint: "J2 · Shoulder roll", minimumDegrees: -3.5, maximumDegrees: 174.5 },
      { joint: "J3 · Shoulder yaw", minimumDegrees: -146.5, maximumDegrees: 146.5 },
      { joint: "J4 · Elbow", minimumDegrees: -135, maximumDegrees: 0 },
      { joint: "J5 · Wrist yaw", minimumDegrees: -146.5, maximumDegrees: 146.5 },
      { joint: "J6 · Wrist pitch", minimumDegrees: -33, maximumDegrees: 33 },
      { joint: "J7 · Wrist roll", minimumDegrees: -86.5, maximumDegrees: 41.5 }
    ]
  },
  {
    label: "Leg · each side",
    note: "Manufacturer guaranteed envelope; mirrored joints do not share the same runtime signs.",
    joints: [
      { joint: "J1 · Hip pitch", minimumDegrees: -146.5, maximumDegrees: 146.5 },
      { joint: "J2 · Hip roll", minimumDegrees: -13.5, maximumDegrees: 166.5 },
      { joint: "J3 · Hip yaw", minimumDegrees: -196.5, maximumDegrees: 96.5 },
      { joint: "J4 · Knee", minimumDegrees: 0, maximumDegrees: 138 },
      { joint: "J5 · Ankle pitch", minimumDegrees: -26, maximumDegrees: 46 },
      { joint: "J6 · Ankle roll", minimumDegrees: -15, maximumDegrees: 15 }
    ]
  },
  {
    label: "Head",
    note: "The public table lists head pitch as fixed at 0°.",
    joints: [
      { joint: "J1 · Head pitch", minimumDegrees: 0, maximumDegrees: 0 },
      { joint: "J2 · Head yaw", minimumDegrees: -20, maximumDegrees: 20 }
    ]
  },
  {
    label: "Waist",
    note: "Manufacturer guaranteed envelope.",
    joints: [
      { joint: "J1 · Waist yaw", minimumDegrees: -196.5, maximumDegrees: 126.5 },
      { joint: "J2 · Waist pitch", minimumDegrees: -18, maximumDegrees: 18 },
      { joint: "J3 · Waist roll", minimumDegrees: -28, maximumDegrees: 28 }
    ]
  }
];

export const RUNTIME_X2_LIMIT_GROUPS: ReadonlyArray<{
  label: string;
  joints: ReadonlyArray<RuntimeJointLimit>;
}> = [
  {
    label: "Left arm",
    joints: [
      { joint: "left_shoulder_pitch_joint", minimumRadians: -3.08, maximumRadians: 2.04, kp: 20, kd: 2 },
      { joint: "left_shoulder_roll_joint", minimumRadians: -0.061, maximumRadians: 2.993, kp: 20, kd: 2 },
      { joint: "left_shoulder_yaw_joint", minimumRadians: -2.556, maximumRadians: 2.556, kp: 20, kd: 2 },
      { joint: "left_elbow_joint", minimumRadians: -2.3556, maximumRadians: 0, kp: 20, kd: 2 },
      { joint: "left_wrist_yaw_joint", minimumRadians: -2.556, maximumRadians: 2.556, kp: 20, kd: 2 },
      { joint: "left_wrist_pitch_joint", minimumRadians: -0.558, maximumRadians: 0.558, kp: 20, kd: 2 },
      { joint: "left_wrist_roll_joint", minimumRadians: -1.571, maximumRadians: 0.724, kp: 20, kd: 2 }
    ]
  },
  {
    label: "Right arm",
    joints: [
      { joint: "right_shoulder_pitch_joint", minimumRadians: -3.08, maximumRadians: 2.04, kp: 20, kd: 2 },
      { joint: "right_shoulder_roll_joint", minimumRadians: -2.993, maximumRadians: 0.061, kp: 20, kd: 2 },
      { joint: "right_shoulder_yaw_joint", minimumRadians: -2.556, maximumRadians: 2.556, kp: 20, kd: 2 },
      { joint: "right_elbow_joint", minimumRadians: -2.3556, maximumRadians: 0, kp: 20, kd: 2 },
      { joint: "right_wrist_yaw_joint", minimumRadians: -2.556, maximumRadians: 2.556, kp: 20, kd: 2 },
      { joint: "right_wrist_pitch_joint", minimumRadians: -0.558, maximumRadians: 0.558, kp: 20, kd: 2 },
      { joint: "right_wrist_roll_joint", minimumRadians: -0.724, maximumRadians: 1.571, kp: 20, kd: 2 }
    ]
  },
  {
    label: "Left leg",
    joints: [
      { joint: "left_hip_pitch_joint", minimumRadians: -2.704, maximumRadians: 2.556, kp: 40, kd: 4 },
      { joint: "left_hip_roll_joint", minimumRadians: -0.235, maximumRadians: 2.906, kp: 40, kd: 4 },
      { joint: "left_hip_yaw_joint", minimumRadians: -1.684, maximumRadians: 3.43, kp: 30, kd: 3 },
      { joint: "left_knee_joint", minimumRadians: 0, maximumRadians: 2.4073, kp: 80, kd: 8 },
      { joint: "left_ankle_pitch_joint", minimumRadians: -0.803, maximumRadians: 0.453, kp: 40, kd: 4 },
      { joint: "left_ankle_roll_joint", minimumRadians: -0.2625, maximumRadians: 0.2625, kp: 20, kd: 2 }
    ]
  },
  {
    label: "Right leg",
    joints: [
      { joint: "right_hip_pitch_joint", minimumRadians: -2.704, maximumRadians: 2.556, kp: 40, kd: 4 },
      { joint: "right_hip_roll_joint", minimumRadians: -2.906, maximumRadians: 0.235, kp: 40, kd: 4 },
      { joint: "right_hip_yaw_joint", minimumRadians: -3.43, maximumRadians: 1.684, kp: 30, kd: 3 },
      { joint: "right_knee_joint", minimumRadians: 0, maximumRadians: 2.4073, kp: 80, kd: 8 },
      { joint: "right_ankle_pitch_joint", minimumRadians: -0.803, maximumRadians: 0.453, kp: 40, kd: 4 },
      { joint: "right_ankle_roll_joint", minimumRadians: -0.2625, maximumRadians: 0.2625, kp: 20, kd: 2 }
    ]
  },
  {
    label: "Waist",
    joints: [
      { joint: "waist_yaw_joint", minimumRadians: -3.43, maximumRadians: 2.382, kp: 20, kd: 4 },
      { joint: "waist_pitch_joint", minimumRadians: -0.314, maximumRadians: 0.314, kp: 20, kd: 4 },
      { joint: "waist_roll_joint", minimumRadians: -0.488, maximumRadians: 0.488, kp: 20, kd: 4 }
    ]
  },
  {
    label: "Head",
    joints: [
      { joint: "head_yaw_joint", minimumRadians: -0.366, maximumRadians: 0.366, kp: 20, kd: 2 },
      { joint: "head_pitch_joint", minimumRadians: -0.3838, maximumRadians: 0.3838, kp: 20, kd: 2 }
    ]
  }
];
