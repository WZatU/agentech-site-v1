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
  category: "Movement" | "Athletics" | "Actions" | "Posture" | "Configuration" | "Safety" | "Sensing";
  signature: string;
  summary: string;
  example: string;
  params: AgentechParam[];
  profiles?: { name: string; syntax: string; number?: number; note?: string; noteLabel?: string; status?: CapabilityStatus }[];
  verification?: string;
  platformNote?: string;
  platformNoteLabel?: string;
  status?: CapabilityStatus;
  creditUsage?: "high";
  access?: {
    tier: "premium";
    featureCode: string;
    includedWithMonthlySubscription: boolean;
    oneTimePurchase: boolean;
  };
};

const p = (name: string, type: string, description: string, defaultValue?: string, status: CapabilityStatus = "available"): AgentechParam =>
  ({ name, type, description, defaultValue, status });

const squatPreparationNote = "Before using this movement, make sure the dog is in squat mode by running Agentech.squat().";
const squatDistanceNote = "Distance traveled is not guaranteed. Squat movement is open loop, so acceleration, stabilization, and stopping can change the actual distance.";

export const agentechFunctions: AgentechFunction[] = [
  {
    name: "forward", category: "Movement", signature: "Agentech.forward()",
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
    name: "backward", category: "Movement", signature: "Agentech.backward()", summary: "Move backward using one positive speed-magnitude profile; direction is applied internally.", example: "Agentech.backward(speed_mps=1.0, duration_s=1.0)",
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
    name: "lateral", category: "Movement", signature: "Agentech.lateral_left() / Agentech.lateral_right()", summary: "Move sideways using the matching left or right function.", example: "# Distance + speed\nAgentech.lateral_left(distance_m=1.0, speed_mps=0.5)\nAgentech.lateral_right(distance_m=1.0, speed_mps=0.5)\n\n# Speed + time\nAgentech.lateral_left(speed_mps=0.5, duration_s=2.0)\nAgentech.lateral_right(speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Default: 0.5 m/s for 2 seconds", syntax: "Agentech.lateral_left()\nAgentech.lateral_right()" },
      { name: "Distance + speed", syntax: "Agentech.lateral_left(distance_m=x, speed_mps=x)\nAgentech.lateral_right(distance_m=x, speed_mps=x)", noteLabel: "Time note", note: "Completion time remains an estimate because acceleration, stabilization, and controller timing can change how long the movement takes." },
      { name: "Speed + time", syntax: "Agentech.lateral_left(speed_mps=x, duration_s=x)\nAgentech.lateral_right(speed_mps=x, duration_s=x)", noteLabel: "Distance note", note: "Distance traveled is an estimate, not a guarantee. Acceleration and stopping can change the actual distance." }
    ],
    params: [p("speed_mps", "float [0.10, 1.0] m/s", "Positive lateral speed in meters per second. The supported range is 0.10 m/s through 1.0 m/s, inclusive.", "0.5"), p("duration_s", "float (0, 10] seconds", "How long to apply the lateral movement command.", "2.0"), p("distance_m", "float [0, 2] meters", "Requested open-loop lateral travel distance, including 0 and 2 meters. A value of 0 is accepted and produces no lateral movement.")]
  },
  {
    name: "diagonal", category: "Movement", signature: "Agentech.diagonal()", summary: "Move diagonally with public X/Y coordinates or an angle, combined diagonal speed, and duration. The combined speed is the hypotenuse of the resolved X/Y velocity components.", example: "# Coordinate + duration\nAgentech.diagonal(x_m=0.5, y_m=1.0, duration_s=2.0)\n\n# Angle + combined speed + duration\nAgentech.diagonal(angle_deg=45, speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Default: forward-right at 45 degrees, 0.5 m/s for 2 seconds", syntax: "Agentech.diagonal()", noteLabel: "Distance note", note: "The theoretical path is 1 meter. Diagonal movement is open loop, so acceleration, stopping, and wheel slip can change the actual distance." },
      { name: "X/Y coordinates + time", syntax: "Agentech.diagonal(x_m=0.5, y_m=1.0, duration_s=2.0)", noteLabel: "Coordinate note", note: "Positive X moves right and negative X moves left. Positive Y moves forward and negative Y moves backward. Both X and Y must be nonzero." },
      { name: "Angle + combined speed + time", syntax: "Agentech.diagonal(angle_deg=45, speed_mps=0.5, duration_s=2.0)", noteLabel: "Angle note", note: "The speed is the hypotenuse of the forward and lateral velocity components. 0 degrees is forward. Positive angles point right and negative angles point left. Use forward, backward, or lateral for cardinal directions." }
    ],
    params: [
      p("x_m", "float (nonzero)", "Open-loop right/left displacement. Positive is right; negative is left."),
      p("y_m", "float (nonzero)", "Open-loop forward/backward displacement. Positive is forward; negative is backward."),
      p("angle_deg", "float [-180, 180]", "Direction measured from forward. Positive points right and negative points left.", "45"),
      p("speed_mps", "float [0.05, 3.0] m/s", "Combined diagonal speed. Enter a value from 0.05 through 3.0 m/s, inclusive.", "0.5"),
      p("duration_s", "float (0, 10]", "How long to apply the diagonal velocity command.", "2.0")
    ]
  },
  {
    name: "squat_forward", category: "Movement", signature: "Agentech.squat_forward()",
    summary: "Walk forward in the latched low-gait squat stance, then stop and remain squatted.",
    example: "Agentech.squat_forward(speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Speed + time", syntax: "Agentech.squat_forward(speed_mps=0.5, duration_s=2.0)", noteLabel: "Distance note", note: squatDistanceNote }
    ],
    params: [
      p("speed_mps", "float [0.05, 3.00] m/s", "Required positive forward speed magnitude. Negative values and values outside the inclusive range are rejected."),
      p("duration_s", "float (0, 10] seconds", "Required time for the low-gait forward command.")
    ],
    platformNote: squatPreparationNote,
    platformNoteLabel: "Before movement"
  },
  {
    name: "squat_backward", category: "Movement", signature: "Agentech.squat_backward()",
    summary: "Walk backward in the latched low-gait squat stance, then stop and remain squatted.",
    example: "Agentech.squat_backward(speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Speed + time", syntax: "Agentech.squat_backward(speed_mps=0.5, duration_s=2.0)", noteLabel: "Distance note", note: squatDistanceNote }
    ],
    params: [
      p("speed_mps", "float [0.05, 3.00] m/s", "Required positive backward speed magnitude; the method applies the backward direction internally. Negative values and values outside the inclusive range are rejected."),
      p("duration_s", "float (0, 10] seconds", "Required time for the low-gait backward command.")
    ],
    platformNote: squatPreparationNote,
    platformNoteLabel: "Before movement"
  },
  {
    name: "squat_lateral", category: "Movement", signature: "Agentech.squat_lateral()",
    summary: "Walk left or right in the latched low-gait squat stance, then stop and remain squatted.",
    example: "Agentech.squat_lateral(direction=\"left\", speed_mps=0.5, duration_s=2.0)\nAgentech.squat_lateral(direction=\"right\", speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Direction + speed + time", syntax: "Agentech.squat_lateral(direction=\"left\", speed_mps=0.5, duration_s=2.0)", noteLabel: "Distance note", note: squatDistanceNote }
    ],
    params: [
      p("direction", "enum {left, right}", "Required low-gait lateral direction. Use a positive speed magnitude; do not encode direction in the speed."),
      p("speed_mps", "float [0.10, 1.00] m/s", "Required positive lateral speed magnitude in the inclusive supported range."),
      p("duration_s", "float (0, 10] seconds", "Required time for the low-gait lateral command.")
    ],
    platformNote: squatPreparationNote,
    platformNoteLabel: "Before movement"
  },
  {
    name: "squat_diagonal", category: "Movement", signature: "Agentech.squat_diagonal()",
    summary: "Move diagonally in the latched low-gait squat stance using an angle, speed, and duration, then remain squatted.",
    example: "Agentech.squat_diagonal(angle_deg=45, speed_mps=0.5, duration_s=2.0)",
    profiles: [
      { name: "Angle + speed + time", syntax: "Agentech.squat_diagonal(angle_deg=45, speed_mps=0.5, duration_s=2.0)", noteLabel: "Distance and angle note", note: `${squatDistanceNote} Both resolved components must be nonzero and within their limits, so cardinal angles are rejected. Positive angles point right; negative angles point left.` }
    ],
    params: [
      p("angle_deg", "float [-180, 180], non-cardinal", "Required direction measured from forward. Positive points right and negative points left; cardinal angles are invalid because both components must move."),
      p("speed_mps", "float > 0, component-limited", "Required positive combined diagonal speed. The resolved forward magnitude must be 0.05-3.0 m/s and the resolved lateral magnitude must be 0.1-1.0 m/s."),
      p("duration_s", "float (0, 10] seconds", "Required time for the low-gait diagonal command.")
    ],
    platformNote: squatPreparationNote,
    platformNoteLabel: "Before movement"
  },
  {
    name: "squat_turn", category: "Movement", signature: "Agentech.squat_turn()",
    summary: "Turn by an IMU-measured angle while remaining in the latched squat gait.",
    example: "Agentech.squat_turn(angle_deg=90)",
    profiles: [
      { name: "Angle", syntax: "Agentech.squat_turn(angle_deg=90)", noteLabel: "Direction note", note: "Positive angles turn right and negative angles turn left. The low-gait turn rate is selected automatically." }
    ],
    params: [
      p("angle_deg", "float (nonzero, unbounded)", "Required signed target angle in degrees. Positive turns right and negative turns left.")
    ],
    platformNote: squatPreparationNote,
    platformNoteLabel: "Before movement"
  },
  {
    name: "turn", category: "Movement", signature: "Agentech.turn()", summary: "Turn using signed angles or rates. Direction note: all negative values turn left, and all positive values turn right. The default is +45 degrees (right).", example: "Agentech.turn()",
    profiles: [
      { name: "Default: turn right 45 degrees", syntax: "Agentech.turn()" },
      { name: "Angle + rate", syntax: "Agentech.turn(angle_deg=45, turn_rate_deg_s=22.5)\nAgentech.turn(angle_rad=0.7854, turn_rate_rad_s=0.3927)", noteLabel: "Angle note", note: "One full circle is 360 degrees, which equals 2pi radians. If you omit the rate, it defaults to 2 rad/s." },
      { name: "Rate percentage + time", syntax: "Agentech.turn(rate_percentage=40, duration_s=2.0)" },
      { name: "Turn level + time", syntax: "Agentech.turn(turn_level=256, duration_s=2.0)" },
      { name: "Rate + time", syntax: "Agentech.turn(turn_rate_deg_s=45, duration_s=2.0)\nAgentech.turn(turn_rate_rad_s=0.7854, duration_s=2.0)" },
      { name: "Fixed right: 90 degrees", syntax: "Agentech.turn_right()" },
      { name: "Fixed left: 90 degrees", syntax: "Agentech.turn_left()" },
      { name: "Fixed U-turn: 180 degrees left", syntax: "Agentech.u_turn()" }
    ],
    params: [p("angle_rad", "float (unbounded)", "Signed target angle in radians. Negative turns left; positive turns right. One full circle is 2pi radians (360 degrees)."), p("turn_rate_rad_s", "float [-3, 3]", "Signed turn rate in radians per second. Negative turns left; positive turns right."), p("angle_deg", "float (unbounded)", "Signed target angle in degrees. Negative turns left; positive turns right. One full circle is 360 degrees."), p("turn_rate_deg_s", "float [-120, 120]", "Signed turn rate in degrees per second. Negative turns left; positive turns right."), p("rate_percentage", "float [-100, 100]", "Signed percentage of the maximum turn rate. Negative turns left; positive turns right."), p("turn_level", "int [-511, 511]", "Signed turn-rate level: -511 is maximum left, 0 is neutral, and 511 is maximum right."), p("duration_s", "float > 0 (no maximum)", "How long to apply a rate-based turn command. There is no maximum duration."), p("turn_right()", "convenience call", "Fixed right 90-degree turn with no parameters."), p("turn_left()", "convenience call", "Fixed left 90-degree turn with no parameters."), p("u_turn()", "convenience call", "Fixed left 180-degree turn with no parameters.")]
  },
  {
    name: "yaw", category: "Posture", signature: "Agentech.yaw()", summary: "Adjust the body's yaw posture using a positive speed and signed target position. Direction note: negative position moves left, and positive position moves right.", example: "Agentech.yaw()",
    profiles: [
      { name: "Default: 0.4 rad/s, position +0.4426 rad (maximum right)", syntax: "Agentech.yaw()" },
      { name: "Speed + position", syntax: "Agentech.yaw(speed_rad_s=0.4, position_rad=0.4426)\nAgentech.yaw(speed_deg_s=22.92, position_deg=25.36)", noteLabel: "Direction and time note", note: "Negative position moves left; positive position moves right. Completion time cannot be guaranteed because acceleration, stabilization, and controller timing can change how long the movement takes." }
    ],
    params: [p("speed_rad_s", "float [0, 0.6]", "Positive yaw speed magnitude in radians per second."), p("speed_deg_s", "float [0, 34.38]", "Positive yaw speed magnitude in degrees per second."), p("position_rad", "float [-0.466, 0.4426]", "Signed target position in radians. Negative moves left; positive moves right."), p("position_deg", "float [-26.73, 25.36]", "Signed target position in degrees. Negative moves left; positive moves right.")]
  },
  {
    name: "pitch", category: "Posture", signature: "Agentech.pitch()", summary: "Adjust the body's pitch posture using a positive speed and signed target position. Direction note: negative position moves down, and positive position moves up.", example: "Agentech.pitch()",
    profiles: [
      { name: "Default: 0.4 rad/s, position 0.4 rad (maximum up)", syntax: "Agentech.pitch()" },
      { name: "Speed + position", syntax: "Agentech.pitch(speed_rad_s=0.4, position_rad=0.4)\nAgentech.pitch(speed_deg_s=22.92, position_deg=22.98)", noteLabel: "Direction and time note", note: "Negative position moves down; positive position moves up. Completion time cannot be guaranteed because acceleration, stabilization, and controller timing can change how long the movement takes." }
    ],
    params: [p("speed_rad_s", "float [0, 0.6]", "Positive pitch speed magnitude in radians per second."), p("speed_deg_s", "float [0, 34.38]", "Positive pitch speed magnitude in degrees per second."), p("position_rad", "float [-0.368, 0.4]", "Signed target position in radians. Negative moves down; positive moves up."), p("position_deg", "float [-21.11, 22.98]", "Signed target position in degrees. Negative moves down; positive moves up.")]
  },
  {
    name: "roll", category: "Posture", signature: "Agentech.roll()", summary: "Adjust the body's roll posture using a positive speed and signed target position. Direction note: negative position rolls left, and positive position rolls right.", example: "Agentech.roll()",
    profiles: [
      { name: "Default: 0.4 rad/s, position -0.463 rad (maximum left)", syntax: "Agentech.roll()" },
      { name: "Speed + position", syntax: "Agentech.roll(speed_rad_s=0.4, position_rad=-0.463)\nAgentech.roll(speed_deg_s=22.92, position_deg=-26.6)", noteLabel: "Direction and time note", note: "Negative position rolls left; positive position rolls right. Completion time cannot be guaranteed because acceleration, stabilization, and controller timing can change how long the movement takes." }
    ],
    params: [p("speed_rad_s", "float [0, 0.6]", "Positive roll speed magnitude in radians per second."), p("speed_deg_s", "float [0, 34.38]", "Positive roll speed magnitude in degrees per second."), p("position_rad", "float [-0.463, 0.461]", "Signed target position in radians. Negative rolls left; positive rolls right."), p("position_deg", "float [-26.6, 26.4]", "Signed target position in degrees. Negative rolls left; positive rolls right.")]
  },
  {
    name: "stay", category: "Posture", signature: "Agentech.stay(time=1.0)", summary: "Holds the posture the dog has moved to while all four feet remain planted on the ground.", example: "Agentech.stay(time=1.0)",
    profiles: [
      { name: "Holding time", syntax: "Agentech.stay(time=1.0)" }
    ],
    params: [p("time", "float > 0 (no maximum)", "How long to hold the current four-foot planted posture. Time must be greater than 0 and has no maximum.")]
  },
  {
    name: "backflip", category: "Movement", signature: "Agentech.backflip()", summary: "Run the official standard backflip preset without automatic retry.", example: "Agentech.backflip(variant=\"standard\", stabilize_s=5.0)",
    params: [p("variant", "standard", "Only the official standard preset is available.", "standard"), p("stabilize_s", "float 0..10", "Post-action stabilization window.", "5.0"), p("SafetyGate", "system behavior", "Formal battery, posture, and readiness thresholds are being implemented.", undefined, "development")]
  },
  {
    name: "jump", category: "Movement", signature: "Agentech.jump()", summary: "Run the official standard jump preset.", example: "Agentech.jump(variant=\"standard\", stabilize_s=5.0)",
    params: [p("variant", "standard", "Only the standard jump exists.", "standard"), p("stabilize_s", "float 0..10", "Post-jump stabilization window.", "5.0"), p("height_level", "1 | 2 | 3", "The audited backend has no low, medium, or high jump presets.", undefined, "unsupported"), p("SafetyGate", "system behavior", "Formal safety thresholds are under development.", undefined, "development")]
  },
  {
    name: "stand", category: "Posture", signature: "Agentech.stand()", summary: "Raise the dog into its full standing stance so it is ready to move forward.", example: "Agentech.stand()",
    params: []
  },
  {
    name: "squat", category: "Posture", signature: "Agentech.squat()", summary: "Put the Aegis dog into its squat stance and keep it ready for squat movement commands.", example: "Agentech.squat()",
    params: []
  },
  {
    name: "sit", category: "Posture", signature: "Agentech.sit()", summary: "Put the dog into damping mode.", example: "Agentech.sit()",
    params: []
  },
  {
    name: "stop", category: "Safety", signature: "Agentech.stop()", summary: "Stop the current motion while the dog remains standing.", example: "Agentech.stop()",
    params: []
  },
  {
    name: "emergency_stop", category: "Safety", signature: "Agentech.emergency_stop()", summary: "Immediately stop the dog and put it into damping mode.", example: "Agentech.emergency_stop()",
    params: []
  },
  {
    name: "battery", category: "Sensing", signature: "Agentech.battery()", summary: "Read the current battery percentage without changing the dog's body mode.", example: "battery = Agentech.battery()\nprint(battery)  # Battery: 76%",
    params: []
  },
  {
    name: "get_body_state", category: "Sensing", signature: "Agentech.get_body_state()", summary: "Return the current body mode as Stand, Squat, or Damp.", example: "mode = Agentech.get_body_state()\nprint(mode)  # Mode: Stand",
    params: []
  },
  {
    name: "imu", category: "Sensing", signature: "Agentech.imu()", summary: "Start a non-blocking live IMU monitor that can run while other movement commands execute.", example: "imu = Agentech.imu(freq_hz=5)\nAgentech.forward(speed_mps=0.5, duration_s=2.0)\nimu.stop()",
    profiles: [
      { name: "Default: 5 Hz", syntax: "imu = Agentech.imu()" },
      { name: "Selected frequency", syntax: "imu = Agentech.imu(freq_hz=3)" }
    ],
    params: [p("freq_hz", "float [1, 5] Hz", "How many readable IMU updates to produce per second.", "5")]
  },
  {
    name: "capture_image", category: "Sensing", signature: "Agentech.capture_image()", summary: "Capture one auto-discovered dog-camera frame for internal Python decisions or paid website display.", example: "# Internal code use; no website display charge\nimage = Agentech.capture_image(mode=\"internal\")\n\n# Paid website display\nimage = Agentech.capture_image(mode=\"display\")",
    profiles: [
      { name: "Internal (default)", syntax: "image = Agentech.capture_image(mode=\"internal\")", noteLabel: "Display note", note: "The image is returned to Python only and is not displayed on the website." },
      { name: "Website display (paid)", syntax: "image = Agentech.capture_image(mode=\"display\")", noteLabel: "Credit note", note: "The image is returned to Python and displayed beside the live stream. The website charges the configured display-image credit price." }
    ],
    params: [p("mode", "enum {internal, display}", "Choose internal Python use or paid website display.", "internal")]
  }
] as const;

export const starterCode = `from agentech import Agentech
Agentech.use("aegis")`;
