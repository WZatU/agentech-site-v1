# AEGIS 29-call expected results

All calls must produce contiguous Diary records and structured completed
results. Any first failure stops the run and makes later calls absent.

| Calls | Expected physical/result behavior |
| --- | --- |
| 1 `stand` | stable upright state; recovery latch cleared only after success |
| 2 `squat` | stable point-foot low gait `18/17`; no damping |
| 3 `stand` | stable upright state and physical controller restored |
| 4–5 forward/backward | clearly visible paired travel inside boundary; controlled zero stop |
| 6–7 lateral | clearly visible left/right pair; no posture cycling |
| 8–9 diagonal | visible approximately reversible diagonal pair |
| 10–17 squat motions | visible paired low-gait motion, stays `18/17`, controlled zero after each |
| 18 `stand` | stable upright and controller route restored |
| 19–20 turn | gyro-measured `+90/-90` pair, approximately original heading |
| 21–26 yaw/pitch/roll | planted visible `+/-0.25 rad`; no damping; final axis result within tolerance |
| 27 `stay` | holds combined attitude target for at least 1 second |
| 28 battery | integer percentage from `battery_state.power`, not raw counter/temperature |
| 29 `sit` | controlled approved low rest pose; not reported as squat |

Nominal velocity times duration is not an exact-distance acceptance rule.
External video and the marked box determine containment. Jump, backflip, stop
and emergency stop use separate supervised evidence and are not included here.
