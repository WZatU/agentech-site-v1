import { NextRequest, NextResponse } from "next/server";
import {
  createCodeSubmissionRecord,
  getAccessProfiles,
  getAccountRecord,
  getCodeSubmissionRecords,
  getRobotSessionConflictsStrict,
  getRobotSessionsStrict,
  reserveMasterLiveTestSession,
  updateCodeSubmissionRecord,
} from "@/lib/account-records";
import { getActiveRobotViewingSession } from "@/lib/agentech-live-session";
import { handleMasterLiveTest, handleMasterLiveTestStatus } from "@/lib/master-live-test-handler";
import { ensureMasterLiveTestSession } from "@/lib/master-live-test-session";
import { getServerAccountEmail } from "@/lib/server-account-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = await getServerAccountEmail(request);
  const result = await handleMasterLiveTestStatus({ email }, {
    listSubmissions: getCodeSubmissionRecords,
    getActiveSession: getActiveRobotViewingSession,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest) {
  const email = await getServerAccountEmail(request);
  const payload = await request.json().catch(() => ({}));
  const result = await handleMasterLiveTest({ email, payload }, {
    getAccount: getAccountRecord,
    listSubmissions: getCodeSubmissionRecords,
    createSubmission: createCodeSubmissionRecord,
    ensureSession: (accountEmail, now) => ensureMasterLiveTestSession(accountEmail, now, {
      listSessions: getRobotSessionsStrict,
      listConflicts: getRobotSessionConflictsStrict,
      listProfiles: getAccessProfiles,
      createSession: reserveMasterLiveTestSession,
    }),
    updateSubmission: updateCodeSubmissionRecord,
    createSubmissionId: () => `master-live-test-${crypto.randomUUID()}`,
  });

  return NextResponse.json(result.body, { status: result.status });
}
