# Vendor Information Request

Please answer each item with a versioned document or machine-readable export.
Method names refer to `docs/sdk_capabilities.csv`.

## SDK contract for all 117 methods

For every method provide:

- exact return type and schema;
- blocking and async semantics;
- defaults, units, range and rounding rules;
- exception/error types and codes;
- cancellation and interruption behavior;
- timeout and retry behavior;
- thread-safety and concurrency guarantees;
- allowed start states and guaranteed end state.

Priority contract-blocked methods:

`duck_walk`, `jump_round`, `recovery_stand`, `set_collision_protect`,
`set_foot_height`, `set_friction`, `set_gait`, `set_jump_angle`,
`set_jump_distance`.

## Motion/action data

For every approximate physical action provide:

- official action name and numeric ID;
- duration and control/update frequency;
- start, intermediate, and end states;
- timestamped joint position/velocity/torque trajectories;
- base pose and IMU trajectory;
- foot contact and force timeline;
- interruptibility, recovery and cancellation strategy;
- parameter/style variant mapping.

Highest-value correction groups include:

- greeting/gesture: `wave_hand`, `shake_hand`, `chat`, `clap_hand`;
- posture/stretch: `bow`, `front_stretch`, `full_body_stretch`, `lie_down`;
- expressive: `bark`, `cute`, `show_affection`, `think`, `yawn`;
- periodic: `dance`, `sway`, `wag_rear`;
- athletics: `jump`, `jump_forward`, `jump_round`, `frontflip`, `sideflip`.

## Authoritative robot model

Provide:

- complete versioned URDF and/or MJCF;
- all link masses, centers of mass, and inertia tensors;
- joint axes, limits, damping, friction, and velocity limits;
- actuator type, gearing, torque/force limits, and control frequency;
- collision geometry and contact/friction parameters;
- verified standing configuration and calibration;
- any head/neck/camera/speaker/microphone degrees of freedom.

This is required to unblock head routines and to replace documented inertia and
contact approximations.

## Perception and planning

Provide:

- camera/audio/sensor intrinsics, extrinsics, coordinate frames and rates;
- tag/body detection request and result schemas;
- localization, odometry and map frames;
- map representation and planner interface;
- obstacle avoidance and path cancellation behavior;
- return-home and charging-dock semantics;
- exploration completion/failure criteria.

Associated blocked methods:

`observe`, `listen`, `dramatic_listen`, `search_environment`, `search_tag`,
`body_tag_search`, `return_to_home`, `explore_road`, `explore_new_home`.

## Water/high-dynamic capability

For `swim`, flips, round jump and recovery actions provide:

- supported hardware variants;
- environment assumptions;
- trajectory and actuator envelopes;
- contact/fluid model expectations;
- safety abort thresholds and recovery behavior.

Without this data the release will continue to return structured unavailable,
blocked, or failed outcomes.

## Response format

Please reference each canonical method, SDK version, firmware version, robot
model revision, unit system, sampling rate and effective date. Ambiguous or
legacy-only names should include their canonical replacement or an explicit
"no equivalent" answer.
