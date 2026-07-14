export type CapabilityStatus = "available" | "development" | "unsupported";

export type AgentechParam = {
  name: string;
  type: string;
  defaultValue?: string;
  description: string;
  status?: CapabilityStatus;
};

export type AgentechFunction = {
  name: string;
  category: "Movement" | "Posture" | "Safety" | "Sensing";
  signature: string;
  summary: string;
  example: string;
  params: AgentechParam[];
  profiles?: { name: string; syntax: string; number?: number; note?: string; noteLabel?: string; status?: CapabilityStatus }[];
};

const p = (name: string, type: string, description: string, defaultValue?: string, status: CapabilityStatus = "available"): AgentechParam =>
  ({ name, type, description, defaultValue, status });

export const agentechFunctions: AgentechFunction[] = [
  {
    name: "forward", category: "Movement", signature: "Agentech.forward(speed_mps=1.0, duration_s=1.0)",
    summary: "Move forward using one positive speed-magnitude profile and a controlled stop.",
    example: "Agentech.forward(speed_mps=1.0, duration_s=1.0)",
    profiles: [
      { name: "Default: 1 m/s for 1 second", syntax: "Agentech.forward()" },
      { name: "Direct speed", syntax: "Agentech.forward(speed_mps=0.4, duration_s=1.0)", note: "Distance is an estimate, not a guarantee: the robot needs time to accelerate to the requested speed, so the actual distance traveled may differ from the value you calculate." },
      { name: "Distance + speed", syntax: "Agentech.forward(distance_m=1.0, speed_mps=0.4)", noteLabel: "Time note", note: "Time is an estimate, not a guarantee: the robot needs time to accelerate to the requested speed, so the actual time used may differ from the value you calculate." },
      { name: "Percentage", syntax: "Agentech.forward(speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.forward(speed_level=100, duration_s=1.0)" },
      { name: "Pace", syntax: "Agentech.forward(pace=\"normal\", duration_s=1.0)", status: "development" },
      { name: "Steps", syntax: "Agentech.forward(step_count=6, step_rate_hz=1.5)", status: "development" }
    ],
    params: [
      p("speed_mps", "float [0.05, 3.00]", "Direct positive forward speed in meters per second. Values outside the range are rejected.", "1.0"), p("duration_s", "float (0, 10]", "How long to hold the movement command. Must be greater than 0 and no more than 10 seconds.", "1.0"),
      p("distance_m", "float [0, 2]", "Requested travel distance for the distance-and-speed profile. This is an open-loop estimate; acceleration and stopping can change the actual distance."),
      p("speed_percent", "float [0, 100]", "Accepts any percentage from 0% through 100%, including decimal values. Use this as a relative speed request; no meters-per-second conversion is promised."), p("speed_level", "int [0, 511]", "Select one of 512 integer speed levels. Level 0 is the lowest moving-speed level and level 511 is the highest."),
      p("pace", "enum {slow, normal, fast}", "Named pace profiles are still being designed and physically validated.", undefined, "development"),
      p("step_count", "int [1, 20]", "Estimated steps; exact foot contacts are not available.", undefined, "development"),
      p("step_rate_hz", "float [0.5, 3.0]", "Estimated cadence only; the backend cannot command exact gait cadence.", "1.5", "development")
    ]
  },
  {
    name: "backward", category: "Movement", signature: "Agentech.backward(speed_mps=1.0, duration_s=1.0)", summary: "Move backward using one positive speed-magnitude profile; direction is applied internally.", example: "Agentech.backward(speed_mps=1.0, duration_s=1.0)",
    profiles: [
      { name: "Default: 1 m/s for 1 second", syntax: "Agentech.backward()" },
      { name: "Direct speed", syntax: "Agentech.backward(speed_mps=0.4, duration_s=1.0)", note: "Distance is an estimate, not a guarantee: the robot needs time to accelerate to the requested speed, so the actual distance traveled may differ from the value you calculate." },
      { name: "Distance + speed", syntax: "Agentech.backward(distance_m=1.0, speed_mps=0.4)", noteLabel: "Time note", note: "Time is an estimate, not a guarantee: the robot needs time to accelerate to the requested speed, so the actual time used may differ from the value you calculate." },
      { name: "Percentage", syntax: "Agentech.backward(speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.backward(speed_level=100, duration_s=1.0)" },
      { name: "Pace", syntax: "Agentech.backward(pace=\"normal\", duration_s=1.0)", status: "development" },
      { name: "Steps", syntax: "Agentech.backward(step_count=6, step_rate_hz=1.5)", status: "development" }
    ],
    params: [p("speed_mps", "float [0.05, 3.00]", "Enter a positive backward speed magnitude in meters per second; the SDK applies the negative body-X direction internally. Negative public inputs and out-of-range values are rejected.", "1.0"), p("duration_s", "float (0, 10]", "How long to hold the movement command. Must be greater than 0 and no more than 10 seconds.", "1.0"), p("distance_m", "float [0, 2]", "Requested travel distance for the distance-and-speed profile. This is an open-loop estimate; acceleration and stopping can change the actual distance."), p("speed_percent", "float [0, 100]", "Accepts any percentage from 0% through 100%, including decimal values. Use this as a relative speed request; no meters-per-second conversion is promised."), p("speed_level", "int [0, 511]", "Select one of 512 integer speed levels. Level 0 is the lowest moving-speed level and level 511 is the highest."), p("pace", "enum {slow, normal, fast}", "Named pace profiles are still being designed and physically validated.", undefined, "development"), p("step_count", "int [1, 10]", "Estimated, not physically counted.", undefined, "development"), p("step_rate_hz", "float [0.5, 3.0]", "Estimated cadence only.", "1.5", "development")]
  },
  {
    name: "lateral", category: "Movement", signature: "Agentech.lateral(direction=\"left\", speed_mps=0.2, duration_s=1.0)", summary: "Move sideways left or right with a canonical direction parameter.", example: "Agentech.lateral(direction=\"left\", speed_mps=0.2, duration_s=1.0)",
    profiles: [
      { name: "Default speed", syntax: "Agentech.lateral(direction=\"left\")" },
      { name: "Direct speed", syntax: "Agentech.lateral(direction=\"left\", speed_mps=0.2, duration_s=1.0)" },
      { name: "Percentage", syntax: "Agentech.lateral(direction=\"left\", speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.lateral(direction=\"left\", speed_level=2, duration_s=1.0)" },
      { name: "Distance", syntax: "Agentech.lateral(direction=\"left\", distance_m=0.5, speed_mps=0.2)" },
      { name: "Steps", syntax: "Agentech.lateral(direction=\"left\", step_count=4, step_rate_hz=1.5)", status: "development" }
    ],
    params: [p("direction", "left | right", "Required movement direction."), p("speed_mps", "float [0.05, 3.00]", "Direct lateral speed.", "0.2"), p("duration_s", "float (0, 10]", "Timed movement duration.", "1.0"), p("speed_percent", "float [0, 100]", "Percentage-based speed selector."), p("speed_level", "int [0, 511]", "Integer speed-level selector."), p("distance_m", "float (0, 2]", "Open-loop distance conversion."), p("step_count", "int [1, 10]", "Approximate sidesteps only.", undefined, "development"), p("step_rate_hz", "float [0.5, 3.0]", "Exact gait cadence is unavailable.", "1.5", "development")]
  },
  {
    name: "turn", category: "Movement", signature: "Agentech.turn()", summary: "Turn using signed angles or rates. Direction note: all negative values turn left, and all positive values turn right. The default is +45 degrees (right).", example: "Agentech.turn()",
    profiles: [
      { name: "Default: turn right 45 degrees", syntax: "Agentech.turn()" },
      { name: "Angle + rate", syntax: "Agentech.turn(angle_deg=45, turn_rate_deg_s=22.5)\nAgentech.turn(angle_rad=0.7854, turn_rate_rad_s=0.3927)", noteLabel: "Angle note", note: "One full circle is 360 degrees, which equals 2pi radians. If you omit the rate, it defaults to 2 rad/s." },
      { name: "Rate percentage + time", syntax: "Agentech.turn(rate_percentage=40, duration_s=2.0)" },
      { name: "Turn level + time", syntax: "Agentech.turn(turn_level=256, duration_s=2.0)" },
      { name: "Rate + time", syntax: "Agentech.turn(turn_rate_deg_s=45, duration_s=2.0)\nAgentech.turn(turn_rate_rad_s=0.7854, duration_s=2.0)" },
      { name: "Default right: 90 degrees at 2 rad/s", syntax: "Agentech.turnright()" },
      { name: "Default left: 90 degrees at 2 rad/s", syntax: "Agentech.turnleft()" },
      { name: "Default U-turn: 180 degrees at 2 rad/s", syntax: "Agentech.uturn()" }
    ],
    params: [p("angle_rad", "float (unbounded)", "Signed target angle in radians. Negative turns left; positive turns right. One full circle is 2pi radians (360 degrees)."), p("turn_rate_rad_s", "float [-3, 3]", "Signed turn rate in radians per second. Negative turns left; positive turns right."), p("angle_deg", "float (unbounded)", "Signed target angle in degrees. Negative turns left; positive turns right. One full circle is 360 degrees."), p("turn_rate_deg_s", "float [-120, 120]", "Signed turn rate in degrees per second. Negative turns left; positive turns right."), p("rate_percentage", "float [-100, 100]", "Signed percentage of the maximum turn rate. Negative turns left; positive turns right."), p("turn_level", "int [-511, 511]", "Signed turn-rate level: -511 is maximum left, 0 is neutral, and 511 is maximum right."), p("duration_s", "float > 0 (no maximum)", "How long to apply a rate-based turn command. There is no maximum duration."), p("turnright()", "convenience call", "Turns right 90 degrees at 2 radians per second."), p("turnleft()", "convenience call", "Turns left 90 degrees at 2 radians per second."), p("uturn()", "convenience call", "Turns right 180 degrees at 2 radians per second.")]
  },
  {
    name: "yaw", category: "Posture", signature: "Agentech.yaw(direction=\"left\", angle_deg=15)", summary: "Adjust the body's yaw posture without walking the feet.", example: "Agentech.yaw(direction=\"left\", angle_deg=15, hold_s=0.5)",
    profiles: [
      { name: "Default angle", syntax: "Agentech.yaw(direction=\"left\")" },
      { name: "Angle", syntax: "Agentech.yaw(direction=\"left\", angle_deg=15, yaw_rate_rad_s=0.35)" },
      { name: "Percentage", syntax: "Agentech.yaw(direction=\"left\", angle_percent=50)" },
      { name: "Yaw level", syntax: "Agentech.yaw(direction=\"left\", yaw_level=3)" }
    ],
    params: [p("direction", "left | right", "Required yaw direction."), p("angle_deg", "float (0, 30]", "Open-loop body-yaw angle.", "15"), p("angle_percent", "int 1..100", "Percentage of 30 degrees."), p("yaw_level", "int 1..5", "Maps to 6, 12, 18, 24, or 30 degrees."), p("hold_s", "float 0..3", "Hold after reaching the yaw posture.", "0"), p("yaw_rate_rad_s", "float 0.05..0.5", "Official fixed-foot attitude-control range.", "0.35"), p("yaw_rate_rad_s > 0.5", "unsupported", "Would move the feet and violate the fixed-foot yaw definition.", undefined, "unsupported")]
  },
  {
    name: "backflip", category: "Movement", signature: "Agentech.backflip(variant=\"standard\", stabilize_s=5.0)", summary: "Run the official standard backflip preset without automatic retry.", example: "Agentech.backflip(variant=\"standard\", stabilize_s=5.0)",
    params: [p("variant", "standard", "Only the official standard preset is available.", "standard"), p("stabilize_s", "float 0..10", "Post-action stabilization window.", "5.0"), p("SafetyGate", "system behavior", "Formal battery, posture, and readiness thresholds are being implemented.", undefined, "development")]
  },
  {
    name: "jump", category: "Movement", signature: "Agentech.jump(variant=\"standard\", stabilize_s=5.0)", summary: "Run the official standard jump preset.", example: "Agentech.jump(variant=\"standard\", stabilize_s=5.0)",
    params: [p("variant", "standard", "Only the standard jump exists.", "standard"), p("stabilize_s", "float 0..10", "Post-jump stabilization window.", "5.0"), p("height_level", "1 | 2 | 3", "The audited backend has no low, medium, or high jump presets.", undefined, "unsupported"), p("SafetyGate", "system behavior", "Formal safety thresholds are under development.", undefined, "development")]
  },
  {
    name: "stand", category: "Posture", signature: "Agentech.stand(stabilize_s=5.0, posture=\"neutral\")", summary: "Stand in the supported neutral posture and stabilize.", example: "Agentech.stand(stabilize_s=5.0, posture=\"neutral\")",
    params: [p("stabilize_s", "float 0..10", "Wait after standing.", "5.0"), p("height_level=2", "neutral", "Supported neutral vendor stand.", "2"), p("posture=neutral", "neutral", "Alias for neutral height level 2.", "neutral"), p("height_level=1 / posture=low", "calibration", "Low stand target has not been physically calibrated.", undefined, "development"), p("height_level=3 / posture=tall", "calibration", "Tall stand target has not been physically calibrated.", undefined, "development"), p("stable-state confirmation", "system behavior", "Polling and timeout thresholds are under development.", undefined, "development")]
  },
  {
    name: "sit", category: "Posture", signature: "Agentech.sit(mode=\"damping\", stabilize_s=2.0)", summary: "Transition into the supported damping/lie-down posture.", example: "Agentech.sit(mode=\"damping\", stabilize_s=2.0)",
    params: [p("mode", "damping", "Only the damping mode is approved.", "damping"), p("stabilize_s", "float 0..10", "Posture stabilization wait.", "2.0"), p("posture-state validation", "system behavior", "State-read validation is under development.", undefined, "development")]
  },
  {
    name: "stop", category: "Safety", signature: "Agentech.stop(mode=\"quick\", timeout_s=2.0)", summary: "Stop motion immediately or through a developing controlled-deceleration profile.", example: "Agentech.stop(mode=\"quick\", timeout_s=2.0)",
    params: [p("mode=quick", "quick", "Send zero velocity immediately.", "quick"), p("timeout_s", "float 0.1..5", "Wait or poll timeout.", "2.0"), p("mode=controlled", "controlled", "Software velocity ramp is under development.", undefined, "development"), p("decel_level", "int 1..5", "Calibrated deceleration mappings are under development.", "3", "development"), p("preemption", "system behavior", "Shared command coordination is under development.", undefined, "development")]
  },
  {
    name: "emergency_stop", category: "Safety", signature: "Agentech.emergency_stop(reason=\"Emergency stop\", latch=True, mode=\"damping\")", summary: "Highest-priority damping stop; persistent latch behavior is still being completed.", example: "Agentech.emergency_stop(reason=\"Operator requested stop\", mode=\"damping\")",
    params: [p("reason", "str", "Operator-readable trace message.", "Emergency stop"), p("mode", "damping", "Native safe damping path.", "damping"), p("latch", "bool", "Persistent cross-call latch requires shared controller state.", "True", "development"), p("highest-priority preemption", "system behavior", "Shared command coordinator is under development.", undefined, "development"), p("reset API", "unsupported", "No public reset function exists in the current card contract.", undefined, "unsupported")]
  },
  {
    name: "look", category: "Sensing", signature: "Agentech.look(direction=\"up\", target=\"body\", angle_deg=10)", summary: "Pitch the robot body up or down; independent camera pitch is unavailable.", example: "Agentech.look(direction=\"down\", target=\"body\", look_level=3)",
    params: [p("direction", "up | down", "Required pitch direction."), p("target=auto", "auto", "Selects the supported body target.", "auto"), p("target=body", "body", "Native fixed-foot body pitch."), p("target=camera", "unsupported", "No independent camera actuator API is documented.", undefined, "unsupported"), p("angle_deg", "float (0, 25]", "Open-loop body-pitch angle.", "10"), p("pitch_rate_rad_s", "float 0.03..0.5", "Attitude-control pitch velocity.", "0.12"), p("angle_percent", "int 1..100", "Percentage of 25 degrees."), p("look_level", "int 1..5", "Maps to 5, 10, 15, 20, or 25 degrees."), p("final-angle verification", "system behavior", "IMU-backed verification is under development.", undefined, "development")]
  }
] as const;

export const starterCode = `from agentech import Agentech

Agentech.stand(stabilize_s=5.0, posture="neutral")
Agentech.forward(speed_mps=0.3, duration_s=1.0)
Agentech.lateral(direction="left", speed_mps=0.2, duration_s=1.0)
Agentech.turn(angle_deg=45, turn_rate_deg_s=22.5)
Agentech.look(direction="down", target="body", look_level=3)
Agentech.stop(mode="quick", timeout_s=2.0)`;
