import assert from "node:assert/strict";
import test from "node:test";

import { handleMasterLiveTest } from "../lib/master-live-test-handler.ts";

const victoria = "victoria_c@agent-tech.ai";
const now = new Date("2026-08-11T18:00:00.000Z");

function storedSubmission(overrides = {}) {
  return {
    id: "master-live-test-audit-1",
    email: victoria,
    developer_name: "Victoria Master live test",
    robot_model: "Master",
    run_mode: "Master live stream test (view only)",
    source: "pasted_code",
    uploaded_file_name: null,
    github_repo_url: null,
    github_branch: null,
    commands: [],
    code: "this is arbitrary text, not robot code",
    physical_safety_status: "passed",
    ai_security_status: "locked",
    ai_security_model: null,
    ai_security_summary: null,
    ai_security_findings: [],
    ai_security_risk_level: null,
    ai_security_reviewed_at: null,
    credits_charged: 0,
    created_at: "2026-08-11T18:00:00.000Z",
    updated_at: "2026-08-11T18:00:00.000Z",
    ...overrides,
  };
}

function robotSession(overrides = {}) {
  return {
    id: 501,
    email: victoria,
    robot_model: "Master",
    scheduled_start: "2026-08-11T18:00:00.000Z",
    scheduled_end: "2026-08-11T18:30:00.000Z",
    session_status: "requested",
    requested_run_type: "preset_demo",
    approved_run_type: "preset_demo",
    preset_demo: "Master live stream test (view only)",
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  return {
    getAccount: async () => ({ email: victoria }),
    listSubmissions: async () => [],
    createSubmission: async (input) => storedSubmission({
      id: input.id,
      code: input.code,
      source: input.source,
      uploaded_file_name: input.uploadedFileName,
    }),
    ensureSession: async () => ({ session: robotSession(), reused: false }),
    updateSubmission: async (id, body) => storedSubmission({ id, ...body }),
    markAccountGate: async () => undefined,
    deleteSession: async () => robotSession(),
    createSubmissionId: () => "master-live-test-audit-1",
    ...overrides,
  };
}

test("an unsigned request is rejected before any account lookup", async () => {
  let accountLookups = 0;
  const result = await handleMasterLiveTest({ email: "", payload: {}, now }, dependencies({
    getAccount: async () => { accountLookups += 1; return null; },
  }));

  assert.equal(result.status, 401);
  assert.equal(accountLookups, 0);
});

test("a signed account other than Victoria is forbidden before persistence", async () => {
  let created = false;
  const result = await handleMasterLiveTest({ email: "other@agent-tech.ai", payload: { code: "anything" }, now }, dependencies({
    createSubmission: async () => { created = true; return storedSubmission(); },
  }));

  assert.equal(result.status, 403);
  assert.equal(created, false);
});

test("Victoria's arbitrary input is approved only as a zero-command view-only audit", async () => {
  const arbitraryText = "rm -rf /\nAgentech.forward(999)\njust words";
  let createInput = null;
  let updateBody = null;
  let gateInput = null;
  const result = await handleMasterLiveTest({
    email: "  VICTORIA_C@AGENT-TECH.AI ",
    payload: { code: arbitraryText, uploadedFileName: "notes.txt" },
    now,
  }, dependencies({
    createSubmission: async (input) => {
      createInput = input;
      return storedSubmission({ id: input.id, code: input.code });
    },
    updateSubmission: async (id, body) => {
      updateBody = { id, ...body };
      return storedSubmission({ id, ...body });
    },
    markAccountGate: async (input) => { gateInput = input; },
  }));

  assert.equal(result.status, 200);
  assert.equal(result.body.viewOnly, true);
  assert.equal(result.body.robotModel, "Master");
  assert.equal(result.body.expiresAt, "2026-08-11T18:30:00.000Z");
  assert.deepEqual(createInput.commands, []);
  assert.equal(createInput.code, arbitraryText);
  assert.equal(createInput.robotModel, "Master");
  assert.equal(createInput.runMode, "Master live stream test (view only)");
  assert.equal(updateBody.physical_safety_status, "passed");
  assert.equal(updateBody.ai_security_status, "passed");
  assert.match(updateBody.ai_security_summary, /view-only, not executable/i);
  assert.deepEqual(gateInput, {
    email: victoria,
    submissionId: "master-live-test-audit-1",
    physicalSafetyStatus: "passed",
    aiSecurityStatus: "passed",
  });
});

test("a locked Master audit is reused after a retry instead of being duplicated", async () => {
  const existing = storedSubmission({ id: "existing-locked-audit" });
  let creates = 0;
  const result = await handleMasterLiveTest({ email: victoria, payload: { code: existing.code }, now }, dependencies({
    listSubmissions: async () => [storedSubmission({ id: "wrong-model", robot_model: "Aegies" }), existing],
    createSubmission: async () => { creates += 1; return storedSubmission(); },
    ensureSession: async () => ({ session: robotSession({ id: 777 }), reused: true }),
  }));

  assert.equal(result.status, 200);
  assert.equal(result.body.submissionId, "existing-locked-audit");
  assert.equal(result.body.reusedSession, true);
  assert.equal(creates, 0);
});

test("a session conflict keeps the audit locked and reports 409 without approval", async () => {
  let approvals = 0;
  let deletions = 0;
  const conflict = new Error("Another active robot session overlaps this 30-minute Master test.");
  conflict.name = "MasterLiveTestConflictError";
  const result = await handleMasterLiveTest({ email: victoria, payload: { code: "test" }, now }, dependencies({
    ensureSession: async () => { throw conflict; },
    updateSubmission: async () => { approvals += 1; return storedSubmission(); },
    markAccountGate: async () => { approvals += 1; },
    deleteSession: async () => { deletions += 1; return null; },
  }));

  assert.equal(result.status, 409);
  assert.equal(result.body.error, conflict.message);
  assert.equal(approvals, 0);
  assert.equal(deletions, 0);
});

test("a newly created session is narrowly rolled back when final approval persistence fails", async () => {
  const updates = [];
  const deletions = [];
  const result = await handleMasterLiveTest({ email: victoria, payload: { code: "test" }, now }, dependencies({
    updateSubmission: async (id, body) => {
      updates.push({ id, body });
      return storedSubmission({ id, ...body });
    },
    markAccountGate: async () => { throw new Error("account gate write failed"); },
    deleteSession: async (id, email) => { deletions.push({ id, email }); return robotSession({ id }); },
  }));

  assert.equal(result.status, 500);
  assert.deepEqual(deletions, [{ id: 501, email: victoria }]);
  assert.equal(updates.at(-1).body.ai_security_status, "locked");
});

test("a reused session is never deleted when final approval persistence fails", async () => {
  let deletions = 0;
  const result = await handleMasterLiveTest({ email: victoria, payload: { code: "test" }, now }, dependencies({
    ensureSession: async () => ({ session: robotSession(), reused: true }),
    markAccountGate: async () => { throw new Error("account gate write failed"); },
    deleteSession: async () => { deletions += 1; return null; },
  }));

  assert.equal(result.status, 500);
  assert.equal(deletions, 0);
});
