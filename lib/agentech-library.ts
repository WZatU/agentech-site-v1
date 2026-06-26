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
  actionCard: string;
  grounding: string;
  example: string;
  params: AgentechParam[];
};

export const agentechFunctions: AgentechFunction[] = [
  {
    name: "forward",
    category: "Movement",
    signature: "Agentech.forward(speed=0.3, seconds=1.0)",
    summary: "Stand the Aegis robot dog, wait briefly, then move forward for a bounded time.",
    actionCard: "aegis.walk_forward",
    grounding: "motion.cmd_vel(linear=+speed, angular=0.0)",
    example: "Agentech.forward(speed=0.3, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Forward speed in meters per second. report_zh Aegis v0.1 limit: 0.0 to 2.37 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to walk. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "1.0", description: "Automatic wait after stand before motion starts. Set to 0 only if posture is already managed." }
    ]
  },
  {
    name: "backward",
    category: "Movement",
    signature: "Agentech.backward(speed=0.3, seconds=1.0)",
    summary: "Stand the robot if needed, wait briefly, then move backward.",
    actionCard: "aegis.walk_backward",
    grounding: "motion.cmd_vel(linear=-speed, angular=0.0)",
    example: "Agentech.backward(speed=0.2, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Backward speed in meters per second. report_zh Aegis v0.1 measured limit: 0.0 to 2.365 m/s." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to move backward. Valid range: 0.0 to 10.0." },
      { name: "stand_wait", type: "float", defaultValue: "1.0", description: "Automatic wait after stand before motion starts." }
    ]
  },
  {
    name: "look_up",
    category: "Sensing",
    signature: "Agentech.look_up(angle=15, speed=0.12)",
    summary: "Tilt the Aegis attitude/camera upward before taking the top height photo.",
    actionCard: "aegis.camera_pitch",
    grounding: "motion.attitude_control(pitch_vel=+speed)",
    example: "Agentech.look_up(angle=15)",
    params: [
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate upward attitude/camera tilt change in degrees. report_zh pitch limit: 0 to 19 degrees." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second, streamed at 20 Hz. Valid API range: 0.03 to 0.5; recommended first tests stay near 0.10 to 0.15." }
    ]
  },
  {
    name: "look_down",
    category: "Sensing",
    signature: "Agentech.look_down(angle=15, speed=0.12)",
    summary: "Tilt the Aegis attitude/camera downward before taking the bottom height photo.",
    actionCard: "aegis.camera_pitch",
    grounding: "motion.attitude_control(pitch_vel=-speed)",
    example: "Agentech.look_down(angle=15)",
    params: [
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate downward attitude/camera tilt change in degrees. report_zh pitch limit: 0 to 21 degrees." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second, streamed at 20 Hz. Valid API range: 0.03 to 0.5; recommended first tests stay near 0.10 to 0.15." }
    ]
  },
  {
    name: "turn_left",
    category: "Movement",
    signature: "Agentech.turn_left(angle=45, speed=0.35)",
    summary: "Turn left by a readable angle instead of thinking in radians.",
    actionCard: "aegis.turn_left",
    grounding: "motion.cmd_vel(angular=+speed)",
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
    actionCard: "aegis.turn_right",
    grounding: "motion.cmd_vel(angular=-speed)",
    example: "Agentech.turn_right(angle=45)",
    params: [
      { name: "angle", type: "float", defaultValue: "45", description: "Right turn angle in degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. report_zh max yaw rate: 2.09 rad/s; slow yaw reference: 1.05 rad/s." }
    ]
  },
  {
    name: "stand",
    category: "Posture",
    signature: "Agentech.stand()",
    summary: "Prepare the robot dog for movement.",
    actionCard: "aegis.stand",
    grounding: "motion.stand()",
    example: "Agentech.stand()",
    params: []
  },
  {
    name: "sit",
    category: "Posture",
    signature: "Agentech.sit()",
    summary: "Return the robot to a sitting or lie-down posture.",
    actionCard: "aegis.sit",
    grounding: "motion.sit() or motion.do_preset('lie_down')",
    example: "Agentech.sit()",
    params: []
  },
  {
    name: "stop",
    category: "Safety",
    signature: "Agentech.stop()",
    summary: "Stop the current motion command.",
    actionCard: "aegis.stop",
    grounding: "motion.stop()",
    example: "Agentech.stop()",
    params: []
  },
  {
    name: "get_battery_status",
    category: "Sensing",
    signature: "Agentech.get_battery_status()",
    summary: "Read the robot battery level from the status adapter.",
    actionCard: "aegis.get_status",
    grounding: "state.battery() from aegis.get_status",
    example: "battery = Agentech.get_battery_status()\nprint(battery)",
    params: []
  }
] as const;

export const starterCode = `from agentech import Agentech

Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.turn_left(angle=45)
Agentech.turn_right(angle=45)
Agentech.stand()
Agentech.look_up(angle=15)
Agentech.look_down(angle=15)
print(Agentech.get_battery_status())
Agentech.stop()`;
