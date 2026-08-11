# Victoria Master Live Test Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let only `victoria_c@agent-tech.ai` select Master in Code Checking, approve any submitted text for a view-only test, and immediately create or reuse a 30-minute Master session that unlocks the production Live Stream page without executing the text on the robot.

**Architecture:** Add an exact-account access policy and an idempotent Master preview-session service, then expose them through a dedicated authenticated API. The Code Checking client conditionally adds Master and calls only this isolated endpoint; the resulting session is a `preset_demo` with no code-submission link, so the existing `custom_code` execution bridge cannot claim it. Existing Aegies/Navi validators, scheduling, and execution paths remain unchanged.

**Tech Stack:** Next.js App Router, React/TypeScript, Supabase REST helpers, Node.js built-in test runner, LiveKit, Vercel.

## Global Constraints

- Only the exact normalized signed-in email `victoria_c@agent-tech.ai` receives the Master Code Checking option or API access.
- Submitted Master preview text is stored only as an audit artifact and must never enter the physical robot execution path.
- The preview session lasts exactly 30 minutes, costs zero credits, uses `requested_run_type=preset_demo` and `approved_run_type=preset_demo`, and has `code_submission_id=null`.
- A repeated request during an active Victoria preview reuses the existing session without extending it.
- A conflicting active robot session returns `409`; no existing session is overwritten, canceled, or overlapped.
- Existing Aegies and Navi review, scheduling, execution, and live-stream behavior must remain unchanged.
- The feature unlocks authorization and UI only; camera media still depends on the AGENTECH01 Master relay and publisher.
- Do not change Master resolution, frame rate, synchronization, or publisher performance in this work.

---

## File Structure

- `lib/master-live-test-access.ts`: exact-account policy, 30-minute window, active preview selection, and session-input construction.
- `lib/master-live-test-session.ts`: dependency-injected session reuse/conflict/create workflow with production defaults.
- `app/api/master-live-test/route.ts`: authenticated view-only approval and session orchestration.
- `lib/account-records.ts`: narrowly scoped deletion helper used only to roll back a newly-created preview session if audit persistence fails.
- `app/api/agentech-code-submit/route.ts`: expose only the server-derived `masterLiveTestAccess` capability in the existing review-gate response.
- `features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx`: conditional Master selector and view-only test UI.
- `scripts/master-live-test-access.test.mjs`: policy and session-service behavior tests.
- `scripts/master-live-test-route.test.mjs`: route security and non-execution contract tests.
- `scripts/master-live-test-ui.test.mjs`: conditional UI and Aegies/Navi isolation contract tests.
- `package.json`: focused and aggregate test commands.

---

### Task 1: Exact-account policy and idempotent preview-session service

