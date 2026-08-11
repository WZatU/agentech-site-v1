import {
  buildMasterLiveTestSessionInput,
  masterLiveTestWindow,
  selectReusableMasterLiveTestSession,
  type MasterLiveTestProfile,
  type MasterLiveTestSession,
} from "./master-live-test-access.ts";

type MasterLiveTestSessionInput = ReturnType<typeof buildMasterLiveTestSessionInput>;
type MasterLiveTestReservation<Session> = { session: Session; created: boolean };

export type MasterLiveTestSessionDependencies<Session extends MasterLiveTestSession = MasterLiveTestSession> = {
  listSessions: (email: string) => Promise<Session[]>;
  listConflicts: (startIso: string, endIso: string) => Promise<Session[]>;
  listProfiles: (email: string) => Promise<MasterLiveTestProfile[]>;
  createSession: (input: MasterLiveTestSessionInput) => Promise<MasterLiveTestReservation<Session> | null>;
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
  const conflictsBeforeCreate = await dependencies.listConflicts(window.scheduledStart, window.scheduledEnd);
  const concurrentReusable = conflictsBeforeCreate
    .filter((session) => selectReusableMasterLiveTestSession([session], email, now))
    .sort((left, right) => left.id - right.id)[0];
  if (concurrentReusable) {
    return { session: concurrentReusable, reused: true as const };
  }
  if (conflictsBeforeCreate.length) {
    throw new MasterLiveTestConflictError();
  }

  const profile = (await dependencies.listProfiles(email))[0];
  if (!profile) {
    throw new MasterLiveTestProfileError();
  }

  const reservation = await dependencies.createSession(buildMasterLiveTestSessionInput(email, profile, now));
  if (!reservation) {
    throw new Error("Unable to create the Master live-test session.");
  }

  return { session: reservation.session, reused: !reservation.created };
}
