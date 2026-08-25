import assert from "node:assert/strict";
import test from "node:test";
import { parseExecutionResult } from "./robot-session-execution-result.mjs";


const valid = {
  schema_version: 1,
  outcome: "completed",
  session_id: "42",
  submission_id: "submission-test",
  source_sha256: "a".repeat(64),
  plan_sha256: "b".repeat(64),
  command_count: 1,
  completed_count: 1,
  started_at: "2026-08-25T01:00:00.000Z",
  finished_at: "2026-08-25T01:00:01.000Z",
  commands: [{ command_index: 1, name: "stand", status: "completed", args: {}, source_args: {}, line: 2, result: {}, error: null, duration_ms: 1000 }],
  error: null,
};


test("accepts an identity-bound completed execution result", () => {
  const parsed = parseExecutionResult(JSON.stringify(valid), {
    sessionId: "42",
    submissionId: "submission-test",
    sourceSha256: "a".repeat(64),
  });

  assert.equal(parsed.outcome, "completed");
  assert.equal(parsed.completed_count, 1);
});


test("rejects identity mismatch, impossible counts, and corrupt hashes", () => {
  const expected = { sessionId: "42", submissionId: "submission-test", sourceSha256: "a".repeat(64) };
  assert.throws(() => parseExecutionResult(JSON.stringify({ ...valid, session_id: "43" }), expected), /session/);
  assert.throws(() => parseExecutionResult(JSON.stringify({ ...valid, completed_count: 2 }), expected), /count/);
  assert.throws(() => parseExecutionResult(JSON.stringify({ ...valid, plan_sha256: "bad" }), expected), /hash/);
});


test("requires a structured error for failed execution", () => {
  const failed = { ...valid, outcome: "failed", completed_count: 0, error: null, commands: [{ ...valid.commands[0], status: "failed" }] };
  assert.throws(
    () => parseExecutionResult(JSON.stringify(failed), { sessionId: "42", submissionId: "submission-test", sourceSha256: "a".repeat(64) }),
    /error/,
  );
});


test("rejects missing, invalid, or oversized JSON", () => {
  const expected = { sessionId: "42", submissionId: "submission-test", sourceSha256: "a".repeat(64) };
  assert.throws(() => parseExecutionResult("", expected), /JSON/);
  assert.throws(() => parseExecutionResult("{}", expected), /schema|outcome/);
  assert.throws(() => parseExecutionResult(JSON.stringify(valid), expected, { maxBytes: 10 }), /size|bytes/);
});
