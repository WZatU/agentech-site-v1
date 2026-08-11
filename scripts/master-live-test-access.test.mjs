import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMasterLiveTestSessionInput,
  hasMasterLiveTestAccess,
  masterLiveTestWindow,
  selectReusableMasterLiveTestSession,
} from "../lib/master-live-test-access.ts";
import {
  ensureMasterLiveTestSession,
  MasterLiveTestConflictError,
  MasterLiveTestProfileError,
} from "../lib/master-live-test-session.ts";

const victoria = "victoria_c@agent-tech.ai";
const now = new Date("2026-08-11T18:00:00.000Z");

function session(overrides = {}) {
  return {
    id: 91,
    email: victoria,
    access_profile_id: 7,
    profile_username: "victoria",
    profile_type: "developer",
    session_title: "Master live stream test (view only)",
    robot_model: "Master",
    scheduled_start: "2026-08-11T17:55:00.000Z",
    scheduled_end: "2026-08-11T18:25:00.000Z",
    session_status: "requested",
    requested_run_type: "preset_demo",
    approved_run_type: "preset_demo",
    preset_demo: "Master live stream test (view only)",
    benchmark_status: "passed",
    code_submission_id: null,
    price: 0,
    invoice_number: null,
    notes: "View-only authorization. Submitted text is never executed.",
    created_at: "2026-08-11T17:55:00.000Z",
    updated_at: "2026-08-11T17:55:00.000Z",
    ...overrides,
  };
}

function profile() {
  return {
    id: 7,
    account_email: victoria,
    profile_type: "developer",
    username: "victoria",
    display_name: "Victoria",
    first_name: "Victoria",
    last_name: "C",
    dob: null,
    grade: null,
    sex: null,
    school_info: null,
    preferred_location: null,
    credit_limit: 0,
    credits_used: 0,
    monthly_credit_limit: 0,
    monthly_credits_used: 0,
    monthly_usage_period: "2026-08",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  };
}

test("only Victoria's exact normalized account receives Master live-test access", () => {
  assert.equal(hasMasterLiveTestAccess("  VICTORIA_C@AGENT-TECH.AI "), true);
  assert.equal(hasMasterLiveTestAccess("victoria@agent-tech.ai"), false);
  assert.equal(hasMasterLiveTestAccess("victoria_c@agent-tech.ai.attacker.example"), false);
  assert.equal(hasMasterLiveTestAccess(null), false);
});

test("the Master view-only authorization lasts exactly 30 minutes", () => {
  assert.deepEqual(masterLiveTestWindow(now), {
    scheduledStart: "2026-08-11T18:00:00.000Z",
    scheduledEnd: "2026-08-11T18:30:00.000Z",
  });
});

test("only an unexpired active Master preset-demo session is reusable", () => {
  const valid = session();
  assert.equal(selectReusableMasterLiveTestSession([
    session({ id: 1, email: "someone@agent-tech.ai" }),
    session({ id: 2, robot_model: "Aegies" }),
    session({ id: 3, approved_run_type: "custom_code" }),
    session({ id: 4, scheduled_end: "2026-08-11T17:59:59.000Z" }),
    session({ id: 5, session_status: "cancelled" }),
    valid,
  ], victoria, now), valid);
  assert.equal(selectReusableMasterLiveTestSession([valid], "another@agent-tech.ai", now), null);
});

test("the session input is free, view-only, pre-approved, and never links executable code", () => {
  assert.deepEqual(buildMasterLiveTestSessionInput(victoria, profile(), now), {
    email: victoria,
    accessProfileId: 7,
    profileUsername: "victoria",
    profileType: "developer",
    sessionTitle: "Master live stream test (view only)",
    robotModel: "Master",
    scheduledStart: "2026-08-11T18:00:00.000Z",
    scheduledEnd: "2026-08-11T18:30:00.000Z",
    requestedRunType: "preset_demo",
    approvedRunType: "preset_demo",
    presetDemo: "Master live stream test (view only)",
    benchmarkStatus: "passed",
    codeSubmissionId: null,
    price: 0,
    notes: "View-only authorization. Submitted text is never executed on Master.",
  });
});

test("an existing Victoria Master authorization is reused without extending or creating it", async () => {
  const existing = session();
  let externalCalls = 0;
  const result = await ensureMasterLiveTestSession(victoria, now, {
    listSessions: async () => [existing],
    findConflict: async () => { externalCalls += 1; return null; },
    listProfiles: async () => { externalCalls += 1; return [profile()]; },
    createSession: async () => { externalCalls += 1; return session({ id: 92 }); },
  });

  assert.deepEqual(result, { session: existing, reused: true });
  assert.equal(externalCalls, 0);
  assert.equal(result.session.scheduled_end, "2026-08-11T18:25:00.000Z");
});

test("a conflicting robot booking prevents creation", async () => {
  let created = false;
  await assert.rejects(
    ensureMasterLiveTestSession(victoria, now, {
      listSessions: async () => [],
      findConflict: async () => session({ id: 88, email: "other@agent-tech.ai" }),
      listProfiles: async () => [profile()],
      createSession: async () => { created = true; return session({ id: 92 }); },
    }),
    MasterLiveTestConflictError,
  );
  assert.equal(created, false);
});

test("an access profile is required before a Master test session can be created", async () => {
  await assert.rejects(
    ensureMasterLiveTestSession(victoria, now, {
      listSessions: async () => [],
      findConflict: async () => null,
      listProfiles: async () => [],
      createSession: async () => session({ id: 92 }),
    }),
    MasterLiveTestProfileError,
  );
});

test("new sessions are created from the exact safe Master view-only input", async () => {
  let receivedInput = null;
  const created = session({
    id: 92,
    scheduled_start: "2026-08-11T18:00:00.000Z",
    scheduled_end: "2026-08-11T18:30:00.000Z",
  });
  const result = await ensureMasterLiveTestSession(victoria, now, {
    listSessions: async () => [],
    findConflict: async (start, end) => {
      assert.equal(start, "2026-08-11T18:00:00.000Z");
      assert.equal(end, "2026-08-11T18:30:00.000Z");
      return null;
    },
    listProfiles: async () => [profile()],
    createSession: async (input) => { receivedInput = input; return created; },
  });

  assert.equal(receivedInput.approvedRunType, "preset_demo");
  assert.equal(receivedInput.codeSubmissionId, null);
  assert.equal(receivedInput.robotModel, "Master");
  assert.deepEqual(result, { session: created, reused: false });
});
