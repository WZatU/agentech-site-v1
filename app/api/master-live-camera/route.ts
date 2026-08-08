import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountSessionCookieName } from "@/lib/account-session";
import { getActiveRobotViewingSession } from "@/lib/agentech-live-session";
import { getMasterViewSelection, setMasterViewSelection } from "@/lib/master-live-camera-state";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

export const dynamic = "force-dynamic";

async function activeMasterSession() {
  const cookieStore = await cookies();
  const email = normalizeEmail(cookieStore.get(accountSessionCookieName)?.value);
  if (!isValidEmail(email)) return { error: "Sign in before changing the Master camera view.", status: 401 } as const;
  const session = await getActiveRobotViewingSession(email);
  if (!session || session.robotModel !== "Master") {
    return { error: "Master camera controls require an active Master session.", status: 403 } as const;
  }
  return { session } as const;
}

export async function GET() {
  const result = await activeMasterSession();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ sessionId: result.session.id, selection: await getMasterViewSelection(result.session.id) });
}

export async function POST(request: Request) {
  const result = await activeMasterSession();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const expiresAt = result.session.scheduledEnd ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const selection = await setMasterViewSelection(
    result.session.id,
    await request.json().catch(() => null),
    expiresAt,
  );
  return NextResponse.json({ sessionId: result.session.id, selection });
}