**Files:**
- Create: `lib/master-live-test-access.ts`
- Create: `lib/master-live-test-session.ts`
- Create: `scripts/master-live-test-access.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `hasMasterLiveTestAccess(email: unknown): boolean`
- Produces: `masterLiveTestWindow(now?: Date): { scheduledStart: string; scheduledEnd: string }`
- Produces: `selectReusableMasterLiveTestSession(rows, email, now?): RobotSessionRecord | null`
- Produces: `buildMasterLiveTestSessionInput(email, profile, now?): Parameters<typeof createRobotSession>[0]`
- Produces: `ensureMasterLiveTestSession(email, now?, dependencies?): Promise<{ session: RobotSessionRecord; reused: boolean }>`
- Produces: `MasterLiveTestConflictError` and `MasterLiveTestProfileError`

- [ ] **Step 1: Write the failing access-policy and session-service tests**

Create `scripts/master-live-test-access.test.mjs` with real pure-function assertions and dependency-injected service assertions:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  MASTER_LIVE_TEST_DURATION_MINUTES,
  MASTER_LIVE_TEST_LABEL,
  buildMasterLiveTestSessionInput,
  hasMasterLiveTestAccess,
  masterLiveTestWindow,
  selectReusableMasterLiveTestSession,
} from "../lib/master-live-test-access.ts";
import {
  MasterLiveTestConflictError,
  ensureMasterLiveTestSession,
} from "../lib/master-live-test-session.ts";

test("only the exact normalized Victoria account has Master live-test access", () => {
  assert.equal(hasMasterLiveTestAccess("victoria_c@agent-tech.ai"), true);
  assert.equal(hasMasterLiveTestAccess("  VICTORIA_C@AGENT-TECH.AI  "), true);
  assert.equal(hasMasterLiveTestAccess("someone_else@agent-tech.ai"), false);
  assert.equal(hasMasterLiveTestAccess(null), false);
});

test("Master live-test window is exactly 30 minutes", () => {
  assert.equal(MASTER_LIVE_TEST_DURATION_MINUTES, 30);
  assert.deepEqual(masterLiveTestWindow(new Date("2026-08-11T20:00:00.000Z")), {
    scheduledStart: "2026-08-11T20:00:00.000Z",
    scheduledEnd: "2026-08-11T20:30:00.000Z",
  });
});

test("reusable selection requires Victoria, Master, preset_demo, label, active status, and current time", () => {
  const now = new Date("2026-08-11T20:05:00.000Z");
  const valid = {
    id: 7,
    email: "victoria_c@agent-tech.ai",
    robot_model: "Master",
    session_status: "requested",
    requested_run_type: "preset_demo",
    approved_run_type: "preset_demo",
    preset_demo: MASTER_LIVE_TEST_LABEL,
    scheduled_start: "2026-08-11T20:00:00.000Z",
    scheduled_end: "2026-08-11T20:30:00.000Z",
  };
  assert.equal(selectReusableMasterLiveTestSession([valid], valid.email, now)?.id, 7);
  assert.equal(selectReusableMasterLiveTestSession([{ ...valid, robot_model: "Aegies" }], valid.email, now), null);
  assert.equal(selectReusableMasterLiveTestSession([{ ...valid, approved_run_type: "custom_code" }], valid.email, now), null);
  assert.equal(selectReusableMasterLiveTestSession([{ ...valid, scheduled_end: "2026-08-11T20:04:59.000Z" }], valid.email, now), null);
});

test("session input is view-only and cannot enter custom-code execution", () => {
  const input = buildMasterLiveTestSessionInput(
    "victoria_c@agent-tech.ai",
    { id: 3, username: "victoria", profile_type: "developer" },
    new Date("2026-08-11T20:00:00.000Z"),
  );
  assert.equal(input.robotModel, "Master");
  assert.equal(input.requestedRunType, "preset_demo");
  assert.equal(input.approvedRunType, "preset_demo");
  assert.equal(input.codeSubmissionId, null);
  assert.equal(input.price, 0);
  assert.equal(input.presetDemo, MASTER_LIVE_TEST_LABEL);
});

test("session service reuses an active Victoria preview", async () => {
  const session = { id: 7, email: "victoria_c@agent-tech.ai", robot_model: "Master", session_status: "requested", requested_run_type: "preset_demo", approved_run_type: "preset_demo", preset_demo: MASTER_LIVE_TEST_LABEL, scheduled_start: "2026-08-11T20:00:00.000Z", scheduled_end: "2026-08-11T20:30:00.000Z" };
  let creates = 0;
  const result = await ensureMasterLiveTestSession(session.email, new Date("2026-08-11T20:05:00.000Z"), {
    listSessions: async () => [session],
    findConflict: async () => null,
    listProfiles: async () => [],
    createSession: async () => { creates += 1; return null; },
  });
  assert.equal(result.reused, true);
  assert.equal(result.session.id, 7);
  assert.equal(creates, 0);
});

test("session service rejects conflicts and creates the exact view-only session otherwise", async () => {
  const dependencies = {
    listSessions: async () => [],
    findConflict: async () => ({ id: 99 }),
    listProfiles: async () => [{ id: 3, username: "victoria", profile_type: "developer" }],
    createSession: async () => { throw new Error("must not create"); },
  };
  await assert.rejects(
    ensureMasterLiveTestSession("victoria_c@agent-tech.ai", new Date("2026-08-11T20:00:00.000Z"), dependencies),
    MasterLiveTestConflictError,
  );

  let createdInput;
  const created = await ensureMasterLiveTestSession("victoria_c@agent-tech.ai", new Date("2026-08-11T20:00:00.000Z"), {
    ...dependencies,
    findConflict: async () => null,
    createSession: async (input) => { createdInput = input; return { id: 8, ...input }; },
  });
  assert.equal(created.reused, false);
  assert.equal(created.session.id, 8);
  assert.equal(createdInput.approvedRunType, "preset_demo");
  assert.equal(createdInput.codeSubmissionId, null);
});
```

- [ ] **Step 2: Add the focused test command and verify RED**

