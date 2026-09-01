# Master Gateway Heartbeat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local SDK Library show fresh, authenticated Master controller and battery telemetry published by AGENTECH01.

**Architecture:** AGENTECH01 polls the existing read-only Master SDK status plus a separately verified battery source every five seconds, then posts a strict versioned observation to the website. A Next.js API validates and atomically stores the newest observation; a client panel polls the sanitized GET representation and derives accessible online/stale/unavailable states without ever probing or commanding the robot directly.

**Tech Stack:** Python 3.10+, `unittest`, Agentech Master SDK, Next.js App Router, TypeScript, React, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-01-master-gateway-heartbeat-design.md`

## Global Constraints

- Master is fixed to `192.168.4.136:21274` unless explicitly overridden by environment variables.
- Publisher interval is 5 seconds and website freshness limit is 15 seconds.
- The feature is telemetry-only: no joint, mode, posture, or controller command is permitted.
- Battery values remain unavailable until a live source and schema are verified; never estimate them.
- `ROBOT_RUNNER_SECRET` is required for POST and must use timing-safe comparison.
- The local runtime file is `.master-heartbeat-runtime/latest.json` and must never be committed.
- The existing Master front/back artwork and joint interactions must remain unchanged.
- Site repository: `C:/Users/victo/OneDrive/Documents/ChatGPT/Main Site/agentech-site-v1`.
- AGENTECH01 SDK repository: `C:/Users/victo/OneDrive/Documents/ChatGPT/ssh wesle agentech01/agentech_sdk_latest`.

---

### Task 1: Heartbeat Domain Contract

**Files:**
- Replace: `lib/master-heartbeat.ts`
- Create: `lib/master-heartbeat.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseMasterHeartbeatObservation(value, now): MasterHeartbeatObservation`, `toMasterHeartbeatResponse(observation, receivedAt, now): MasterHeartbeatResponse`, and `unavailableMasterHeartbeatResponse(now): MasterHeartbeatResponse`.
- Produces types: `MasterHeartbeatObservation`, `MasterHeartbeatResponse`, `BatteryTelemetry`, and `HeartbeatCondition`.

- [ ] **Step 1: Write failing domain tests**

Cover a valid schema-v1 observation, unknown-field rejection, invalid host/gateway, percent outside 0–100, non-finite voltage, timestamps beyond ±30 seconds, fresh response at 14,999 ms, and stale response at 15,000 ms. Assert that the response condition is `online`, `controller-offline`, `stale`, or `unavailable` and that no secret-bearing field is present.

```ts
test("marks the receipt stale at fifteen seconds", () => {
  const received = new Date("2026-09-01T19:00:00.000Z");
  const result = toMasterHeartbeatResponse(validObservation, received, new Date("2026-09-01T19:00:15.000Z"));
  assert.equal(result.fresh, false);
  assert.equal(result.condition, "stale");
  assert.equal(result.ageMs, 15_000);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test lib/master-heartbeat.test.ts`
Expected: FAIL because the new parser and response types do not exist.

- [ ] **Step 3: Implement strict parsing and derived status**

Use explicit key allowlists at every object level, `Date.parse` plus the ±30,000 ms skew check, exact `gatewayId === "agentech01"`, exact Master host, boolean/null checks, and finite-number range checks. Derive freshness from `receivedAt`, not `observedAt`.

- [ ] **Step 4: Add and run the package script**

Add `"test:master-heartbeat": "node --experimental-strip-types --test lib/master-heartbeat.test.ts scripts/master-heartbeat-route.test.mjs scripts/master-heartbeat-ui.test.mjs"` and include it in the root `test` script. Initially run only the TypeScript test; expected: PASS.

- [ ] **Step 5: Commit the domain contract**

```bash
git add lib/master-heartbeat.ts lib/master-heartbeat.test.ts package.json
git commit -m "feat: define master heartbeat contract"
```

### Task 2: Authenticated Runtime API

**Files:**
- Replace: `app/api/master-heartbeat/route.ts`
- Create: `lib/master-heartbeat-store.ts`
- Create: `scripts/master-heartbeat-route.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Task 1 parser and response functions.
- Produces: `POST /api/master-heartbeat`, `GET /api/master-heartbeat`, `readLatestHeartbeat()`, and `writeLatestHeartbeat(record)`.

- [ ] **Step 1: Write failing API/storage tests**

Test source text and exported store functions for: no direct `node:net` import, 401 without a secret, acceptance of `x-robot-runner-secret` and Bearer auth, 400 for malformed/oversized JSON, atomic temp-file rename, GET unavailable with no file, and sanitized GET after a valid POST. Inject a temporary runtime directory through `MASTER_HEARTBEAT_RUNTIME_DIR`.

```js
test("route no longer probes Master directly", () => {
  const source = readFileSync(routePath, "utf8");
  assert.doesNotMatch(source, /from ["']node:net["']/);
  assert.match(source, /ROBOT_RUNNER_SECRET/);
});
```

- [ ] **Step 2: Run the route test and verify failure**

Run: `node --test scripts/master-heartbeat-route.test.mjs`
Expected: FAIL because the route still imports `node:net` and the store is missing.

- [ ] **Step 3: Implement atomic local storage**

Store `{ observation, receivedAt }` under `.master-heartbeat-runtime/latest.json`. Create the directory recursively, write JSON to a random sibling temp file with mode `0600`, then rename it over the destination. Treat missing or corrupt storage as no observation and log corruption without exposing its contents.

- [ ] **Step 4: Implement POST and GET**

Reuse the timing-safe comparison pattern from `app/api/agentech-capture/route.ts`, require `ROBOT_RUNNER_SECRET` even in development, reject bodies over 16 KiB, validate through `parseMasterHeartbeatObservation`, and add `Cache-Control: no-store`. POST returns `{ accepted: true, receivedAt }`; GET returns `MasterHeartbeatResponse`.

- [ ] **Step 5: Ignore runtime state and run tests**

Add `.master-heartbeat-runtime/` to `.gitignore`.
Run: `node --experimental-strip-types --test lib/master-heartbeat.test.ts && node --test scripts/master-heartbeat-route.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit the runtime API**

```bash
git add app/api/master-heartbeat/route.ts lib/master-heartbeat-store.ts scripts/master-heartbeat-route.test.mjs .gitignore
git commit -m "feat: accept authenticated master heartbeats"
```

### Task 3: AGENTECH01 Publisher

**Files:**
- Create: `scripts/master_heartbeat_publisher.py` in the AGENTECH01 SDK repository
- Create: `tests/test_master_heartbeat_publisher.py` in the AGENTECH01 SDK repository
- Modify: `scripts/README.md` in the AGENTECH01 SDK repository

**Interfaces:**
- Consumes: website schema v1 and `agentech.Master(host, port).status()`.
- Produces: `PublisherConfig.from_env()`, `build_observation(status, battery, observed_at)`, `read_battery(command)`, `publish_once(config, master_factory, urlopen)`, and `run_forever(config)`.

- [ ] **Step 1: Write failing publisher unit tests**

Inject the Master factory, clock, sleeper, and HTTP opener. Cover connected/offline status, environment validation, Bearer and `x-robot-runner-secret` headers, five-second interval, two-second timeouts, unavailable battery with no command, valid battery JSON, invalid percent becoming unavailable, and HTTP failure retry without a queue.

```python
def test_no_battery_command_reports_unavailable(self):
    self.assertEqual(
        read_battery(None),
        {"available": False, "percent": None, "voltage": None,
         "charging": None, "sourceTopic": None},
    )
```

- [ ] **Step 2: Run tests and verify failure**

Run from the SDK repository: `python -m unittest tests.test_master_heartbeat_publisher -v`
Expected: FAIL because `scripts.master_heartbeat_publisher` does not exist.

- [ ] **Step 3: Implement configuration and observation construction**

Use only the Python standard library plus the installed Agentech SDK. Require `MASTER_HEARTBEAT_URL` and `ROBOT_RUNNER_SECRET`; default host, port, interval, and timeout to `192.168.4.136`, `21274`, `5.0`, and `2.0`. Map SDK exceptions to `controllerResponsive: false` without issuing recovery commands.

- [ ] **Step 4: Implement verified battery command adapter**

If `MASTER_BATTERY_COMMAND` is absent, return unavailable. If present, run it read-only with `shell=False`, a two-second timeout, and parse one JSON object containing `percent`, `voltage`, `charging`, and `sourceTopic`. Reject invalid/missing source topic, non-finite values, or out-of-range percentages by returning unavailable and logging one concise warning.

- [ ] **Step 5: Implement authenticated publish loop**

POST compact JSON with both accepted auth headers and `Content-Type: application/json`. Do not persist or replay failed observations. Log one line per state transition and continue after SDK, battery, network, or HTTP errors.

- [ ] **Step 6: Document the exact service command and run tests**

Document:

```bash
MASTER_HEARTBEAT_URL=http://<site-host>:3000/api/master-heartbeat \
ROBOT_RUNNER_SECRET='<secret>' \
python -m scripts.master_heartbeat_publisher
```

Run: `python -m unittest tests.test_master_heartbeat_publisher -v`
Expected: PASS.

- [ ] **Step 7: Commit the publisher in the SDK repository**

```bash
git add scripts/master_heartbeat_publisher.py tests/test_master_heartbeat_publisher.py scripts/README.md
git commit -m "feat: publish master heartbeat telemetry"
```

### Task 4: SDK Library Heartbeat Panel

**Files:**
- Replace: `features/eaic/01-clients/eaic-hub/components/master-heartbeat.tsx`
- Modify: `features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx`
- Create: `scripts/master-heartbeat-ui.test.mjs`

**Interfaces:**
- Consumes: `MasterHeartbeatResponse` from Task 1 and GET endpoint from Task 2.
- Produces: accessible `MasterHeartbeat` panel embedded once in the existing Master Robot section.

- [ ] **Step 1: Write failing UI contract tests**

Assert the panel includes Gateway, Master controller, Battery, Mode, and Last update labels; polls at 5,000 ms; uses `role="status"` and `aria-live="polite"`; renders “Unavailable” for missing battery; preserves last known data on fetch failure; and that the workbench still contains both `frontRobotSketch` and `backRobotSketch` plus the same joint interaction component.

- [ ] **Step 2: Run the UI test and verify failure**

Run: `node --test scripts/master-heartbeat-ui.test.mjs`
Expected: FAIL because the prototype panel lacks battery, mode, freshness, and last-update fields.

- [ ] **Step 3: Implement the compact panel**

Fetch immediately and every five seconds. Keep `lastKnownStatus` when a request fails and set a separate `fetchFailed` flag. Render text labels for all states, battery percentage only when `battery.available`, charging when non-null, relative age with exact `receivedAt` in the `title`, and color only as secondary status communication.

- [ ] **Step 4: Run focused heartbeat tests**

Run: `npm run test:master-heartbeat`
Expected: all domain, route, and UI tests PASS.

- [ ] **Step 5: Commit the UI**

```bash
git add features/eaic/01-clients/eaic-hub/components/master-heartbeat.tsx features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx scripts/master-heartbeat-ui.test.mjs package.json
git commit -m "feat: show master gateway heartbeat"
```

### Task 5: Local End-to-End Verification

**Files:**
- Modify only if needed from verified failures in Tasks 1–4.

**Interfaces:**
- Consumes: complete publisher, POST/GET API, storage, and UI.
- Produces: verified local feature; no production push in this task.

- [ ] **Step 1: Run both automated suites**

Site: `npm run test:master-heartbeat && npm run typecheck && npm run lint`
SDK: `python -m unittest tests.test_master_heartbeat_publisher -v`
Expected: all commands exit 0.

- [ ] **Step 2: Discover and verify battery telemetry on AGENTECH01**

Run read-only topic inventory commands on AGENTECH01 (`ros2 topic list -t`; if ROS 2 is unavailable, `rostopic list` and `rostopic type <candidate>`). Inspect only candidates containing `battery`, `power`, `bms`, or `soc`. Record the verified topic, message fields, units, and one live sample. Configure `MASTER_BATTERY_COMMAND` only when a command can emit the required normalized JSON without changing robot state; otherwise leave it unset and verify “Unavailable.”

- [ ] **Step 3: Start local services with matching secrets**

Start Next.js on port 3000 with `ROBOT_RUNNER_SECRET` set. Start the publisher on AGENTECH01 with the local site's LAN URL, the same secret, and the verified battery command if available.

- [ ] **Step 4: Verify the API timing behavior**

Confirm GET changes from unavailable to fresh within five seconds, reports `gatewayId: agentech01`, the real Master status, and verified battery data or explicit unavailability. Stop the publisher normally and confirm `condition: stale` at 15 seconds without altering the stored observation.

- [ ] **Step 5: Verify the browser**

Open `http://127.0.0.1:3000/agentech-products/eaic-hub/view-sdk`. Confirm the heartbeat panel matches the API, exact timestamp appears on hover, front and back robot images remain visible, every joint hover/click still works, and the browser console has no errors.

- [ ] **Step 6: Review repository state**

Run `git status --short` and `git diff --check` in both repositories. Confirm no `.env`, secret, runtime JSON, battery sample, or unrelated user file is staged.

- [ ] **Step 7: Commit only verified fixes, if any**

