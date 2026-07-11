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
  profiles?: { name: string; syntax: string; status?: CapabilityStatus }[];
};

const p = (name: string, type: string, description: string, defaultValue?: string, status: CapabilityStatus = "available"): AgentechParam =>
  ({ name, type, description, defaultValue, status });

export const agentechFunctions: AgentechFunction[] = [
  {
    name: "forward", category: "Movement", signature: "Agentech.forward(speed_mps=0.4, duration_s=1.0)",
    summary: "Move forward using one positive speed-magnitude profile and a controlled stop.",
    example: "Agentech.forward(speed_mps=0.4, duration_s=1.0)",
    profiles: [
      { name: "Default", syntax: "Agentech.forward()" },
      { name: "Direct speed", syntax: "Agentech.forward(speed_mps=0.4, duration_s=1.0)" },
      { name: "Percentage", syntax: "Agentech.forward(speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.forward(speed_level=100, duration_s=1.0)" },
      { name: "Pace", syntax: "Agentech.forward(pace=\"normal\", duration_s=1.0)", status: "development" },
      { name: "Distance (open-loop estimate)", syntax: "Agentech.forward(distance_m=1.0, duration_s=2.0)" },
      { name: "Steps", syntax: "Agentech.forward(step_count=6, step_rate_hz=1.5)", status: "development" }
    ],
    params: [
      p("speed_mps", "float 0.05..3.00", "Direct positive forward speed in meters per second. Values outside the range are rejected.", "0.4"), p("duration_s", "float (0, 10]", "How long to hold the movement command. Must be greater than 0 and no more than 10 seconds.", "1.0"),
      p("speed_percent", "float 0..100", "Accepts any percentage from 0% through 100%, including decimal values. Use this as a relative speed request; no meters-per-second conversion is promised."), p("speed_level", "int 0..511", "Select one of 512 integer speed levels. Level 0 is the lowest moving-speed level and level 511 is the highest."),
      p("pace", "slow | normal | fast", "Named pace profiles are still being designed and physically validated.", undefined, "development"), p("distance_m", "float (0, 5]", "Open-loop estimate only. The SDK derives a timed velocity from distance and duration; acceleration, gait transitions, foot slip, terrain, and stopping latency can change the actual distance."),
      p("step_count", "int 1..20", "Estimated steps; exact foot contacts are not available.", undefined, "development"),
      p("step_rate_hz", "float 0.5..3.0", "Estimated cadence only; the backend cannot command exact gait cadence.", "1.5", "development")
    ]
  },
  {
    name: "backward", category: "Movement", signature: "Agentech.backward(speed_mps=0.4, duration_s=1.0)", summary: "Move backward using one positive speed-magnitude profile; direction is applied internally.", example: "Agentech.backward(speed_percent=30, duration_s=1.0)",
    profiles: [
      { name: "Default", syntax: "Agentech.backward()" },
      { name: "Direct speed", syntax: "Agentech.backward(speed_mps=0.4, duration_s=1.0)" },
      { name: "Percentage", syntax: "Agentech.backward(speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.backward(speed_level=100, duration_s=1.0)" },
      { name: "Pace", syntax: "Agentech.backward(pace=\"normal\", duration_s=1.0)", status: "development" },
      { name: "Distance (open-loop estimate)", syntax: "Agentech.backward(distance_m=1.0, duration_s=2.0)" },
      { name: "Steps", syntax: "Agentech.backward(step_count=6, step_rate_hz=1.5)", status: "development" }
    ],
    params: [p("speed_mps", "float 0.05..3.00", "Enter a positive backward speed magnitude in meters per second; the SDK applies the negative body-X direction internally. Negative public inputs and out-of-range values are rejected.", "0.4"), p("duration_s", "float (0, 10]", "How long to hold the movement command. Must be greater than 0 and no more than 10 seconds.", "1.0"), p("speed_percent", "float 0..100", "Accepts any percentage from 0% through 100%, including decimal values. Use this as a relative speed request; no meters-per-second conversion is promised."), p("speed_level", "int 0..511", "Select one of 512 integer speed levels. Level 0 is the lowest moving-speed level and level 511 is the highest."), p("pace", "slow | normal | fast", "Named pace profiles are still being designed and physically validated.", undefined, "development"), p("distance_m", "float (0, 3]", "Open-loop estimate only. The SDK derives a timed backward velocity from distance and duration; acceleration, gait transitions, foot slip, terrain, and stopping latency can change the actual distance."), p("step_count", "int 1..10", "Estimated, not physically counted.", undefined, "development"), p("step_rate_hz", "float 0.5..3.0", "Estimated cadence only.", "1.5", "development")]
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
    params: [p("direction", "left | right", "Required movement direction."), p("speed_mps", "float (0, 0.78]", "Direct lateral speed.", "0.2"), p("duration_s", "float (0, 10]", "Timed movement duration.", "1.0"), p("speed_percent", "int 1..100", "Percentage of 0.5 m/s."), p("speed_level", "int 1..5", "Maps to 0.1 through 0.5 m/s."), p("distance_m", "float (0, 2]", "Open-loop distance conversion."), p("step_count", "int 1..10", "Approximate sidesteps only.", undefined, "development"), p("step_rate_hz", "float 0.5..3.0", "Exact gait cadence is unavailable.", "1.5", "development")]
  },
  {
    name: "turn", category: "Movement", signature: "Agentech.turn(direction=\"right\", angle_deg=90)", summary: "Turn left or right using angle, percentage, level, quarter-turn, or duration profiles.", example: "Agentech.turn(direction=\"right\", quarter_turns=1)",
    profiles: [
      { name: "Default angle", syntax: "Agentech.turn(direction=\"right\")" },
      { name: "Angle", syntax: "Agentech.turn(direction=\"right\", angle_deg=90, yaw_rate_rad_s=0.35)" },
      { name: "Percentage", syntax: "Agentech.turn(direction=\"right\", angle_percent=25)" },
      { name: "Turn level", syntax: "Agentech.turn(direction=\"right\", turn_level=3)" },
      { name: "Quarter turns", syntax: "Agentech.turn(direction=\"right\", quarter_turns=1)" },
      { name: "Timed yaw", syntax: "Agentech.turn(direction=\"right\", duration_s=1.0, yaw_rate_rad_s=0.35)" }
    ],
    params: [p("direction", "left | right", "Required turn direction."), p("angle_deg", "float (0, 360]", "Open-loop turn angle.", "45"), p("yaw_rate_rad_s", "float 0.05..2.09", "Yaw velocity.", "0.35"), p("angle_percent", "int 1..100", "Percentage of 360 degrees."), p("turn_level", "int 1..5", "Maps to 15, 30, 45, 60, or 90 degrees."), p("quarter_turns", "int 1..4", "Number of 90-degree turns."), p("duration_s", "float (0, 10]", "Direct timed yaw profile."), p("slow_large_turn", "derived duration", "Timeout policy for slow, large angle-rate turns is still being finalized.", undefined, "development")]
  },
  {
    name: "twist", category: "Movement", signature: "Agentech.twist(direction=\"left\", angle_deg=15)", summary: "Fixed-foot body twist without walking the feet.", example: "Agentech.twist(direction=\"left\", angle_deg=15, hold_s=0.5)",
    profiles: [
      { name: "Default angle", syntax: "Agentech.twist(direction=\"left\")" },
      { name: "Angle", syntax: "Agentech.twist(direction=\"left\", angle_deg=15, yaw_rate_rad_s=0.35)" },
      { name: "Percentage", syntax: "Agentech.twist(direction=\"left\", angle_percent=50)" },
      { name: "Twist level", syntax: "Agentech.twist(direction=\"left\", twist_level=3)" }
    ],
    params: [p("direction", "left | right", "Required twist direction."), p("angle_deg", "float (0, 30]", "Open-loop twist angle.", "15"), p("angle_percent", "int 1..100", "Percentage of 30 degrees."), p("twist_level", "int 1..5", "Maps to 6, 12, 18, 24, or 30 degrees."), p("hold_s", "float 0..3", "Hold after reaching the twist.", "0"), p("yaw_rate_rad_s", "float 0.05..0.5", "Official fixed-foot attitude-control range.", "0.35"), p("yaw_rate_rad_s > 0.5", "unsupported", "Would move the feet and violate the fixed-foot twist definition.", undefined, "unsupported")]
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
Agentech.turn(direction="right", quarter_turns=1)
Agentech.look(direction="down", target="body", look_level=3)
Agentech.stop(mode="quick", timeout_s=2.0)`;