Add to `package.json`:

```json
"test:master-live-test": "node --test scripts/master-live-test-access.test.mjs"
```

Run: `node --test scripts/master-live-test-access.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/master-live-test-access.ts`.

- [ ] **Step 3: Implement the exact-account policy and pure session contract**

Create `lib/master-live-test-access.ts` with these constants and functions:

```ts
import type { AccessProfile, RobotSessionRecord } from "@/lib/account-records";

export const MASTER_LIVE_TEST_EMAIL = "victoria_c@agent-tech.ai";
export const MASTER_LIVE_TEST_DURATION_MINUTES = 30;
export const MASTER_LIVE_TEST_LABEL = "Master live stream test (view only)";
export const MASTER_LIVE_TEST_NOTE = "Victoria view-only Master preview; submitted text is not executable.";

const activeStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending", "running"]);

export function hasMasterLiveTestAccess(email: unknown) {
  return typeof email === "string" && email.trim().toLowerCase() === MASTER_LIVE_TEST_EMAIL;
}

export function masterLiveTestWindow(now = new Date()) {
  return {
    scheduledStart: now.toISOString(),
    scheduledEnd: new Date(now.getTime() + MASTER_LIVE_TEST_DURATION_MINUTES * 60_000).toISOString(),
  };
}

export function selectReusableMasterLiveTestSession(rows: RobotSessionRecord[], email: string, now = new Date()) {
  if (!hasMasterLiveTestAccess(email)) return null;
  const nowMs = now.getTime();
  return rows.find((row) =>
    row.email.trim().toLowerCase() === MASTER_LIVE_TEST_EMAIL
    && row.robot_model?.trim().toLowerCase() === "master"
    && row.requested_run_type === "preset_demo"
    && row.approved_run_type === "preset_demo"
    && row.preset_demo === MASTER_LIVE_TEST_LABEL
    && activeStatuses.has(row.session_status.replace(/ /g, "_").toLowerCase())
    && Date.parse(row.scheduled_start ?? "") <= nowMs
    && Date.parse(row.scheduled_end ?? "") >= nowMs
  ) ?? null;
}

export function buildMasterLiveTestSessionInput(email: string, profile: AccessProfile, now = new Date()) {
  const { scheduledStart, scheduledEnd } = masterLiveTestWindow(now);
  return {
    email,
    accessProfileId: profile.id,
    profileUsername: profile.username,
    profileType: profile.profile_type,
    sessionTitle: MASTER_LIVE_TEST_LABEL,
    robotModel: "Master",
    scheduledStart,
    scheduledEnd,
    requestedRunType: "preset_demo" as const,
    approvedRunType: "preset_demo" as const,
    presetDemo: MASTER_LIVE_TEST_LABEL,
    benchmarkStatus: "passed" as const,
    codeSubmissionId: null,
    price: 0,
    notes: MASTER_LIVE_TEST_NOTE,
  };
}
```

- [ ] **Step 4: Implement the dependency-injected session workflow**

Create `lib/master-live-test-session.ts`. Production defaults call `getRobotSessions`, `findRobotSessionConflict`, `getAccessProfiles`, and `createRobotSession`; tests replace all four dependencies.

```ts
import {
  createRobotSession,
  findRobotSessionConflict,
  getAccessProfiles,
  getRobotSessions,
  type AccessProfile,
  type RobotSessionRecord,
} from "@/lib/account-records";
import {
  buildMasterLiveTestSessionInput,
  masterLiveTestWindow,
  selectReusableMasterLiveTestSession,
} from "@/lib/master-live-test-access";

export class MasterLiveTestConflictError extends Error {}
export class MasterLiveTestProfileError extends Error {}

type Dependencies = {
  listSessions(email: string): Promise<RobotSessionRecord[]>;
  findConflict(start: string, end: string): Promise<RobotSessionRecord | null>;
  listProfiles(email: string): Promise<AccessProfile[]>;
  createSession(input: Parameters<typeof createRobotSession>[0]): ReturnType<typeof createRobotSession>;
};

const productionDependencies: Dependencies = {
  listSessions: getRobotSessions,
  findConflict: findRobotSessionConflict,
  listProfiles: getAccessProfiles,
  createSession: createRobotSession,
};

export async function ensureMasterLiveTestSession(email: string, now = new Date(), dependencies = productionDependencies) {
  const reusable = selectReusableMasterLiveTestSession(await dependencies.listSessions(email), email, now);
  if (reusable) return { session: reusable, reused: true };

  const window = masterLiveTestWindow(now);
  if (await dependencies.findConflict(window.scheduledStart, window.scheduledEnd)) {
    throw new MasterLiveTestConflictError("Another active robot session overlaps this 30-minute Master test.");
  }
  const profile = (await dependencies.listProfiles(email))[0];
  if (!profile) throw new MasterLiveTestProfileError("Create an account profile before starting the Master live test.");
  const session = await dependencies.createSession(buildMasterLiveTestSessionInput(email, profile, now));
  if (!session) throw new Error("Unable to create the Master live-test session.");
  return { session, reused: false };
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test scripts/master-live-test-access.test.mjs`

