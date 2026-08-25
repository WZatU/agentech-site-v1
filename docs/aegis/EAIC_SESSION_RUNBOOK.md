# AEGIS EAIC session runbook

This is the source-to-evidence procedure for AEGIS `192.168.4.88`. Customer
Python is parsed on the Gateway and is never copied to the robot. Only a
reviewed, literal, validated JSON plan and trusted runtime files are staged.

No step in the offline section sends a robot command. Run the live section
only in a separately authorized, booked, physically supervised session.

## 1. Obtain exact source versions

```powershell
git clone https://github.com/agent-tech0316/agentech_sdk.git
git clone https://github.com/agent-tech0316/agentech-site-v1.git

cd agentech_sdk
git switch main
git pull --ff-only origin main
python -m pip install -e ".[aegis]"
$sdkCommit = git rev-parse HEAD

cd ..\agentech-site-v1
git switch main
git pull --ff-only origin main
npm ci
$gatewayCommit = git rev-parse HEAD
```

Record both commits, the SDK package version, FF SDK version/build, device
model, session ID, submission ID, correlation ID, and UTC/Pacific timestamps.
Never commit passwords, service keys or private SSH material.

## 2. Run the complete offline gate

SDK:

```powershell
cd ..\agentech_sdk
python -m unittest discover -s tests -v
```

Website, translator and Gateway:

```powershell
cd ..\agentech-site-v1
npm test
npm run lint
npm run typecheck
npm run build
```

Expected result: every command exits `0`. Offline success proves validation,
translation and error handling; it does not prove a physical action.

## 3. Compile the committed qualification source without robot access

```powershell
cd ..\agentech-site-v1
$source = 'docs/aegis/examples/aegis-28-command-qualification.py'
$plan = '.robot-stream-runtime/offline-aegis-28.plan.json'
New-Item -ItemType Directory -Force '.robot-stream-runtime' | Out-Null

python scripts/compile-robot-plan.py `
  $source `
  'OFFLINE-REVIEW-ID' `
  $plan

python -c "import json; p=json.load(open(r'$plan')); print({'version':p['version'],'model':p['robot_model'],'commands':len(p['commands']),'source_sha256':p['source_sha256'],'profile':p['device_profile']})"
Get-FileHash -Algorithm SHA256 $source
Get-FileHash -Algorithm SHA256 $plan
```

Expected output:

- plan version `2` and robot model `aegis`;
- exactly `28` commands;
- device `192.168.4.88`, `battery_present=false`, reason
  `hardware_absent`;
- the plan source hash equals the source file hash;
- command 20 uses `angle_deg=-10` and positive
  `turn_rate_deg_s=10`;
- no customer source text is present in the JSON plan.

Do not invoke `trusted-robot-runner.py` with this plan as an offline test: that
program is the physical executor. Its automated tests use a fake SDK instead.

## 4. What the translator rejects

Compilation must fail before staging for any of these:

- imports or statements other than the allowed `agentech` import and direct
  `Agentech`/`dog` calls;
- variables, loops, positional arguments, expressions or non-literal values;
- unknown command names or keywords;
- invalid/nonfinite numeric values and out-of-range profiles;
- diagonal profiles whose resolved forward or lateral component is below the
  SDK minimum;
- conflicting turn direction/rate forms;
- `get_battery_status()` for this battery-less device profile.

The robot-side runner validates the complete plan again. A plan edited after
translation is refused before any SDK dispatch.

## 5. Live preflight — stop unless every item is true

- The session is booked and an operator explicitly authorizes motion.
- AEGIS is supervised on a flat, nonslip, obstacle-free test area.
- Physical emergency control and the recovery procedure are ready.
- No other controller or process owns the command route.
- The approved submission is pinned to the session.
- SDK and Gateway commits equal the recorded versions.
- A Gateway clock check shows correct UTC and Pacific conversion.
- OBS, terminal capture and an external camera are recording changing frames.
- The operator is ready to stop on unexpected state, `STOP`, or `pause`.

`jump`, `backflip`, `stop` and `emergency_stop` require separate dedicated
procedures and video. They are not part of the 28-command qualification source.

## 6. Start the Gateway only during the authorized window

Configure the existing Gateway environment with the Supabase service role,
robot host/user, key-based SSH and repository paths. Then, from the deployed
Gateway checkout:

```powershell
npm run robot:stream-bridge
```

Starting the bridge can claim a due booking and execute its approved plan. Do
not use this command for an offline check or while an unreviewed/due session
exists. Do not place the SSH password in Git or the command line.

For a new AEGIS session the Gateway must:

1. load the pinned, dual-reviewed submission;
2. compile it into an inert plan and verify its source hash;
3. stage only the plan and trusted runtime modules;
4. claim the row atomically and start the trusted runner;
5. collect the runner's final result and verify all IDs/hashes/counts;
6. persist `execution_result`, `execution_error`, and
   `execution_updated_at`;
7. set the final Hub status from the persisted execution outcome;
8. publish captures separately without changing execution success.

## 7. Expected successful result

For the 28-command file, the trusted result must contain:

```json
{
  "schema_version": 1,
  "outcome": "completed",
  "command_count": 28,
  "completed_count": 28,
  "error": null
}
```

The full object must also contain the matching session/submission IDs, source
and plan SHA-256 values, timestamps, the AEGIS device profile, Diary path and
28 contiguous per-command records. See
[`aegis-28-command-expected-results.md`](examples/aegis-28-command-expected-results.md)
for each action's physical acceptance rule.

On the first command exception, expected behavior is `outcome=failed`, the
first error and command index are preserved, later commands are absent, stop is
attempted, and Supabase becomes `failed`. Missing or malformed final JSON is
also a failure.

## 8. Evidence to retain

For every physical command, retain the exact call/arguments, UTC and Pacific
time, AEGIS model, structured record, Diary/raw log, screenshot and video. For
the whole session retain:

- Hardware Safety and Software Security PASS screenshots plus review ID;
- scheduling and Gateway claim records;
- source and plan SHA-256 values;
- runner start, per-command Diary and final execution JSON;
- Supabase row showing the same session/submission/correlation identifiers;
- Hub final status and Gateway `finished` status;
- SDK and Gateway commit/version values;
- separate capture-upload/OBS results;
- explicit `VERIFIED` or `NOT_COVERED` rows for registration, heartbeat,
  lease, `last_seen` and reconnect.

Battery must be reported as `NOT_SUPPORTED / hardware_absent`, never as PASS.
Until the supervised run and videos exist, physical commands remain
`PENDING_LIVE`.

## 9. Session 38 diagnosis

The old `stand()` route returned at `18:15:09.851`, but authoritative robot
state did not finish transitioning until `18:15:14.818`. `squat()` began in
that gap, used command intent as if it were state, selected mode `51`, and
timed out waiting for `18/17`. The runner then stopped at the first exception.

The repair makes `stand()` wait for stable authoritative `app_state`, makes
`squat()` wait for stable `1/10` before its chord and stable `18/17` after it,
allows one bounded rebuild only for an owned stale controller route, validates
the translator's resolved motion profiles, normalizes the negative-left turn
compatibility form, and makes the runner result authoritative for Hub status.
