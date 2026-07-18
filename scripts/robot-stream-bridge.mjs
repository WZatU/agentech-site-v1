import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OBSWebSocket from "obs-websocket-js";

for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ROBOT_HOST", "ROBOT_SSH_USER"]) {
  if (!process.env[key]) throw new Error(`${key} is required.`);
}

const here = dirname(fileURLToPath(import.meta.url));
const runtimeDir = join(here, "..", ".robot-stream-runtime");
const stateFile = join(runtimeDir, "state.json");
const compiler = join(here, "compile-robot-plan.py");
const trustedRunner = join(here, "trusted-robot-runner.py");
const captureUploadUrl = process.env.AGENTECH_CAPTURE_UPLOAD_URL || "https://www.agent-tech.ai/api/agentech-capture";
const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const robot = `${process.env.ROBOT_SSH_USER}@${process.env.ROBOT_HOST}`;
const remoteDir = process.env.ROBOT_REMOTE_DIR || "/home/firefly/agentech-stream";
const robotPython = process.env.ROBOT_PYTHON || "python3";
const localPython = process.env.ROBOT_LOCAL_PYTHON || "python";
const sshKey = process.env.ROBOT_SSH_KEY;
const pollMs = Number(process.env.ROBOT_STREAM_POLL_MS || 5000);
const prepMs = Number(process.env.ROBOT_STREAM_PREP_SECONDS || 120) * 1000;
const obsUrl = process.env.OBS_WEBSOCKET_URL || "ws://127.0.0.1:4455";
const obsPassword = process.env.OBS_WEBSOCKET_PASSWORD || undefined;
const activeStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending", "running"]);
const claimableStatuses = ["requested", "confirmed", "approved", "scheduled", "pending"];

mkdirSync(runtimeDir, { recursive: true });
let state = { sessions: {} };
try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch {}
let obs;

function saveState() { writeFileSync(stateFile, JSON.stringify(state, null, 2)); }
function normalized(value) { return String(value || "").replaceAll(" ", "_").toLowerCase(); }
function sshArgs() { return [...(sshKey ? ["-i", sshKey] : []), "-o", "BatchMode=yes", "-o", "ConnectTimeout=8"]; }
function run(program, args, options = {}) { return execFileSync(program, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }); }