Expected: all policy, reuse, conflict, and exact-session tests PASS.

```bash
git add lib/master-live-test-access.ts lib/master-live-test-session.ts scripts/master-live-test-access.test.mjs package.json
git commit -m "feat: add Master live test access policy"
```

---

### Task 2: Authenticated view-only approval endpoint with rollback

**Files:**
- Create: `app/api/master-live-test/route.ts`
- Create: `scripts/master-live-test-route.test.mjs`
- Modify: `lib/account-records.ts`
- Modify: `app/api/agentech-code-submit/route.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `hasMasterLiveTestAccess`, `ensureMasterLiveTestSession`
- Produces: `POST /api/master-live-test`
- Produces: review-gate response field `masterLiveTestAccess: boolean`
- Produces: `deleteRobotSessionRecord(id: number, email: string): Promise<RobotSessionRecord | null>`

- [ ] **Step 1: Write failing route contract tests**

Create `scripts/master-live-test-route.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/api/master-live-test/route.ts", "utf8");
const reviewRoute = readFileSync("app/api/agentech-code-submit/route.ts", "utf8");
const records = readFileSync("lib/account-records.ts", "utf8");

test("Master preview endpoint derives identity server-side and enforces exact access", () => {
  assert.match(route, /getServerAccountEmail\(request\)/);
  assert.match(route, /hasMasterLiveTestAccess\(email\)/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /status:\s*403/);
  assert.doesNotMatch(route, /payload\.email/);
});

test("Master preview accepts arbitrary text only as a view-only audit record", () => {
  assert.match(route, /robotModel:\s*"Master"/);
  assert.match(route, /commands:\s*\[\]/);
  assert.match(route, /physical_safety_status:\s*"passed"/);
  assert.match(route, /ai_security_status:\s*"passed"/);
  assert.match(route, /view-only, not executable/i);
  assert.doesNotMatch(route, /validateAgentechCode|evaluateAgentechMovementSafety|runAgentechAiCodeReview/);
});

test("Master preview creates authorization before reporting success and rolls back new partial state", () => {
  assert.match(route, /getCodeSubmissionRecords/);
  assert.match(route, /ensureMasterLiveTestSession/);
  assert.match(route, /deleteRobotSessionRecord/);
  assert.match(route, /reused/);
  assert.match(route, /expiresAt/);
});

