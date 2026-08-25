# AEGIS 28-command qualification: expected results

This file defines acceptance criteria. It is not a record of a new physical
run. As of 2026-08-24, the corrected source compiles offline to 28 trusted
commands; all new physical results and videos remain `PENDING_LIVE`.

## Current result

| Layer | Current conclusion | Evidence |
| --- | --- | --- |
| Website translator | `OFFLINE_VERIFIED` | The committed source compiles to plan version 2 with exactly 28 commands. |
| Runner validation and result serialization | `OFFLINE_VERIFIED` | Automated tests cover success, first-command failure, plan tampering, hashes, IDs, counts, and atomic output. |
| AEGIS physical execution | `PENDING_LIVE` | No command was sent during this repair. |
| Battery on `192.168.4.88` | `NOT_SUPPORTED / hardware_absent` | The device profile rejects `get_battery_status()` before robot I/O; battery is not in this 28-command source. |

Historical Session 38 is not a successful 28-command result. Command 1
(`stand`) returned from the old wrapper before its authoritative posture state
settled. Command 2 (`squat`) then failed to latch point-foot state `18/17`, and
commands 3-28 were not run. The old Gateway nevertheless allowed the Hub row
to become `Completed`; that database label is not physical success evidence.

## Per-command acceptance

Every successful row must have one `command_completed` Diary entry and one
`commands[]` entry in the final execution result with the same index, name,
source line and arguments. `status` must be `completed`, `error` must be null,
and the visible motion or after-state must match the call.

| # | Command | Expected successful observation |
| ---: | --- | --- |
| 1 | `stand()` | The SDK waits for three stable supported standing `app_state` samples before returning. |
| 2 | `squat()` | Preparation is stably `1/10` before the chord; completion is stably `18/17`. |
| 3 | `stand()` | Stable supported standing state is observed before command 4 begins. |
| 4 | `forward(0.20, 1.0)` | Forward motion, then zero velocity/stopped result. |
| 5 | `backward(0.20, 1.0)` | Backward motion, then zero velocity/stopped result. |
| 6 | `lateral_left(0.15, 1.0)` | Left translation, then zero velocity/stopped result. |
| 7 | `lateral_right(0.15, 1.0)` | Right translation, then zero velocity/stopped result. |
| 8 | `diagonal(45, 0.20, 1.0)` | Forward/right diagonal motion; both resolved components satisfy SDK limits. |
| 9 | `diagonal(-135, 0.20, 1.0)` | Backward/left diagonal motion; both resolved components satisfy SDK limits. |
| 10 | `squat_forward(0.10, 0.50)` | Forward motion while point-foot state remains `18/17`, then stop. |
| 11 | `squat_backward(0.10, 0.50)` | Backward motion while point-foot state remains `18/17`, then stop. |
| 12 | `squat_lateral(left, 0.10, 0.50)` | Left point-foot translation, then stop. |
| 13 | `squat_lateral(right, 0.10, 0.50)` | Right point-foot translation, then stop. |
| 14 | `squat_diagonal(45, 0.15, 0.50)` | Forward/right point-foot diagonal, then stop. |
| 15 | `squat_diagonal(-135, 0.15, 0.50)` | Backward/left point-foot diagonal, then stop. |
| 16 | `squat_turn(10)` | Approximately +10 degrees while remaining in point-foot state, then stop. |
| 17 | `squat_turn(-10)` | Approximately -10 degrees while remaining in point-foot state, then stop. |
| 18 | `stand()` | Stable supported standing state is observed before normal turning. |
| 19 | `turn(10, 10)` | Approximately +10 degrees with positive rate magnitude, then stop. |
| 20 | `turn(-10, 10)` | Approximately -10 degrees with positive rate magnitude, then stop. |
| 21 | `yaw(0.20, +0.10)` | Positive yaw target is reached and held within SDK tolerance. |
| 22 | `yaw(0.20, -0.10)` | Negative yaw target is reached and held within SDK tolerance. |
| 23 | `pitch(0.20, +0.10)` | Positive pitch target is reached and held within SDK tolerance. |
| 24 | `pitch(0.20, -0.10)` | Negative pitch target is reached and held within SDK tolerance. |
| 25 | `roll(0.20, +0.10)` | Positive roll target is reached and held within SDK tolerance. |
| 26 | `roll(0.20, -0.10)` | Negative roll target is reached and held within SDK tolerance. |
| 27 | `stay(0.50)` | The requested pose is maintained for the bounded interval and reset safely. |
| 28 | `sit()` | The robot visibly reaches the supported sitting/lie-down end posture. |

## Final execution-result acceptance

The Gateway may set the Hub session to `completed` only when all of these are
true:

- `schema_version` is `1` and `outcome` is `completed`;
- session ID, submission ID, source SHA-256 and plan SHA-256 match the staged
  records;
- `command_count=28`, `completed_count=28`, and there are 28 contiguous command
  records;
- all command records are `completed`, have null errors, and execution did not
  continue after a failure;
- the validated result was persisted in Supabase before the final status;
- Hub and Gateway evidence use the same session/submission/correlation tuple.

If any command raises, the runner stops dispatching, attempts a safe stop,
writes `outcome=failed` with the first error and command index, and the Gateway
persists `failed`. OBS and capture upload status cannot turn a failed execution
into `completed`.