async function request(table, query, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function dueSessions() {
  const now = new Date();
  const end = new Date(now.getTime() + prepMs);
  const select = "id,email,session_title,scheduled_start,scheduled_end,session_status,approved_run_type,code_submission_id,created_at";
  const query = `scheduled_start=lte.${encodeURIComponent(end.toISOString())}&scheduled_end=gte.${encodeURIComponent(now.toISOString())}&approved_run_type=eq.custom_code&select=${select}&order=scheduled_start.asc`;
  return (await request("agentech_robot_sessions", query)).filter((item) => activeStatuses.has(normalized(item.session_status)));
}

async function reviewedSubmission(session) {
  if (session.approved_run_type !== "custom_code") throw new Error("session is not approved for custom code");
  if (!session.code_submission_id) {
    // Compatibility for website deployments created before booking-time pinning:
    // choose only the newest fully reviewed submission that already existed when the booking was made.
    const cutoff = encodeURIComponent(session.created_at);
    const fallbackQuery = `email=eq.${encodeURIComponent(session.email)}&created_at=lte.${cutoff}&physical_safety_status=eq.passed&ai_security_status=eq.passed&select=id,code&order=created_at.desc&limit=1`;
    const candidates = await request("agentech_code_submissions", fallbackQuery);
    if (candidates.length !== 1) throw new Error("custom session has no eligible reviewed submission to pin");
    const updated = await request(
      "agentech_robot_sessions",
      `id=eq.${encodeURIComponent(session.id)}&code_submission_id=is.null`,
      { method: "PATCH", body: { code_submission_id: candidates[0].id } }
    );
    if (!updated?.length) throw new Error("unable to atomically pin reviewed submission");
    session.code_submission_id = candidates[0].id;
    console.log(`[robot-stream] pinned reviewed submission ${candidates[0].id} to legacy booking ${session.id}.`);
  }
  const query = `id=eq.${encodeURIComponent(session.code_submission_id)}&email=eq.${encodeURIComponent(session.email)}&physical_safety_status=eq.passed&ai_security_status=eq.passed&select=id,code&limit=1`;
  const rows = await request("agentech_code_submissions", query);
  if (rows.length !== 1) throw new Error("pinned submission no longer passes both reviews");
  return rows[0];
}

async function startObs() {
  if (!obs) { obs = new OBSWebSocket(); await obs.connect(obsUrl, obsPassword); }
  const status = await obs.call("GetStreamStatus");
  if (!status.outputActive) await obs.call("StartStream");
}

async function stopObs() {
  if (!obs) return;
  const status = await obs.call("GetStreamStatus");
  if (status.outputActive) await obs.call("StopStream");
}

function stage(session, submission) {
  const prefix = `session-${session.id}`;
  const sourcePath = join(runtimeDir, `${prefix}.reviewed.py`);
  const planPath = join(runtimeDir, `${prefix}.plan.json`);
  writeFileSync(sourcePath, submission.code, { encoding: "utf8", flag: "wx" });
  run(localPython, [compiler, sourcePath, submission.id, planPath]);
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  if (plan.source_sha256 !== createHash("sha256").update(submission.code).digest("hex")) throw new Error("compiled plan source hash mismatch");
  run("ssh", [...sshArgs(), robot, "mkdir", "-p", remoteDir]);
  run("scp", [...sshArgs(), planPath, trustedRunner, `${robot}:${remoteDir}/`]);
  let captureIndex = 0;
  const remoteCaptures = [];
  for (const command of plan.commands) {
    if (command.name !== "capture_image") continue;
    captureIndex += 1;
    if (command.args?.mode === "display") {
      remoteCaptures.push(`${remoteDir}/${prefix}.plan-capture-${captureIndex}.jpg`);
    }
  }
  state.sessions[session.id] = {
    status: "staged",
    remotePlan: `${remoteDir}/${prefix}.plan.json`,
    remoteCaptures,
    publishedCaptures: [],
    accountEmail: session.email,
    end: session.scheduled_end
  };
  saveState();
  console.log(`[robot-stream] Code X compiled and staged ${plan.commands.length} commands for session ${session.id}.`);
}

async function claimSession(session) {
  const statuses = claimableStatuses.join(",");
  const claimed = await request(
    "agentech_robot_sessions",
    `id=eq.${encodeURIComponent(session.id)}&session_status=in.(${statuses})&select=id`,
    { method: "PATCH", body: { session_status: "running" } }
  );
  return claimed?.length === 1;
}

async function launch(session) {
  const item = state.sessions[session.id];
  if (!(await claimSession(session))) {
    item.status = "skipped";
    saveState();
    console.log(`[robot-stream] session ${session.id} was claimed by another gateway; skipping.`);
    return;
  }
  const remoteRunner = `${remoteDir}/trusted-robot-runner.py`;
  const remoteLog = `${remoteDir}/session-${session.id}.log`;
  const command = `cd '${remoteDir}' && PYTHONPATH=/home/firefly/Agentech-SDK nohup ${robotPython} '${remoteRunner}' '${item.remotePlan}' > '${remoteLog}' 2>&1 & echo $!`;
  item.pid = run("ssh", [...sshArgs(), robot, command]).trim();
  item.status = "running";
  saveState();
  console.log(`[robot-stream] trusted runner started for session ${session.id}; PID ${item.pid}.`);
}

function stopSession(id) {
  const item = state.sessions[id];
  if (item?.pid && item.status === "running") {
    try { run("ssh", [...sshArgs(), robot, "kill", item.pid], { stdio: "ignore" }); } catch {}
  }
  item.status = "finished";
  saveState();
}

function processRunning(pid) {
  try {
    run("ssh", [...sshArgs(), robot, "kill", "-0", String(pid)], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function publishCaptures(id, item) {
  const remoteCaptures = item.remoteCaptures ?? (item.remoteCapture ? [item.remoteCapture] : []);
  item.publishedCaptures ??= [];
  const token = process.env.ROBOT_RUNNER_SECRET || createHmac("sha256", supabaseKey)
    .update("agentech-capture-upload-v1")
    .digest("hex");
  for (const [index, remoteCapture] of remoteCaptures.entries()) {
    if (item.publishedCaptures.includes(remoteCapture)) continue;
    const localCapture = join(runtimeDir, `session-${id}.capture-${index + 1}.jpg`);
    run("scp", [...sshArgs(), `${robot}:${remoteCapture}`, localCapture]);
    const response = await fetch(captureUploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-robot-runner-secret": token,
        "Content-Type": "image/jpeg",
        "x-agentech-account-email": item.accountEmail
      },
      body: readFileSync(localCapture)
    });
    if (!response.ok) throw new Error(`capture upload failed: ${await response.text()}`);
    const result = await response.json();
    item.publishedCaptures.push(remoteCapture);
    item.captureIds ??= [];
    item.captureIds.push(result.captureId);
    saveState();
    console.log(`[robot-stream] published display capture ${result.captureId} (${index + 1}/${remoteCaptures.length}) for session ${id}.`);
  }
}

async function tick() {
  const now = Date.now();
  const sessions = await dueSessions();
  for (const session of sessions) {
    if (!state.sessions[session.id]) {
      const submission = await reviewedSubmission(session);
      stage(session, submission);
      await startObs();
    }
    if (state.sessions[session.id].status === "staged" && now >= Date.parse(session.scheduled_start)) await launch(session);
  }
  for (const [id, item] of Object.entries(state.sessions)) {
    if (item.status === "running" && !processRunning(item.pid)) {
      item.status = "publishing";
      saveState();
      try {
        await publishCaptures(id, item);
        item.status = "completed";
        saveState();
      } catch (error) {
        item.status = "failed";
        item.error = error.message;
        saveState();
        try {
          await request(
            "agentech_robot_sessions",
            `id=eq.${encodeURIComponent(id)}`,
            { method: "PATCH", body: { session_status: "failed" } }
          );
        } catch (statusError) {
          console.error(`[robot-stream] unable to publish failed status for session ${id}:`, statusError.message);
        }
        console.error(`[robot-stream] session ${id} failed after runner exit:`, error.message);
      }
    }
    if (["running", "completed"].includes(item.status) && now >= Date.parse(item.end)) stopSession(id);
  }
  const active = Object.values(state.sessions).some((item) => ["staged", "running"].includes(item.status));
  if (!active) await stopObs();
}

console.log(`[robot-stream] Standalone trusted command gateway running for ${robot}; customer source is never sent to the robot.`);
let tickInProgress = false;
async function guardedTick() {
  if (tickInProgress) return;
  tickInProgress = true;
  try {
    await tick();
  } catch (error) {
    console.error("[robot-stream] tick failed:", error.message);
  } finally {
    tickInProgress = false;
  }
}

await guardedTick();
setInterval(() => void guardedTick(), pollMs);