test("existing review gate exposes only a server-derived capability", () => {
  assert.match(reviewRoute, /masterLiveTestAccess:\s*hasMasterLiveTestAccess\(email\)/);
  assert.match(records, /export async function deleteRobotSessionRecord/);
});
```

- [ ] **Step 2: Run the route tests to verify RED**

Run: `node --test scripts/master-live-test-route.test.mjs`

Expected: FAIL because `app/api/master-live-test/route.ts` and the capability field do not exist.

- [ ] **Step 3: Add the narrowly-scoped robot-session rollback helper**

Add to `lib/account-records.ts` next to `createRobotSession`:

```ts
export async function deleteRobotSessionRecord(id: number, email: string) {
  const rows = await supabaseRequest<RobotSessionRecord[]>("agentech_robot_sessions", {
    method: "DELETE",
    query: `id=eq.${id}&email=eq.${encodeURIComponent(email)}&approved_run_type=eq.preset_demo`,
  });
  return rows[0] ?? null;
}
```

The query is deliberately restricted to the exact session ID, owner email, and `preset_demo`; it cannot delete normal `custom_code` bookings.

- [ ] **Step 4: Implement the authenticated preview endpoint**

Create `app/api/master-live-test/route.ts` with this flow:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  createCodeSubmissionRecord,
  deleteRobotSessionRecord,
  getAccountRecord,
  getCodeSubmissionRecords,
  markDeveloperReviewGateOnAccount,
  updateCodeSubmissionRecord,
} from "@/lib/account-records";
import { hasMasterLiveTestAccess, MASTER_LIVE_TEST_LABEL } from "@/lib/master-live-test-access";
import {
  ensureMasterLiveTestSession,
  MasterLiveTestConflictError,
  MasterLiveTestProfileError,
} from "@/lib/master-live-test-session";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const email = await getServerAccountEmail(request);
  if (!isValidEmail(email)) return NextResponse.json({ error: "Sign in before starting the Master live test." }, { status: 401 });
  if (!hasMasterLiveTestAccess(email)) return NextResponse.json({ error: "Master live-test access is not enabled for this account." }, { status: 403 });
  if (!(await getAccountRecord(email))) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const payload = await request.json().catch(() => ({}));
  const code = typeof payload.code === "string" ? payload.code : "";
  const uploadedFileName = typeof payload.uploadedFileName === "string" ? payload.uploadedFileName.trim() : "";
  const now = new Date();

  const reusableAudit = (await getCodeSubmissionRecords(email, 20)).find((record) =>
    record.robot_model === "Master"
    && record.run_mode === MASTER_LIVE_TEST_LABEL
    && record.ai_security_status === "locked"
  );
  const submissionId = reusableAudit?.id ?? `master-live-test-${crypto.randomUUID()}`;
  if (!reusableAudit) {
    await createCodeSubmissionRecord({
      id: submissionId,
      email,
      developerName: "Victoria Master live test",
      robotModel: "Master",
      runMode: MASTER_LIVE_TEST_LABEL,
      source: uploadedFileName ? "uploaded_file" : "pasted_code",
      uploadedFileName: uploadedFileName || null,
      githubRepoUrl: null,
      githubBranch: null,
      commands: [],
      code,
    });
  }

  let ensured;
  try {
    ensured = await ensureMasterLiveTestSession(email, now);
  } catch (error) {
    if (error instanceof MasterLiveTestConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof MasterLiveTestProfileError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }

  try {
    await updateCodeSubmissionRecord(submissionId, {
      physical_safety_status: "passed",
      ai_security_status: "passed",
      ai_security_model: "view-only-test-bypass",
      ai_security_summary: "View-only, not executable. This approval unlocks only the Master livestream test.",
      ai_security_findings: [],
      ai_security_risk_level: "none",
      ai_security_reviewed_at: now.toISOString(),
      credits_charged: 0,
    });
    await markDeveloperReviewGateOnAccount({ email, submissionId, physicalSafetyStatus: "passed", aiSecurityStatus: "passed" });
  } catch (error) {
    if (!ensured.reused) await deleteRobotSessionRecord(ensured.session.id, email).catch(() => null);
    throw error;
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    physicalSafetyStatus: "passed",
    aiSecurityStatus: "passed",
    viewOnly: true,
    robotModel: "Master",
    sessionId: ensured.session.id,
    reusedSession: ensured.reused,
    startsAt: ensured.session.scheduled_start,
    expiresAt: ensured.session.scheduled_end,
  });
}
```

Wrap the endpoint body in the repository's normal `try/catch` response pattern so unhandled persistence failures return `500` without returning `ok: true`. If session creation fails, leave the audit record in `ai_security_status=locked`; the next request reuses that record. If final approval persistence fails after a new session was created, delete only that newly-created `preset_demo` session and leave the locked audit for a safe retry.

- [ ] **Step 5: Expose the capability in the existing review-gate GET response**

Import `hasMasterLiveTestAccess` in `app/api/agentech-code-submit/route.ts` and include:

```ts
masterLiveTestAccess: hasMasterLiveTestAccess(email)
```

in both local-preview and production GET responses. Do not add Master to `robotModelOptions`, `normalizeAgentechRobotModel`, or the normal POST review path.

- [ ] **Step 6: Extend the focused command, verify GREEN, and commit**

Update `package.json`:

```json
"test:master-live-test": "node --test scripts/master-live-test-access.test.mjs scripts/master-live-test-route.test.mjs"
```

Run: `node --test scripts/master-live-test-route.test.mjs scripts/master-live-test-access.test.mjs`

Expected: all access, session, route-security, audit, and rollback tests PASS.

