import { normalizeLiveRobotModel, type MasterViewSelection } from "./master-live-camera.ts";

const activeStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending", "running"]);

export type MasterGatewaySessionRow = {
  id: number;
  robot_model: string | null;
  session_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

export function selectionForMasterGatewayTransport(
  selection: MasterViewSelection,
  transport: string | null,
): MasterViewSelection | null {
  return transport === "h264" && selection.mode !== "focus" ? null : selection;
}

export function buildMasterGatewaySessionQuery(now = new Date()) {
  const nowIso = encodeURIComponent(now.toISOString());
  return [
    `scheduled_start=lte.${nowIso}`,
    `scheduled_end=gte.${nowIso}`,
    "robot_model=eq.Master",
    "select=id,robot_model,session_status,scheduled_start,scheduled_end",
    "order=scheduled_start.asc",
    "limit=10",
  ].join("&");
}

export function selectActiveMasterGatewaySession(rows: MasterGatewaySessionRow[], now = new Date()) {
  const nowMs = now.getTime();
  const row = rows.find((candidate) => {
    const start = Date.parse(candidate.scheduled_start ?? "");
    const end = Date.parse(candidate.scheduled_end ?? "");
    const status = candidate.session_status.replaceAll(" ", "_").toLowerCase();
    return normalizeLiveRobotModel(candidate.robot_model) === "Master"
      && activeStatuses.has(status)
      && start <= nowMs
      && end >= nowMs;
  });
  if (!row) return null;
  return {
    id: row.id,
    robotModel: "Master" as const,
    status: row.session_status,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
  };
}
