# 04 — Repository Edge and Robot Runtime

## Ownership and layout

This layer executes authorized, constrained work near the robot. `features/eaic/04-edge-runtime/` is an ownership pointer; real code is distributed across:

- `scripts/compile-robot-plan.py` and Gateway/runner scripts.
- `scripts/trusted-robot-runner.py` and `scripts/trusted-navi-runner.py`.
- `scripts/robot-stream-bridge.mjs` and guarded restart/watchdog tooling.
- `simulators/aegis/`, `simulators/navi/`, `simulators/master/`, and `simulators/service/`.
- Robot-camera service code under `scripts/master-camera-web-service/` and related scripts.
- Operator truth in `docs/aegis/EAIC_SESSION_RUNBOOK.md`, `docs/aegis-session-43-gateway-runbook.md`, `docs/robot-simulators.md`, and `docs/operations/*`.

## Non-negotiable execution boundary

```text
Reviewed customer source
-> restricted parser/translator
-> inert versioned plan + source hash + IDs
-> edge revalidation
-> trusted runner/vendor adapter
-> supervised robot execution
```

- Raw customer Python never enters the robot and is never executed by the Gateway.
- The edge verifies plan schema, supported model/calls, values, source hash, reservation, deployment authorization, and identifiers before dispatch.
- Behavior plans are constrained and inspectable. The runner stops at the first error and persists failure; compilation is never reported as physical completion.
- Emergency stop, robot reset, cell reset, controller ownership, and on-site operator refusal remain local and authoritative.
- Never restart Windows, OBS, the robot, or vendor control processes when a guarded process-only Gateway restart is sufficient.

## Simulator experience

`POST /api/agentech-simulate` uses one response contract for Aegis and Navi: sampled poses, rendered JPEG data URLs, final pose, steps, duration, command count, robot model, and resource path. When `AGENTECH_SIMULATOR_URL` is configured it calls the hosted service; otherwise it invokes the checked-in local adapters. The Navi adapter uses its restricted AST translator, not `exec`/`eval`.

Public motion-preview assets are generated under `public/assets/products/agentech-library/simulator-previews/<robot>/`; generator source is under `scripts/simulator-previews/<robot>/`.

## Aegis lessons already learned

- A run is qualified only by synchronized IDs/hashes/timestamps plus structured results, Diary/raw logs, screenshots, and external video.
- Velocity/time motion is open-loop; it does not guarantee exact travel. The marked physical boundary and operator are the final containment check.
- Ordinary standing actions wait for stable authoritative state; do not insert repeated `stand()` calls blindly.
- Normal stop and emergency stop are different. Emergency stop sends the terminal command once, enters/latches DAMPING, and must not receive a duplicate cleanup stop.
- Session 43 compiled correctly but failed at squat because the vendor private mode cache lagged the public state. The repair synchronizes the cache with a native no-motion action before the squat and requires stable retained target state. The original failed session remains failure evidence until a new supervised physical rerun passes.
- Gateway restarts are allowed only after proving there is no due/staged/running/active session; the guarded script restarts the bridge process only.

## Navi lessons already learned

- `return_to_home()` has one fixed saved coordinate and only four accepted headings. A customer-authored call needs server entitlement; automatic scheduled-end cleanup does not consume that entitlement.
- At scheduled end, the trusted Gateway runs Return to Home if absent from the plan, retries a failed return safely, and sends damping only after a successful return or when the plan already performed it.
- Full SDK capability/status matrices distinguish implemented, hardware-only, model-blocked, spec-blocked, and unsafe operations. Never substitute generic success for an unresolved method.

## Tests and physical-evidence boundary

```bash
pnpm test:aegis-gateway-spec
pnpm test:aegis-device-results
pnpm test:aegis-runner
pnpm test:navi-cli-gateway
pnpm test:robot-stream-bridge
pnpm test:sdk-reference
pnpm test:master-simulation-previews
python -m unittest scripts.test_trusted_navi_runner -v
```

Run simulator-specific suites when changing their packages. These gates are offline: they do not move a robot. Physical PASS requires booked time, explicit operator authorization, preflight, correct model/network ownership, marked space, emergency readiness, and retained evidence.

## Common failure modes

- Sending source instead of the inert plan.
- Trusting cloud/UI state without edge revalidation.
- Using an extra cleanup stop after terminal e-stop.
- Restarting a vendor controller to mask an adapter state bug.
- Claiming exact movement distance from open-loop velocity/time.
- Treating generated video or MuJoCo output as physical evidence.
- Publishing private SDK, device-address, credential, or network detail in client code or handoff documents.
