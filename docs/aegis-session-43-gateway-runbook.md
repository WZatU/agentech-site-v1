# AEGIS Session 43 Gateway runbook

This document is the focused EAIC Hub translation and Gateway execution guide
for the Session 43 squat rerun. It does not schedule or authorize a robot run.

Use the committed source at
[`docs/aegis/examples/aegis-session-43-squat-qualification.py`](aegis/examples/aegis-session-43-squat-qualification.py).
The translator must produce exactly nine inert JSON commands with unchanged
literal parameters. Customer Python is never executed or sent to the robot.

Run the offline gate from the repository root:

```powershell
python -m unittest scripts.test_aegis_device_results scripts.test_aegis_gateway_spec scripts.test_trusted_robot_runner
node --test scripts/robot-stream-bridge.test.mjs scripts/robot-session-device-results.test.mjs scripts/robot-session-execution-result.test.mjs
```

Expected results are all tests passing; command 2 is `squat()`, and the only
`emergency_stop()` is the final command. The Gateway must not send an additional
cleanup stop after that terminal e-stop.

The original Session 43 compiled correctly but failed inside the SDK Adapter:
`stand()` completed, then squat action `106` selected `51/0` because
`dog_task`'s private mode cache lagged behind public `18/1`. The repaired SDK
first sends native no-motion cache synchronization action `138`, then sends
action `106` once and requires stable and retained `18/17`.

A successful supervised rerun requires unchanged physical-controller owner PID,
`dog_task_restarted=false`, all nine commands completed in order, one final
e-stop, matching Hub/Gateway/session/submission/correlation IDs, Diary and raw
result logs, screenshots, and synchronized external video. Session 43 remains
failure evidence until that new physical rerun is captured.

Gateway restart is process-only. Verify there is no due, staged, running, or
active session before using the guarded restart script. It restarts the bridge,
not Windows, OBS, Camo, the robot, or `dog_task`. The current stream bridge uses
a bounded one-second default poll to reduce preview lag without changing OBS
encoding or creating another camera owner.
