export const MASTER_LIVE_TEST_EMAIL = "victoria_c@agent-tech.ai";
export const MASTER_LIVE_TEST_DURATION_MINUTES = 30;
export const MASTER_LIVE_TEST_LABEL = "Master live stream test (view only)";
export const MASTER_LIVE_TEST_NOTE = "View-only authorization. Submitted text is never executed on Master.";

const activeSessionStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending", "running"]);

export type MasterLiveTestProfile = {
  id: number;
  username: string;
  profile_type: "developer" | "student" | "teacher" | "talent";
};

export type MasterLiveTestSession = {
  id: number;
  email: string;
  robot_model: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  session_status: string;
  requested_run_type: string | null;
  approved_run_type: string | null;
  preset_demo: string | null;
};

export function hasMasterLiveTestAccess(email: string | null | undefined) {
  return email?.trim().toLowerCase() === MASTER_LIVE_TEST_EMAIL;
}

export function masterLiveTestWindow(now = new Date()) {
  return {
    scheduledStart: now.toISOString(),
    scheduledEnd: new Date(now.getTime() + MASTER_LIVE_TEST_DURATION_MINUTES * 60_000).toISOString(),
  };
}

export function selectReusableMasterLiveTestSession<T extends MasterLiveTestSession>(
  sessions: T[],
  email: string,
  now = new Date(),
) {
  const normalizedEmail = email.trim().toLowerCase();
  const nowMs = now.getTime();

  return sessions.find((session) => {
    const scheduledStart = Date.parse(session.scheduled_start ?? "");
    const scheduledEnd = Date.parse(session.scheduled_end ?? "");
    const status = session.session_status.replaceAll(" ", "_").toLowerCase();

    return session.email.trim().toLowerCase() === normalizedEmail
      && session.robot_model === "Master"
      && session.requested_run_type === "preset_demo"
      && session.approved_run_type === "preset_demo"
      && session.preset_demo === MASTER_LIVE_TEST_LABEL
      && activeSessionStatuses.has(status)
      && Number.isFinite(scheduledStart)
      && Number.isFinite(scheduledEnd)
      && scheduledStart <= nowMs
      && scheduledEnd > nowMs;
  }) ?? null;
}

export function buildMasterLiveTestSessionInput(
  email: string,
  profile: MasterLiveTestProfile,
  now = new Date(),
) {
  const window = masterLiveTestWindow(now);

  return {
    email: email.trim().toLowerCase(),
    accessProfileId: profile.id,
    profileUsername: profile.username,
    profileType: profile.profile_type,
    sessionTitle: MASTER_LIVE_TEST_LABEL,
    robotModel: "Master",
    scheduledStart: window.scheduledStart,
    scheduledEnd: window.scheduledEnd,
    requestedRunType: "preset_demo" as const,
    approvedRunType: "preset_demo" as const,
    presetDemo: MASTER_LIVE_TEST_LABEL,
    benchmarkStatus: "passed" as const,
    codeSubmissionId: null,
    price: 0,
    notes: MASTER_LIVE_TEST_NOTE,
  };
}
