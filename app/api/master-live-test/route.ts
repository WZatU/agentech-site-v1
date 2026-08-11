import { NextRequest, NextResponse } from "next/server";
import {
  createCodeSubmissionRecord,
  createRobotSession,
  deleteRobotSessionRecord,
  findRobotSessionConflict,
  getAccessProfiles,
  getAccountRecord,
  getCodeSubmissionRecords,
  getRobotSessions,
  markDeveloperReviewGateOnAccount,
  updateCodeSubmissionRecord,
} from "@/lib/account-records";
import { handleMasterLiveTest } from "@/lib/master-live-test-handler";
import { ensureMasterLiveTestSession } from "@/lib/master-live-test-session";
import { getServerAccountEmail } from "@/lib/server-account-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const email = await getServerAccountEmail(request);
  const payload = await request.json().catch(() => ({}));
  const result = await handleMasterLiveTest({ email, payload }, {
    getAccount: getAccountRecord,
    listSubmissions: getCodeSubmissionRecords,
    createSubmission: createCodeSubmissionRecord,
    ensureSession: (accountEmail, now) => ensureMasterLiveTestSession(accountEmail, now, {
      listSessions: getRobotSessions,
      findConflict: findRobotSessionConflict,
      listProfiles: getAccessProfiles,
      createSession: createRobotSession,
    }),
    updateSubmission: updateCodeSubmissionRecord,
    markAccountGate: markDeveloperReviewGateOnAccount,
    deleteSession: deleteRobotSessionRecord,
    createSubmissionId: () => `master-live-test-${crypto.randomUUID()}`,
  });

  return NextResponse.json(result.body, { status: result.status });
}
