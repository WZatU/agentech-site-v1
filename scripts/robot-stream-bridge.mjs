import OBSWebSocket from "obs-websocket-js";

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required.`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const obsUrl = process.env.OBS_WEBSOCKET_URL || "ws://127.0.0.1:4455";
const obsPassword = process.env.OBS_WEBSOCKET_PASSWORD || undefined;
const pollMs = Number(process.env.ROBOT_STREAM_POLL_MS || 5000);
const prepMs = Number(process.env.ROBOT_STREAM_PREP_SECONDS || 120) * 1000;
const operatingStartHour = Number(process.env.ROBOT_STREAM_START_HOUR || 8);
const operatingEndHour = Number(process.env.ROBOT_STREAM_END_HOUR || 22);
const activeStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending"]);

let obs = null;
let streamingForSessionId = null;

function iso(date) {
  return date.toISOString();
}

function normalizeStatus(status) {
  return String(status || "").replace(/ /g, "_").toLowerCase();
}

function localHourValue(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function isWithinOperatingWindow(date = new Date()) {
  const hour = localHourValue(date);
  return hour >= operatingStartHour && hour < operatingEndHour;
}

async function supabaseRequest(table, query, options = {}) {
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase ${table} request failed.`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function findDueSession() {
  const now = new Date();
  const startWindowEnd = new Date(now.getTime() + prepMs);
  const query = [
    `scheduled_start=lte.${encodeURIComponent(iso(startWindowEnd))}`,
    `scheduled_end=gte.${encodeURIComponent(iso(now))}`,
    "select=id,email,profile_username,session_title,scheduled_start,scheduled_end,session_status",
    "order=scheduled_start.asc",
    "limit=1"
  ].join("&");
  const sessions = await supabaseRequest("agentech_robot_sessions", query);
  return (sessions || []).find((session) => activeStatuses.has(normalizeStatus(session.session_status))) || null;
}

async function connectObs() {
  if (obs) {
    return obs;
  }

  obs = new OBSWebSocket();
  obs.on("ConnectionClosed", () => {
    obs = null;
    streamingForSessionId = null;
  });
  await obs.connect(obsUrl, obsPassword);
  return obs;
}

async function getStreamActive(client) {
  const status = await client.call("GetStreamStatus");
  return Boolean(status.outputActive);
}

async function startStream(session) {
  const client = await connectObs();
  if (!(await getStreamActive(client))) {
    await client.call("StartStream");
    console.log(`[robot-stream] started OBS stream for session ${session.id}: ${session.session_title}`);
  }
  streamingForSessionId = session.id;
}

async function stopStream() {
  const client = await connectObs();
  if (await getStreamActive(client)) {
    await client.call("StopStream");
    console.log("[robot-stream] stopped OBS stream; no active robot session is due.");
  }
  streamingForSessionId = null;
}

async function tick() {
  if (!isWithinOperatingWindow()) {
    await stopStream();
    console.log(`[robot-stream] outside operating window ${operatingStartHour}:00-${operatingEndHour}:00; exiting.`);
    process.exit(0);
  }

  const dueSession = await findDueSession();
  if (dueSession) {
    await startStream(dueSession);
    return;
  }

  await stopStream();
}

console.log("[robot-stream] bridge running.");
console.log(`[robot-stream] OBS: ${obsUrl}`);
console.log(`[robot-stream] Poll: ${pollMs}ms, prep: ${prepMs / 1000}s`);
console.log(`[robot-stream] Operating window: ${operatingStartHour}:00-${operatingEndHour}:00 local time`);

await tick().catch((error) => console.error("[robot-stream] tick failed:", error.message));
setInterval(() => {
  tick().catch((error) => console.error("[robot-stream] tick failed:", error.message));
}, pollMs);