```bash
git add app/api/master-live-test/route.ts app/api/agentech-code-submit/route.ts lib/account-records.ts scripts/master-live-test-route.test.mjs package.json
git commit -m "feat: add view-only Master live test endpoint"
```

---

### Task 3: Conditional Master Code Checking experience

**Files:**
- Modify: `features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx`
- Create: `scripts/master-live-test-ui.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: review-gate `masterLiveTestAccess`
- Consumes: `POST /api/master-live-test`
- Produces: Victoria-only Master selector, approval display, expiration display, and link to `/agentech-products/eaic-hub/watch-live-run`

- [ ] **Step 1: Write failing UI contract tests**

Create `scripts/master-live-test-ui.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ui = readFileSync("features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx", "utf8");
const models = readFileSync("features/eaic/02-unified-api/resources-runs/agentech-robot-model.ts", "utf8");

test("Master appears only when the server grants Victoria live-test access", () => {
  assert.match(ui, /masterLiveTestAccess/);
  assert.match(ui, /masterLiveTestAccess\s*\?[^:]*Master/s);
  assert.match(ui, /setMasterLiveTestAccess\(payload\.masterLiveTestAccess === true\)/);
});

test("Master uses only the isolated view-only endpoint and opens the existing live page", () => {
  assert.match(ui, /fetch\("\/api\/master-live-test"/);
  assert.match(ui, /view-only/i);
  assert.match(ui, /30-minute/i);
  assert.match(ui, /\/agentech-products\/eaic-hub\/watch-live-run/);
  assert.match(ui, /expiresAt/);
});

test("normal Aegies and Navi model definitions remain unchanged", () => {
  assert.match(models, /\["Aegies", "Navi"\] as const/);
  assert.doesNotMatch(models, /"Master"/);
  assert.match(ui, /if \(masterLiveTestSelected\)/);
});
```

- [ ] **Step 2: Run the UI test to verify RED**

Run: `node --test scripts/master-live-test-ui.test.mjs`

Expected: FAIL because the client has no `masterLiveTestAccess` or Master preview call.

- [ ] **Step 3: Add isolated Master selection state without widening the shared robot-model type**

In `AgentechLibraryWorkbench`, add:

```ts
const [masterLiveTestAccess, setMasterLiveTestAccess] = useState(false);
const [masterLiveTestSelected, setMasterLiveTestSelected] = useState(false);
const [masterLiveTestExpiresAt, setMasterLiveTestExpiresAt] = useState("");
const displayedRobotModel = masterLiveTestSelected ? "Master" : robotModel;
const codeCheckingRobotOptions = masterLiveTestAccess
  ? [...robotModelOptions, "Master"] as const
  : robotModelOptions;
```

Extend the review-gate payload type with `masterLiveTestAccess?: boolean` and set it only from the server response:

```ts
setMasterLiveTestAccess(payload.masterLiveTestAccess === true);
```

Render `codeCheckingRobotOptions` in both Code Checking selectors. When `Master` is chosen, set only `masterLiveTestSelected=true`; do not call normal `changeRobotModel` and do not add Master to the shared Aegies/Navi union.

- [ ] **Step 4: Add the single-action Master preview request**

Add `runMasterLiveTest()` before the normal hardware/software functions:

```ts
async function runMasterLiveTest() {
  setReviewInputError("");
  setIsRunningPhysicalCheck(true);
  setRequestStatus("Creating a 30-minute view-only Master live test...");
  try {
    const response = await fetch("/api/master-live-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, uploadedFileName }),
    });
    const payload = await response.json().catch(() => ({ error: "The Master live-test response could not be read." }));
    if (!response.ok) throw new Error(payload.error ?? "Unable to start the Master live test.");
    setPhysicalSubmissionId(payload.submissionId);
    setPhysicalSafetyPassed(true);
    setSoftwareReviewStatus("passed");
    setCanScheduleRobotSlot(true);
    setMasterLiveTestExpiresAt(payload.expiresAt ?? "");
    setHardwareResult(masterViewOnlyHardwareResult(payload.submissionId));
    setRequestStatus(`Master view-only test unlocked until ${new Date(payload.expiresAt).toLocaleTimeString()}. No submitted text will execute on the robot.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start the Master live test.";
    setReviewInputError(message);
    setRequestStatus(message);
  } finally {
    setIsRunningPhysicalCheck(false);
  }
}
```

Define `masterViewOnlyHardwareResult(id)` with `status: "PASS"`, `robotModel: "Master"`, zero commands, no simulation clips, and checklist text that says the result is view-only and not executable.

At the first line of `runPhysicalSafetyCheck`, add:

```ts
if (masterLiveTestSelected) {
  await runMasterLiveTest();
  return;
}
```

Do not pass Master into `commandPlan`, `evaluateAgentechMovementSafety`, `validateAgentechCode`, or the normal Software Check endpoint.

- [ ] **Step 5: Render honest Master-specific copy and the live-page link**

For Master selection:

- change both action labels to `Start 30-Minute Master Live Test`;
- hide the second normal Software Security action because the dedicated endpoint returns both display gates in one view-only operation;
- show `View-only test. Submitted text will not execute on Master.` near the selector;
- after success, show the returned expiration and a button labeled `Open Master Live Stream` linking to `/agentech-products/eaic-hub/watch-live-run`;
- do not label the downloaded text `Approved code file`; label it `View-only test artifact` if displayed; and
- keep Aegies/Navi copy and buttons byte-for-byte unless a conditional expression is required.

When restoring a latest submission whose `robotModel` is `Master`, restore it only if `payload.masterLiveTestAccess === true`; set the Master view-only states directly and do not call `normalizeAgentechRobotModel`, `ensureRequiredStand`, `commandPlan`, or movement-safety functions on that record.

- [ ] **Step 6: Extend the focused command, verify GREEN, and commit**

Update `package.json`:

```json
"test:master-live-test": "node --test scripts/master-live-test-access.test.mjs scripts/master-live-test-route.test.mjs scripts/master-live-test-ui.test.mjs"
```

Run: `node --test scripts/master-live-test-ui.test.mjs scripts/master-live-test-route.test.mjs scripts/master-live-test-access.test.mjs`

Expected: all Master capability, isolated endpoint, honest copy, and unchanged shared-model tests PASS.

```bash
git add features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx scripts/master-live-test-ui.test.mjs package.json
git commit -m "feat: unlock Victoria Master live preview"
```

---

### Task 4: Full verification, production deployment, and signed-in browser acceptance

**Files:**
- Modify: `package.json` only if the aggregate test command does not yet include `test:master-live-test`
- Modify: `docs/operations/master-livekit-production.md` if present; otherwise create it with the Victoria test procedure and the separate AGENTECH01 dependency

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified production deployment and reproducible operator test steps

- [ ] **Step 1: Add the focused suite to the aggregate test command**

Ensure `package.json` includes:

```json
"test": "npm run test:robot-stream-bridge && npm run test:return-to-home-access && npm run test:sdk-reference && npm run test:master-simulation-previews && npm run test:master-motor-map && npm run test:master-live-camera && npm run test:master-live-test"
```

- [ ] **Step 2: Run all offline verification gates**

Run:

```bash
npm run test:master-live-test
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: every command exits `0`; no test, type, build, or whitespace error remains.

- [ ] **Step 3: Document the production acceptance boundary**

Document these exact operator facts:

```text
1. Sign in as victoria_c@agent-tech.ai.
2. Open Code Checking and select Master.
3. Paste any test text and start the 30-minute view-only test.
4. Confirm the response says the text will not execute.
5. Open Live Stream and confirm the active robot model is Master and Master-only camera controls appear.
6. A blank/waiting camera after authorization means AGENTECH01 port 4175 relay/publisher must be repaired separately.
7. Confirm another company account does not receive the Master Code Checking option.
```

- [ ] **Step 4: Deploy the verified commit to the linked Vercel production project**

Run the repository's linked production deployment command:

```bash
vercel deploy --prod
```

Expected: Vercel reports a successful production deployment for project `agentech-site-v1`.

- [ ] **Step 5: Perform signed-in production browser acceptance**

Using the user's existing signed-in browser session:

1. open the production Code Checking page;
2. confirm Master appears only for Victoria;
3. submit arbitrary non-command text;
4. confirm both display gates pass and an expiration is shown;
5. open the production Live Stream page;
6. confirm the active session resolves to Master and Master-only controls render;
7. inspect console errors and the `/api/livekit-token` response status; and
8. report media as available or waiting separately from authorization success.

- [ ] **Step 6: Commit verification documentation**

```bash
git add package.json docs/operations/master-livekit-production.md
git commit -m "docs: verify Victoria Master live test"
```

Do not include a path that was not modified in the commit.
