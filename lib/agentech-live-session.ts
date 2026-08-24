import { normalizeLiveRobotModel, type LiveRobotModel } from "@/lib/master-live-camera";
import { supabaseRequest } from "@/lib/supabase-server";

const activeSessionStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending", "running"]);

type ActiveSessionRow = {
  id: number;
  robot_model: string | null;
  session_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

export type ActiveRobotViewingSession = {
  id: number;
  robotModel: LiveRobotModel;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

function normalizeStatus(status: string) {
  return status.replace(/ /g, "_").toLowerCase();
}

export async function getActiveRobotViewingSession(email: string, now = new Date()) {
  const nowIso = now.toISOString();
  const sessions = await supabaseRequest<ActiveSessionRow[]>("agentech_robot_sessions", {
    query: [
      `email=eq.${encodeURIComponent(email)}`,
      `scheduled_start=lte.${encodeURIComponent(nowIso)}`,
      `scheduled_end=gte.${encodeURIComponent(nowIso)}`,
      "select=id,robot_model,session_status,scheduled_start,scheduled_end",
      "order=scheduled_start.asc",
      "limit=5"
    ].join("&")
  }).catch(() => []);

  const session = sessions.find((item) => activeSessionStatuses.has(normalizeStatus(item.session_status)));
  if (!session) return null;

  return {
    id: session.id,
    robotModel: normalizeLiveRobotModel(session.robot_model) ?? "Aegies",
    status: session.session_status,
    scheduledStart: session.scheduled_start,
    scheduledEnd: session.scheduled_end
  } satisfies ActiveRobotViewingSession;
}
