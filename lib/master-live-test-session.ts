import {
  buildMasterLiveTestSessionInput,
  masterLiveTestWindow,
  selectReusableMasterLiveTestSession,
  type MasterLiveTestProfile,
  type MasterLiveTestSession,
} from "./master-live-test-access.ts";

type MasterLiveTestSessionInput = ReturnType<typeof buildMasterLiveTestSessionInput>;

export type MasterLiveTestSessionDependencies<Session extends MasterLiveTestSession = MasterLiveTestSession> = {
  listSessions: (email: string) => Promise<Session[]>;
  findConflict: (startIso: string, endIso: string) => Promise<unknown | null>;
  listProfiles: (email: string) => Promise<MasterLiveTestProfile[]>;
  createSession: (input: MasterLiveTestSessionInput) => Promise<Session | null>;
};

export class MasterLiveTestConflictError extends Error {
  constructor(message = "Another active robot session overlaps this 30-minute Master test.") {
    super(message);
    this.name = "MasterLiveTestConflictError";
  }
}

export class MasterLiveTestProfileError extends Error {
  constructor(message = "Create an account profile before starting the Master live test.") {
    super(message);
    this.name = "MasterLiveTestProfileError";
  }
}

export async function ensureMasterLiveTestSession<Session extends MasterLiveTestSession>(
  email: string,
  now: Date,
  dependencies: MasterLiveTestSessionDependencies<Session>,
) {
  const reusable = selectReusableMasterLiveTestSession(await dependencies.listSessions(email), email, now);
  if (reusable) {
    return { session: reusable, reused: true as const };
  }

  const window = masterLiveTestWindow(now);
  if (await dependencies.findConflict(window.scheduledStart, window.scheduledEnd)) {
    throw new MasterLiveTestConflictError();
  }

  const profile = (await dependencies.listProfiles(email))[0];
  if (!profile) {
    throw new MasterLiveTestProfileError();
  }

  const created = await dependencies.createSession(buildMasterLiveTestSessionInput(email, profile, now));
  if (!created) {
    throw new Error("Unable to create the Master live-test session.");
  }

  return { session: created, reused: false as const };
}
