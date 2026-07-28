# Known Limitations

## Official SDK contract

**Affected:** all 117 canonical methods.

- Current behavior: physical/simulated/rejected behavior is explicit, while
  return, blocking, async, cancellation, timeout, and some end states remain
  `MULTIPLE_UNRESOLVED`.
- Why unresolved: the inspected public material did not define complete formal
  contracts.
- Needed: vendor signatures, return schemas, exception tables, scheduling and
  cancellation semantics.
- Update: `config/sdk_spec.json`, `translator/argument_binding.py`,
  `translator/scheduler.py`, schemas, and contract tests.

## Vendor motion telemetry

**Affected:** the 79 compatibility-level `APPROXIMATE` methods, especially the
52 correction-audit methods.

- Current behavior: 26 audit-problem methods have corrected measurable behavior;
  26 retain conservative profiles with explicit limitations.
- Why unresolved: videos provide routine-level semantics but not exact joint,
  IMU, contact, torque, or controller telemetry.
- Needed: timestamped vendor trajectories and action IDs.
- Update: `config/action_profiles/full_sdk_profiles.json`, action tests, and
  Ground Truth acceptance.

## Missing model degrees of freedom

**Affected:** `nod_head`, `shake_head`, `head_up_down`, `nod_with_beats`,
`nod_off`, `look_down`, `sniff_left`, `sniff_right`, `sniff_ahead`, `sniff_up`,
`rub_eyes`, and related head/face routines.

- Current behavior: structured `BLOCKED_BY_MODEL`.
- Why unresolved: the supplied model has a floating base and 12 leg joints but
  no articulated head/neck/face.
- Needed: authoritative URDF/MJCF and actuator metadata.
- Update: model assets, controller mapping, backend dispatch, and physics tests.

## Sensor, camera, and vision gaps

**Affected:** `observe`, `listen`, `dramatic_listen`, `search_environment`,
`search_tag`, `body_tag_search`, and visual/tag-driven routines.

- Current behavior: model state queries are simulated; missing perception is
  explicitly blocked.
- Why unresolved: no camera/audio/tag hardware model or calibrated transforms.
- Needed: sensor intrinsics/extrinsics, frames, rates, noise, and SDK schemas.
- Update: model sensors, `simulation/state_monitor.py`,
  `simulation/query_provider.py`, and scenario tests.

## Autonomous planning and localization

**Affected:** `return_to_home`, `explore_road`, `explore_new_home`, and search
methods.

- Current behavior: structured model-capability rejection.
- Why unresolved: no map, localization, obstacle avoidance, planner, or charging
  dock model.
- Needed: vendor navigation interfaces, maps, frames, planner contracts, and
  scenario assets.
- Update: new explicit planning backend interfaces; do not fake them with a
  pre-scripted gait.

## Environment model

**Affected:** `swim`.

- Current behavior: `UNAVAILABLE_IN_MUJOCO`.
- Why unresolved: the release scene has rigid ground and no water/fluid model.
- Needed: validated water environment, hydrodynamic parameters, and swim control.
- Update: a separate environment/model extension with independent validation.

## High-dynamic actions

**Affected:** `frontflip`, `sideflip`, `jump_round`, and some advanced recovery
or configuration paths.

- Current behavior: flips are `FAILED` for safe implementation;
  `jump_round` remains spec-blocked with insufficient evidence.
- Why unresolved: no current-model safe reproducibility and incomplete vendor
  start/end/contact requirements.
- Needed: high-rate trajectories, safety envelope, actuator capabilities, and
  model validation.
- Update: isolated athletic profiles and safety tests without relaxing limits.

## Real hardware state

**Affected:** `get_battery_status` and any implied voltage/current/temperature
state.

- Current behavior: `HARDWARE_ONLY`, `available=false`, `value=null`.
- Why unresolved: MuJoCo has no physical battery or device transport.
- Needed: real hardware API and telemetry.
- Update: a hardware backend/provider, never the MuJoCo state provider.

## Model fidelity

The supplied hip inertia is physically invalid, so the existing model uses the
already-documented positive approximation. Primitive contact geometry,
open-loop gait tuning, and contact parameters are simulator approximations.
This release does not modify those model or physics values.
