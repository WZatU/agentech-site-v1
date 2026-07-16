import type { AgentechFunction, AgentechParam, CapabilityStatus } from "@/lib/agentech-library";

const p = (
  name: string,
  type: string,
  description: string,
  defaultValue?: string,
  status: CapabilityStatus = "available"
): AgentechParam => ({ name, type, description, defaultValue, status });

const naviConnection = p(
  "**connect_kwargs",
  "not accepted per call",
  "Configure host, port, timeout, dry_run, and client_factory once with Agentech.use(\"navi\", ...). Per-call connection options raise TypeError."
);

const controlledStop = p(
  "stop",
  "bool",
  "When true, send 12 repeated zero-velocity samples after movement. False is advanced use and leaves cleanup to Agentech.stop().",
  "True"
);

const athleticsCarpetNote =
  "These athletics tests were performed on carpet. Its compliant surface can cause landing rebound, foot slip, or uneven recovery even when Navi completes the command successfully.";

const namedExtendedAction = (
  name: string,
  summary: string,
  example = `Agentech.${name}()`
): AgentechFunction => ({
  name,
  category: "Actions",
  signature: `Agentech.${name}()`,
  summary,
  example,
  params: []
});

const namedCoreAction = (
  name: string,
  summary: string
): AgentechFunction => ({
  name,
  category: "Actions",
  signature: `Agentech.${name}()`,
  summary,
  example: `Agentech.${name}()`,
  params: []
});

