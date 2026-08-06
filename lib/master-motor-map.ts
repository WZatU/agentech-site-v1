import {
  OFFICIAL_X2_LIMIT_GROUPS,
  RUNTIME_X2_LIMIT_GROUPS,
  type OfficialJointLimit,
  type RuntimeJointLimit
} from "./master-robot-joint-data";

export type MasterMotorSegment = "arm" | "head";
export type MasterMotorView = "front" | "back";
export type MasterMotorPosition = { xPercent: number; yPercent: number };

export type MasterMotorMarker = {
  runtimeJoint: string;
  displayName: string;
  group: string;
  jointNumber: string;
  segment: MasterMotorSegment;
  side: "Left" | "Right" | "Center";
  positions: Record<MasterMotorView, MasterMotorPosition>;
  officialLimit: OfficialJointLimit;
  runtimeLimit: RuntimeJointLimit;
};

type MarkerSeed = readonly [runtimeJoint: string, xPercent: number, yPercent: number, officialIndex?: number];

const markerGroups: ReadonlyArray<{
  runtimeGroup: string;
  officialGroup: string;
  segment: MasterMotorSegment;
  side: MasterMotorMarker["side"];
  markers: ReadonlyArray<MarkerSeed>;
}> = [
  {
    runtimeGroup: "Left arm", officialGroup: "Arm", segment: "arm", side: "Left",
    markers: [
      ["left_shoulder_pitch_joint", 67, 20], ["left_shoulder_roll_joint", 62, 23],
      ["left_shoulder_yaw_joint", 72, 23], ["left_elbow_joint", 74, 33],
      ["left_wrist_yaw_joint", 77, 44], ["left_wrist_pitch_joint", 72, 47],
      ["left_wrist_roll_joint", 82, 47]
    ]
  },
  {
    runtimeGroup: "Right arm", officialGroup: "Arm", segment: "arm", side: "Right",
    markers: [
      ["right_shoulder_pitch_joint", 33, 20], ["right_shoulder_roll_joint", 38, 23],
      ["right_shoulder_yaw_joint", 28, 23], ["right_elbow_joint", 26, 33],
      ["right_wrist_yaw_joint", 23, 44], ["right_wrist_pitch_joint", 28, 47],
      ["right_wrist_roll_joint", 18, 47]
    ]
  },
  {
    runtimeGroup: "Head", officialGroup: "Head", segment: "head", side: "Center",
    markers: [["head_pitch_joint", 45, 12, 0], ["head_yaw_joint", 55, 16, 1]]
  }
];

function requireGroup<T extends { label: string }>(groups: ReadonlyArray<T>, label: string): T {
  const group = groups.find((candidate) => candidate.label.startsWith(label));
  if (!group) throw new Error(`Missing Master joint group: ${label}`);
  return group;
}

export const MASTER_MOTOR_MARKERS: ReadonlyArray<MasterMotorMarker> = markerGroups.flatMap((group) => {
  const runtimeGroup = requireGroup(RUNTIME_X2_LIMIT_GROUPS, group.runtimeGroup);
  const officialGroup = requireGroup(OFFICIAL_X2_LIMIT_GROUPS, group.officialGroup);

  return group.markers.map(([runtimeJoint, xPercent, yPercent, explicitOfficialIndex]) => {
    const runtimeIndex = runtimeGroup.joints.findIndex((joint) => joint.joint === runtimeJoint);
    const officialIndex = explicitOfficialIndex ?? runtimeIndex;
    const runtimeLimit = runtimeGroup.joints[runtimeIndex];
    const officialLimit = officialGroup.joints[officialIndex];
    if (!runtimeLimit || !officialLimit) throw new Error(`Missing Master joint mapping: ${runtimeJoint}`);
    const jointNumber = `J${officialIndex + 1}`;
    const jointName = officialLimit.joint.replace(/^J\d+\s*[^A-Za-z]+/, "");
    return {
      runtimeJoint,
      displayName: `${group.side === "Center" ? "" : `${group.side} `}${jointName}`,
      group: group.runtimeGroup,
      jointNumber,
      segment: group.segment,
      side: group.side,
      positions: {
        front: { xPercent, yPercent },
        back: { xPercent: 100 - xPercent, yPercent }
      },
      officialLimit,
      runtimeLimit
    };
  });
});
