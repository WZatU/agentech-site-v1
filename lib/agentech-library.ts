export type AgentechParam = {
  name: string;
  type: string;
  defaultValue?: string;
  description: string;
};

export type AgentechFunction = {
  name: string;
  category: "Movement" | "Posture" | "Safety" | "Sensing" | "Interaction" | "Workflow";
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
    summary: "Move the Aegis robot dog forward for a bounded time.",
    actionCard: "aegis.walk_forward",
    grounding: "motion.cmd_vel(linear=+speed, angular=0.0)",
    example: "Agentech.forward(speed=0.3, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Forward speed in meters per second. Valid range from report_zh: 0.0 to 2.37." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to walk. Valid range: 0.0 to 10.0." }
    ]
  },
  {
    name: "backward",
    category: "Movement",
    signature: "Agentech.backward(speed=0.3, seconds=1.0)",
    summary: "Move backward using the same simple speed and duration controls.",
    actionCard: "aegis.walk_backward",
    grounding: "motion.cmd_vel(linear=-speed, angular=0.0)",
    example: "Agentech.backward(speed=0.2, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.3", description: "Backward speed in meters per second. Valid range from report_zh: 0.0 to 2.37." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to move backward. Valid range: 0.0 to 10.0." }
    ]
  },
  {
    name: "yaw",
    category: "Movement",
    signature: "Agentech.yaw(speed=0.35, seconds=1.0)",
    summary: "Rotate in place by directly controlling yaw rate.",
    actionCard: "aegis.rotate",
    grounding: "motion.cmd_vel(linear=0.0, angular=speed)",
    example: "Agentech.yaw(speed=0.35, seconds=1)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate in radians per second. Valid range from report_zh: -2.09 to 2.09. Positive turns left, negative turns right." },
      { name: "seconds", type: "float", defaultValue: "1.0", description: "How long to hold the yaw command. Valid range: 0.0 to 10.0." }
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
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate upward attitude/camera tilt change in degrees. Valid range from Aegis tilt viewer: 0 to 20." },
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
      { name: "angle", type: "float", defaultValue: "15", description: "Approximate downward attitude/camera tilt change in degrees. Valid range from Aegis tilt viewer: 0 to 25." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second, streamed at 20 Hz. Valid API range: 0.03 to 0.5; recommended first tests stay near 0.10 to 0.15." }
    ]
  },
  {
    name: "camera_pitch",
    category: "Sensing",
    signature: "Agentech.camera_pitch(angle=10, speed=0.12)",
    summary: "Signed attitude/camera tilt control for height workflows. Positive looks up; negative looks down.",
    actionCard: "aegis.camera_pitch",
    grounding: "motion.attitude_control(pitch_vel=signed_speed)",
    example: "Agentech.camera_pitch(angle=-8)",
    params: [
      { name: "angle", type: "float", defaultValue: "10", description: "Signed pitch change in degrees. Valid range: -25 down to +20 up." },
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity used to estimate bounded command duration. Valid range: 0.03 to 0.5 rad/s." }
    ]
  },
  {
    name: "pitch",
    category: "Sensing",
    signature: "Agentech.pitch(speed=0.12, seconds=0.5, hz=20)",
    summary: "Low-level bounded pitch velocity command when a developer wants direct control.",
    actionCard: "aegis.attitude_control",
    grounding: "motion.attitude_control(pitch_vel=speed)",
    example: "Agentech.pitch(speed=0.12, seconds=0.5)",
    params: [
      { name: "speed", type: "float", defaultValue: "0.12", description: "Pitch velocity in radians per second. Valid range: -0.5 to 0.5. Positive up, negative down." },
      { name: "seconds", type: "float", defaultValue: "0.5", description: "How long to hold the pitch command. Valid range: 0.0 to 10.0." },
      { name: "hz", type: "float", defaultValue: "20", description: "How often to resend attitude_control while holding the pitch command." }
    ]
  },
  {
    name: "rotate",
    category: "Movement",
    signature: "Agentech.rotate(angle=90, speed=0.35)",
    summary: "Rotate by a signed angle. Positive angles turn left; negative angles turn right.",
    actionCard: "aegis.rotate",
    grounding: "signed yaw command using motion.cmd_vel(angular=...)",
    example: "Agentech.rotate(angle=-90)",
    params: [
      { name: "angle", type: "float", defaultValue: "90", description: "Target yaw change in degrees. Valid range: -360 to 360." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used to estimate turn duration. Valid range: 0.05 to 2.09 rad/s." }
    ]
  },
  {
    name: "left",
    category: "Movement",
    signature: "Agentech.left(angle=45, speed=0.35)",
    summary: "Simple alias for turning left.",
    actionCard: "aegis.turn_left",
    grounding: "Agentech.turn_left(angle, speed)",
    example: "Agentech.left(angle=45)",
    params: [
      { name: "angle", type: "float", defaultValue: "45", description: "Left turn angle in degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. Valid range: 0.05 to 2.09 rad/s." }
    ]
  },
  {
    name: "right",
    category: "Movement",
    signature: "Agentech.right(angle=45, speed=0.35)",
    summary: "Simple alias for turning right.",
    actionCard: "aegis.turn_right",
    grounding: "Agentech.turn_right(angle, speed)",
    example: "Agentech.right(angle=45)",
    params: [
      { name: "angle", type: "float", defaultValue: "45", description: "Right turn angle in degrees." },
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. Valid range: 0.05 to 2.09 rad/s." }
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
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. Valid range: 0.05 to 2.09 rad/s." }
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
      { name: "speed", type: "float", defaultValue: "0.35", description: "Yaw rate used during the turn. Valid range: 0.05 to 2.09 rad/s." }
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
    name: "emergency_stop",
    category: "Safety",
    signature: "Agentech.emergency_stop(reason='...')",
    summary: "Latch an emergency stop condition and block later motion.",
    actionCard: "aegis.emergency_stop",
    grounding: "session.e_stop(reason=..., source='agentech')",
    example: "Agentech.emergency_stop(reason='operator stop')",
    params: [
      { name: "reason", type: "str", defaultValue: "Agentech emergency stop", description: "Human-readable safety reason written to the stop event." }
    ]
  },
  {
    name: "get_status",
    category: "Sensing",
    signature: "Agentech.get_status()",
    summary: "Read status, battery, pose, and emergency stop state.",
    actionCard: "aegis.get_status",
    grounding: "state.status(), state.battery(), state.pose()",
    example: "print(Agentech.get_status())",
    params: []
  },
  {
    name: "capture_image",
    category: "Sensing",
    signature: "Agentech.capture_image(output='agentech_capture.jpg')",
    summary: "Capture one frame from the robot camera.",
    actionCard: "aegis.capture_image",
    grounding: "vision.frame(source)",
    example: "Agentech.capture_image(output='frame.jpg')",
    params: [
      { name: "output", type: "str", defaultValue: "agentech_capture.jpg", description: "Local JPEG output file." },
      { name: "source", type: "str", defaultValue: "default", description: "Camera source or RTSP URL." }
    ]
  },
  {
    name: "say",
    category: "Interaction",
    signature: "Agentech.say(text)",
    summary: "Send a short speech/display message.",
    actionCard: "aegis.say",
    grounding: "text adapter now; audio output adapter later",
    example: "Agentech.say('Hello from Agentech')",
    params: [
      { name: "text", type: "str", description: "Message text. Keep it short and direct." }
    ]
  },
  {
    name: "run_sequence",
    category: "Workflow",
    signature: "Agentech.run_sequence(actions)",
    summary: "Execute an ordered list of simple Agentech actions.",
    actionCard: "aegis.run_sequence",
    grounding: "ordered wrapper calls; stops on unsupported action",
    example: "Agentech.run_sequence([\n  {'action': 'stand'},\n  {'action': 'forward', 'params': {'seconds': 1}}\n])",
    params: [
      { name: "actions", type: "list[dict]", description: "Each item has an action name and optional params object." }
    ]
  }
] as const;

export const starterCode = `from agentech import Agentech

Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.left(angle=45)
Agentech.right(angle=45)
Agentech.yaw(speed=0.25, seconds=1)
Agentech.stand()
Agentech.look_up(angle=15)
Agentech.capture_image(output="height_photo.jpg")
Agentech.look_down(angle=15)
Agentech.stop()`;