const motionVerification = "Live verified 2026-07-15 with controller error=0 and warning=0";
export const naviFunctions: AgentechFunction[] = [
  {
    name: "forward",
    category: "Movement",
    signature: "Agentech.forward()",
    summary: "Move forward using Navi's 1.0 m/s default and the shared Aegis parameter profiles, while enforcing Navi's +1.34 m/s body-X limit.",
    example: "Agentech.forward(speed_mps=0.5, duration_s=1.0)",
    verification: "Live verified 2026-07-16 through Navi's 1.34 m/s limit with controller error=0 and warning=0",
    platformNote: "Navi has no dependable global X/Y odometry, so distance mode is open loop.",
    profiles: [
      { name: "Default: 1.0 m/s for 1 second", syntax: "Agentech.forward()" },
      { name: "Direct speed", syntax: "Agentech.forward(speed_mps=0.5, duration_s=1.0)", noteLabel: "Navi limits", note: "speed_mps must be from 0.05 through 1.34 m/s, and duration_s must be greater than 0 and no more than 10 seconds." },
      { name: "Distance + time", syntax: "Agentech.forward(distance_m=0.5, duration_s=2.0)", noteLabel: "Speed note", note: "The SDK derives speed as distance divided by duration. The resulting speed must remain within Navi's limit." },
      { name: "Percentage", syntax: "Agentech.forward(speed_percent=40, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.forward(speed_level=100, duration_s=1.0)" },
      { name: "Legacy aliases", syntax: "Agentech.forward(speed=0.5, seconds=1.0)" }
    ],
    params: [
      p("speed_mps", "float [0.05, 1.34] m/s", "Positive direct speed. The shared Aegis resolver accepts through 3.0 m/s, then the Navi adapter enforces 1.34 m/s."),
      p("duration_s", "float (0, 10] s", "Command duration.", "1.0"),
      p("speed_percent", "int [1, 100]", "Rounded to the nearest 5%; the resolved speed must remain at or below Navi's 1.34 m/s limit."),
      p("speed_level", "int [0, 511]", "One of 512 levels mapped from 0.05 to 3.0 m/s; the resolved Navi speed limit still applies."),
      p("distance_m", "float (0, 5] m", "Open-loop requested distance. Speed is distance_m / duration_s and must fit Navi's limit."),
      controlledStop,
      p("speed", "legacy float alias", "Alias for speed_mps. Do not provide both."),
      p("seconds", "legacy float alias", "Alias for duration_s. Do not provide both."),
      naviConnection
    ]
  },
  {
    name: "backward",
    category: "Movement",
    signature: "Agentech.backward()",
    summary: "Move backward using Navi's 0.5 m/s default and the shared Aegis parameter profiles, while enforcing Navi's 0.67 m/s reverse limit.",
    example: "Agentech.backward(speed_mps=0.5, duration_s=1.0)",
    verification: "Live verified 2026-07-16 through Navi's 0.67 m/s reverse limit with controller error=0 and warning=0",
    platformNote: "Public speeds are positive magnitudes; the adapter applies negative body-X internally.",
    profiles: [
      { name: "Default: 0.5 m/s for 1 second", syntax: "Agentech.backward()" },
      { name: "Direct speed", syntax: "Agentech.backward(speed_mps=0.5, duration_s=1.0)", noteLabel: "Navi limits", note: "speed_mps is a positive magnitude from 0.05 through 0.67 m/s, and duration_s must be greater than 0 and no more than 10 seconds." },
      { name: "Distance + time", syntax: "Agentech.backward(distance_m=0.5, duration_s=2.0)" },
      { name: "Percentage", syntax: "Agentech.backward(speed_percent=20, duration_s=1.0)" },
      { name: "Speed level", syntax: "Agentech.backward(speed_level=100, duration_s=1.0)" },
      { name: "Legacy aliases", syntax: "Agentech.backward(speed=0.5, seconds=1.0)" }
    ],
    params: [
      p("speed_mps", "float [0.05, 0.67] m/s", "Positive reverse-speed magnitude; Navi applies the negative direction."),
      p("duration_s", "float (0, 10] s", "Command duration.", "1.0"),
      p("speed_percent", "int [1, 100]", "Nearest-5% Aegis profile; resolved values above 0.67 m/s are rejected."),
      p("speed_level", "int [0, 511]", "Shared 512-level profile; resolved values above 0.67 m/s are rejected."),
      p("distance_m", "float (0, 3] m", "Open-loop distance; distance / duration must resolve within Navi's reverse limit."),
      controlledStop,
      p("speed", "legacy float alias", "Alias for speed_mps. Do not provide both."),
      p("seconds", "legacy float alias", "Alias for duration_s. Do not provide both."),
      naviConnection
    ]
  },
  {
    name: "lateral",
    category: "Movement",
    signature: "Agentech.lateral_left() / Agentech.lateral_right()",
    summary: "Step left or right using speed/time or distance/speed profiles.",
    example: "Agentech.lateral_left(speed_mps=0.5, duration_s=1.0)\nAgentech.lateral_right(distance_m=0.2, speed_mps=0.4)",
    verification: `${motionVerification}; both directions tested through 0.65 m/s`,
    profiles: [
      { name: "Default: 0.5 m/s for 2 seconds", syntax: "Agentech.lateral_left()\nAgentech.lateral_right()" },
      { name: "Distance + speed", syntax: "Agentech.lateral_right(distance_m=0.2, speed_mps=0.4)", note: "Duration is derived as distance / speed and must not exceed 10 seconds." },
      { name: "Speed + time", syntax: "Agentech.lateral_left(speed_mps=0.5, duration_s=1.0)" },
      { name: "Legacy aliases", syntax: "Agentech.lateral_left(speed=0.5, seconds=1.0)" }
    ],
    params: [
      p("distance_m", "float (0, 10] m", "Requires speed_mps and forbids duration_s. Execution is open loop."),
      p("speed_mps", "float [0.10, 0.67] m/s", "Positive magnitude. The function name chooses left or right."),
      p("duration_s", "float (0, 10] s", "Timed-profile duration.", "2.0"),
      controlledStop,
      p("speed", "legacy float alias", "Alias for speed_mps."),
      p("seconds", "legacy float alias", "Alias for duration_s."),
      naviConnection
    ]
  },
  {
    name: "turn",
    category: "Movement",
    signature: "Agentech.turn()",
    summary: "Turn with signed angle, rate, percentage, level, timed, or fixed-shortcut profiles.",
    example: "Agentech.turn(angle_deg=-45, turn_rate_rad_s=0.5)",
    verification: `${motionVerification}; tested through 2.5 rad/s in both directions`,
    platformNote: "Positive public values turn right; negative values turn left. Navi heading execution is open loop.",
    profiles: [
      { name: "Default angle", syntax: "Agentech.turn()  # right 45 degrees at 2 rad/s" },
      { name: "Angle + optional rate", syntax: "Agentech.turn(angle_deg=-45, turn_rate_rad_s=0.5)" },
      { name: "Angular-distance alias", syntax: "Agentech.turn(distance_rad=1.0)" },
      { name: "Signed rate + time", syntax: "Agentech.turn(turn_rate_rad_s=2.5, duration_s=0.15)" },
      { name: "Percentage + optional time", syntax: "Agentech.turn(rate_percentage=40, duration_s=0.25)" },
      { name: "Level + optional time", syntax: "Agentech.turn(turn_level=-200, duration_s=0.25)" },
      { name: "Fixed shortcuts", syntax: "Agentech.turn_right()\nAgentech.turn_left()\nAgentech.u_turn()" }
    ],
    params: [
      p("angle_deg", "finite nonzero float", "Signed target in degrees. Positive right, negative left. Omit all parameters for the +45-degree default."),
      p("angle_rad", "finite nonzero float", "Signed target in radians; exclusive with the other angle selectors."),
      p("distance_deg", "finite nonzero float", "Angular-distance alias for angle_deg."),
      p("distance_rad", "finite nonzero float", "Angular-distance alias for angle_rad."),
      p("turn_rate_rad_s", "0 or magnitude [0.02, 3.0]", "Signed in timed mode; positive magnitude when paired with an explicit target."),
      p("turn_rate_deg_s", "0 or magnitude [1.145916, 171.887339]", "Degree-rate form of turn_rate_rad_s."),
      p("rate_percentage", "int [-100, 100]", "Rounded to the nearest signed 5%. Zero is a no-op."),
      p("turn_level", "int [-511, 511]", "Signed 512-level rate scale. Zero is a no-op."),
      p("duration_s", "float (0, 10] s on Navi", "Required for timed turns. Navi rejects open-loop execution longer than 10 seconds."),
      controlledStop,
      naviConnection
    ]
  },
  {
    name: "crawl",
    category: "Movement",
    signature: "Agentech.crawl()",
    summary: "Run Navi's composed crawl behavior.",
    example: "Agentech.crawl()",
    verification: "Live verified 2026-07-15 after correcting the vendor behavior argument contract",
    platformNote: "Navi supports crawl. The footed Aegis implementation currently raises NotImplementedError.",
    params: []
  },
  {
    name: "jump",
    category: "Athletics",
    signature: "Agentech.jump()",
    summary: "Navi bends all four legs, springs straight upward, and lands on all four feet in nearly the same place.",
    example: "Agentech.jump()",
    verification: "Physically verified 2026-07-15 with a clean vertical takeoff and four-foot landing",
    platformNote: `${athleticsCarpetNote} The standard jump showed foot slip while absorbing the landing.`,
    params: []
  },
  {
    name: "jump_round",
    category: "Athletics",
    signature: "Agentech.jump_round()",
    summary: "Navi makes a small vertical hop and lands close to its starting position.",
    example: "Agentech.jump_round()",
    verification: "Physically verified 2026-07-15; visibly smaller than Agentech.jump(), with no obvious rotation in the tested default configuration",
    platformNote: athleticsCarpetNote,
    params: []
  },
  {
    name: "jump_forward",
    category: "Athletics",
    signature: "Agentech.jump_forward()",
    summary: "Navi crouches, leaps forward, and makes an initial four-foot landing ahead of its starting position.",
    example: "Agentech.jump_forward()",
    verification: "Physically verified 2026-07-15 with clear forward travel and an initial four-foot landing",
    platformNote: `${athleticsCarpetNote} The forward jump showed a clean initial landing followed by rebound and disrupted foot placement.`,
    params: []
  },
  {
    name: "frontflip",
    category: "Athletics",
    signature: "Agentech.frontflip()",
    summary: "Navi completes a forward rotation and returns to a stable four-foot landing.",
    example: "Agentech.frontflip()",
    verification: "Physically verified 2026-07-15 with a clean forward rotation and no landing slip",
    platformNote: athleticsCarpetNote,
    params: []
  },
  {
    name: "sideflip",
    category: "Athletics",
    signature: "Agentech.sideflip(direction=x)",
    summary: "Navi completes a lateral rotation toward the selected side and returns to a stable four-foot landing.",
    example: "Agentech.sideflip(direction=\"left\")",
    verification: "Physically verified 2026-07-15 in both directions with clean rotations and no landing slip",
    params: [
      p("direction", '"left" | "right"', "Choose which side Navi flips toward.", '"left"')
    ]
  },
  {
    name: "kick",
    category: "Athletics",
    signature: "Agentech.kick()",
    summary: "Navi performs its kicking gesture, then returns to standing. The active leg and exact motion will be confirmed after charging.",
    example: "Agentech.kick()",
    platformNote: athleticsCarpetNote,
    params: []
  },
  {
    name: "sway",
    category: "Actions",
    signature: "Agentech.sway()",
    summary: "Navi continuously rocks its body left and right for the requested time, then automatically returns to standing.",
    example: "Agentech.sway(duration_s=3.0)",
    profiles: [
      { name: "Default: 3 seconds", syntax: "Agentech.sway()" },
      { name: "Duration", syntax: "Agentech.sway(duration_s=x)" }
    ],
    params: [p("duration_s", "float > 0 (no maximum)", "Any positive number of seconds to rock before returning to standing.", "3.0")]
  },
  {
    name: "pee",
    category: "Actions",
    signature: "Agentech.pee()",
    summary: "Navi raises its right rear leg into a one-legged pose, holds it for the requested time, then automatically returns to standing.",
    example: "Agentech.pee(duration_s=3.0)",
    profiles: [
      { name: "Default: 3 seconds", syntax: "Agentech.pee()" },
      { name: "Duration", syntax: "Agentech.pee(duration_s=x)" }
    ],
    params: [p("duration_s", "float > 0 (no maximum)", "Any positive number of seconds to hold the raised-leg pose before returning to standing.", "3.0")]
  },
  {
    name: "shake_hand",
    category: "Actions",
    signature: "Agentech.shake_hand()",
    summary: "Navi raises its right front leg and presents it forward for the requested time, then automatically returns to standing.",
    example: "Agentech.shake_hand(duration_s=3.0)",
    profiles: [
      { name: "Default: 3 seconds", syntax: "Agentech.shake_hand()" },
      { name: "Duration", syntax: "Agentech.shake_hand(duration_s=x)" }
    ],
    params: [p("duration_s", "float > 0 (no maximum)", "Any positive number of seconds to hold the handshake pose before returning to standing.", "3.0")]
  },
  namedCoreAction("knock", "Navi raises its right front leg, makes three short knocking taps, then places the leg back on the floor and returns to standing."),
  {
    name: "hip_shake",
    category: "Actions",
    signature: "Agentech.hip_shake()",
    summary: "Navi shakes its rear hips left and right for the requested time, then automatically returns to standing. The motion may slip or fail on a low-traction floor.",
    example: "Agentech.hip_shake(duration_s=3.0)",
    profiles: [
      { name: "Default: 3 seconds", syntax: "Agentech.hip_shake()" },
      { name: "Duration", syntax: "Agentech.hip_shake(duration_s=x)" }
    ],
    params: [p("duration_s", "float > 0 (no maximum)", "Any positive number of seconds to shake the rear hips before returning to standing.", "3.0")]
  },
  namedExtendedAction("wave_hand", "Navi lifts its right front foot, waves it, then returns to standing."),
  namedExtendedAction("bow", "Navi keeps its rear feet in place, bends both front legs slightly, and lowers the front of its body toward the floor."),
  namedExtendedAction("wag_rear", "Navi swings only the rear end of its body from side to side; this robot has no physical tail."),
  namedExtendedAction("bark", "Navi keeps all four feet planted and moves its body forward in a bark-like thrust; this motion produces no sound."),
  namedExtendedAction("nod_head", "Navi keeps its feet in place, bends both front legs slightly to lower the front body, then raises it back up in a nod."),
  namedExtendedAction("shake_head", "Navi twists the front of its body left and right in a head-shaking gesture."),
  namedExtendedAction("confused", "Navi briefly dips the left side of its body, then levels itself again in a small one-sided shrug."),
  namedExtendedAction("show_affection", "Navi rocks its body from side to side by alternately dipping its left and right sides several times, creating a gentle repeated shrugging motion."),
  namedExtendedAction("draw_heart", "Navi lifts its left front leg, traces a heart-shaped path through the air, then returns the leg to its standing position."),
  {
    name: "dance",
    category: "Actions",
    signature: "Agentech.dance()",
    summary: "Navi performs the selected whole-body dance, then returns to standing. Each style's physical choreography will be documented after charging.",
    example: "Agentech.dance(style=\"shoulder\")",
    profiles: [
      { name: "Beat dance", syntax: "Agentech.dance(style=\"beats\")" },
      { name: "Shoulder dance", syntax: "Agentech.dance(style=\"shoulder\")" },
      { name: "Lion dance", syntax: "Agentech.dance(style=\"lion\")" }
    ],
    params: [
      p("style", '"beats" | "shoulder" | "lion"', "Choose Navi's dance choreography.", '"beats"')
    ]
  },
  {
    name: "stand",
    category: "Posture",
    signature: "Agentech.stand()",
    summary: "Navi rises into its normal four-leg standing stance, ready to walk.",
    example: "Agentech.stand()",
    params: []
  },
  {
    name: "squat",
    category: "Posture",
    signature: "Agentech.squat()",
    summary: "Navi enters its compact squat posture. The exact leg and body position will be confirmed after charging.",
    example: "Agentech.squat()",
    params: []
  },
  {
    name: "sit",
    category: "Posture",
    signature: "Agentech.sit()",
    summary: "Navi lowers its rear body to the floor while keeping its front body upright.",
    example: "Agentech.sit()",
    params: []
  },
  {
    name: "lie_down",
    category: "Posture",
    signature: "Agentech.lie_down()",
    summary: "Navi lowers its chest and body close to the floor and folds its legs into a resting posture.",
    example: "Agentech.lie_down()",
    params: []
  },
  {
    name: "lie_on_elbows",
    category: "Posture",
    signature: "Agentech.lie_on_elbows()",
    summary: "Navi enters its elbows-down resting posture. The exact physical position will be confirmed after charging.",
    example: "Agentech.lie_on_elbows()",
    params: []
  },
  {
    name: "stand_high",
    category: "Posture",
    signature: "Agentech.stand_high()",
    summary: "Navi enters its high standing posture. The exact physical height will be confirmed after charging.",
    example: "Agentech.stand_high()",
    params: []
  },
  {
    name: "recovery_stand",
    category: "Posture",
    signature: "Agentech.recovery_stand(direction=x)",
    summary: "Navi recovers from the selected fallen orientation and returns to a normal four-foot stance. Each direction requires an isolated test after charging.",
    example: "Agentech.recovery_stand(direction=\"back\")",
    params: [
      p("direction", '"back" | "front" | "left" | "right"', "Tell Navi which side of its body is against the floor before recovery.", '"back"')
    ]
  },
  {
    name: "set_gait",
    category: "Configuration",
    signature: "Agentech.set_gait(gait_id=x)",
    summary: "Choose one of Navi's installed walking patterns.",
    example: "Agentech.set_gait(gait_id=3)",
    params: [p("gait_id", "int [0, 15]", "Select one of the 16 gait presets installed on this Navi.", "3")]
  },
  {
    name: "set_foot_height",
    category: "Configuration",
    signature: "Agentech.set_foot_height(height_m=x)",
    summary: "Set Navi's foot lift height in meters.",
    example: "Agentech.set_foot_height(height_m=0.08)",
    params: [p("height_m", "float [0.001, 0.4] meters", "Set how high Navi lifts each foot while walking.", "0.03")]
  },
  {
    name: "set_collision_protect",
    category: "Configuration",
    signature: "Agentech.set_collision_protect(enabled=x)",
    summary: "Enable or disable Navi's collision-protection setting.",
    example: "Agentech.set_collision_protect(enabled=True)",
    params: [p("enabled", "bool", "True keeps collision protection enabled; false disables it.", "True")]
  },
  {
    name: "set_friction",
    category: "Configuration",
    signature: "Agentech.set_friction(friction=x)",
    summary: "Tell Navi how much grip to expect from the floor surface.",
    example: "Agentech.set_friction(friction=0.5)",
    params: [p("friction", "float [0.01, 1.0]", "Use a lower value for slippery floors and a higher value for grippy floors.", "0.4")]
  },
  {
    name: "set_jump_distance",
    category: "Configuration",
    signature: "Agentech.set_jump_distance(distance_m=x)",
    summary: "Set how far Navi travels during the next forward jump.",
    example: "Agentech.set_jump_distance(distance_m=0.3)",
    params: [p("distance_m", "float [0, 1.0] meters", "Forward travel requested by Agentech.jump_forward().", "0.5")]
  },
  {
    name: "set_jump_angle",
    category: "Configuration",
    signature: "Agentech.set_jump_angle(angle_rad=x)",
    summary: "Set how far Navi rotates during the next round jump.",
    example: "Agentech.set_jump_angle(angle_rad=0.2)",
    params: [p("angle_rad", "float [-3.14, 3.14] radians", "Positive and negative values choose opposite rotation directions for Agentech.jump_round().", "0.0")]
  },
  {
    name: "stop",
    category: "Safety",
    signature: "Agentech.stop()",
    summary: "Stop walking or turning while leaving Navi in its current posture.",
    example: "Agentech.stop()",
    verification: "Live verified after every locomotion case through 2.5 rad/s turning",
    params: [naviConnection]
  },
  {
    name: "emergency_stop",
    category: "Safety",
    signature: "Agentech.emergency_stop(reason=x)",
    summary: "Best-effort software zero-velocity stop; this is not Navi's physical hardware e-stop.",
    example: "Agentech.emergency_stop(reason=\"Operator requested stop\")",
    verification: "Zero-velocity implementation tested; hardware e-stop behavior is not claimed",
    params: [p("reason", "str", "Reason recorded in the returned result.", "Agentech emergency stop"), naviConnection]
  },
  {
    name: "damping",
    category: "Safety",
    signature: "Agentech.damping()",
    summary: "Navi lowers its body to the ground into a relaxed damping posture for charging or shutdown.",
    example: "Agentech.damping()",
    params: []
  },
  {
    name: "get_status",
    category: "Sensing",
    signature: "Agentech.get_status()",
    summary: "Read whether Navi is connected, ready, healthy, and standing.",
    example: "status = Agentech.get_status()",
    verification: "Read-only live verified 2026-07-15",
    params: []
  },
  {
    name: "get_battery_status",
    category: "Sensing",
    signature: "Agentech.get_battery_status()",
    summary: "Read battery percentage, voltage, current, temperature, presence, and supply status.",
    example: "battery = Agentech.get_battery_status()",
    verification: "Read-only live verified 2026-07-15",
    params: [naviConnection]
  },
  {
    name: "body_status",
    category: "Sensing",
    signature: "Agentech.body_status()",
    summary: "Read body position, orientation, linear and angular velocity, and acceleration.",
    example: "body = Agentech.body_status()",
    verification: "Read-only live verified 2026-07-15",
    platformNote: "The body x/y fields are not dependable global odometry for distance-target stopping.",
    params: []
  },
  {
    name: "joint_states",
    category: "Sensing",
    signature: "Agentech.joint_states()",
    summary: "Read all 12 joint names, positions, velocities, and efforts.",
    example: "joints = Agentech.joint_states()",
    verification: "Read-only live verified 2026-07-15",
    params: []
  },
  {
    name: "diagnose",
    category: "Sensing",
    signature: "Agentech.diagnose()",
    summary: "Run a read-only connection, status, battery, and health check.",
    example: "report = Agentech.diagnose()",
    verification: "Underlying status and battery reads verified",
    params: []
  }
];

export const naviStarterCode = `from agentech import Agentech
Agentech.use("navi", host="192.168.4.65")`;

export const naviSafetyLimits = [
  "Motion is dry-run unless dry_run=False is selected",
  "Motion and open-loop turns are limited to 10 seconds",
  "Timed poses and gestures accept any positive finite duration and return to standing",
  "Damping lowers Navi into its relaxed charging or shutdown posture",
  "Keep the physical controller stop available",
  "Charge Navi before athletic or dance testing",
  "Backflip is not available on Navi and is blocked"
];
