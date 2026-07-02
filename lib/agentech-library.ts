export type AgentechParam = {
  name: string;
  type: string;
  defaultValue?: string;
  description: string;
};

export type AgentechFunction = {
  name: string;
  category: "Movement" | "Posture" | "Safety" | "Sensing";
  signature: string;
  summary: string;
  example: string;
  params: AgentechParam[];
};

export const agentechFunctions: AgentechFunction[] = [
  {
    name: "forward",
    category: "Movement",
    signature: "Agentech.forward(speed=0.3, seconds=1.0)",
    summary: "Stand the Aegis robot dog, wait briefly, then move forward for a bounded time.",
    example: "Agentech.forward(speed=0.3, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Forward speed in meters per second. report_zh Aegis v0.1 limit: 0.0 to 2.37 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to walk. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "5.0", description: "Automatic wait after stand before motion starts. Set to 0 only if posture is already managed." }
    ]
  },
  {
    name: "backward",
    category: "Movement",
    signature: "Agentech.backward(speed=0.3, seconds=1.0)",
    summary: "Stand the robot if needed, wait briefly, then move backward.",
    example: "Agentech.backward(speed=0.2, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Backward speed in meters per second. report_zh Aegis v0.1 measured limit: 0.0 to 2.365 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to move backward. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "5.0", description: "Automatic wait after stand before motion starts." }
    ]
  },
  {
    name: "lateral_left",
    category: "Movement",
    signature: "Agentech.lateral_left(speed=0.2, seconds=1.0)",
    summary: "Walk sideways to the robot's left.",
    example: "Agentech.lateral_left(speed=0.2, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.2", description: "Left lateral speed in meters per second. report_zh Aegis v0.1 lateral benchmark limit: 0.0 to 0.78 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to move laterally. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "5.0", description: "Automatic wait after stand before motion starts." }
    ]
  },
  {
    name: "lateral_right",
    category: "Movement",
    signature: "Agentech.lateral_right(speed=0.2, seconds=1.0)",
    summary: "Walk sideways to the robot's right.",
    example: "Agentech.lateral_right(speed=0.2, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.2", description: "Right lateral speed in meters per second. report_zh Aegis v0.1 lateral benchmark limit: 0.0 to 0.78 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to move laterally. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "5.0", description: "Automatic wait after stand before motion starts." }
    ]
  },
  {
    name: "look_up",
    category: "Sensing",
    signature: "Agentech.look_up(angle=15, speed=0.12)",
    summary: "Tilt the Aegis attitude/camera upward before taking the top height photo.",
    example: "Agentech.look_up(angle=15)",
    params: [
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate upward attitude/camera tilt change in degrees. Capped at 25 degrees so the motion stays realistic." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second, streamed at 20 Hz. Valid API range: 0.03 to 0.5; recommended first tests stay near 0.10 to 0.15." }
    ]
  },
  {
    name: "look_down",
    category: "Sensing",
    signature: "Agentech.look_down(angle=15, speed=0.12)",
    summary: "Tilt the Aegis attitude/camera downward before taking the bottom height photo.",
    example: "Agentech.look_down(angle=15)",
    params: [
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate downward attitude/camera tilt change in degrees. Capped at 25 degrees so the motion stays realistic." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second, streamed at 20 Hz. Valid API range: 0.03 to 0.5; recommended first tests stay near 0.10 to 0.15." }
    ]
  },
  {
    name: "turn_left",
    category: "Movement",
    signature: "Agentech.turn_left(angle=45, speed=0.35)",
    summary: "Turn left by a readable angle instead of thinking in radians.",
    example: "Agentech.turn_left(angle=45)",
    params: [
      { name: "angle", type: "float", defaultValue: "45", description: "Left turn angle in degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. report_zh max yaw rate: 2.09 rad/s; slow yaw reference: 1.05 rad/s." }
    ]
  },
  {
    name: "turn_right",
    category: "Movement",
    signature: "Agentech.turn_right(angle=45, speed=0.35)",
    summary: "Turn right by a readable angle.",
    example: "Agentech.turn_right(angle=45)",
    params: [
      { name: "angle", type: "float", defaultValue: "45", description: "Right turn angle in degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. report_zh max yaw rate: 2.09 rad/s; slow yaw reference: 1.05 rad/s." }
    ]
  },
  {
    name: "twist_left",
    category: "Movement",
    signature: "Agentech.twist_left(angle=28, speed=0.35)",
    summary: "Fixed-foot left body twist for small in-place heading adjustment.",
    example: "Agentech.twist_left(angle=28)",
    params: [
      { name: "angle", type: "float", defaultValue: "28", description: "Left twist angle in degrees. report_zh roll/twist benchmark reference: 28 degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the twist. Valid range: 0.05 to 2.09 rad/s." }
    ]
  },
  {
    name: "twist_right",
    category: "Movement",
    signature: "Agentech.twist_right(angle=28, speed=0.35)",
    summary: "Fixed-foot right body twist for small in-place heading adjustment.",
    example: "Agentech.twist_right(angle=28)",
    params: [
      { name: "angle", type: "float", defaultValue: "28", description: "Right twist angle in degrees. report_zh roll/twist benchmark reference: 28 degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the twist. Valid range: 0.05 to 2.09 rad/s." }
    ]
  },
  {
    name: "backflip",
    category: "Movement",
    signature: "Agentech.backflip()",
    summary: "Run the approved Aegis backflip preview motion.",
    example: "Agentech.backflip()",
    params: []
  },
  {
    name: "stand",
    category: "Posture",
    signature: "Agentech.stand()",
    summary: "Prepare the robot dog for movement.",
    example: "Agentech.stand()",
    params: [
      { name: "stand_wait", type: "float", defaultValue: "5.0", description: "Wait after stand so the dog fully stabilizes before moving. Valid range: 0.0 to 10.0." }
    ]
  },
  {
    name: "sit",
    category: "Posture",
    signature: "Agentech.sit()",
    summary: "Lower the robot from stand into the floor-sit damping posture.",
    example: "Agentech.sit()",
    params: []
  },
  {
    name: "stop",
    category: "Safety",
    signature: "Agentech.stop()",
    summary: "Stop the current motion command.",
    example: "Agentech.stop()",
    params: []
  },
  {
    name: "emergency_stop",
    category: "Safety",
    signature: "Agentech.emergency_stop()",
    summary: "Trigger emergency stop and put the robot into damping mode.",
    example: "Agentech.emergency_stop()",
    params: [
      { name: "reason", type: "str", defaultValue: "\"Agentech emergency stop\"", description: "Short operator-readable reason sent with the stop request." }
    ]
  },
  {
    name: "get_battery_status",
    category: "Sensing",
    signature: "Agentech.get_battery_status()",
    summary: "Read the robot battery level.",
    example: "battery = Agentech.get_battery_status()\nprint(battery)",
    params: []
  }
] as const;

export const starterCode = `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.lateral_left(speed=0.2, seconds=1)
Agentech.lateral_right(speed=0.2, seconds=1)
Agentech.backflip()
Agentech.stop()`;
