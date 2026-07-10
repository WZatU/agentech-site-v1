import { NextRequest, NextResponse } from "next/server";
import { getCodeSubmissionRecords } from "@/lib/account-records";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";

export async function GET(request: NextRequest) {
  try {
    const email = await getServerAccountEmail(request);
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Sign in again to view your reviewed code files." },
        { status: 401 }
      );
    }

    const submissions = await getCodeSubmissionRecords(email);
    return NextResponse.json({ ok: true, submissions });
  } catch {
    return NextResponse.json(
      { error: "Reviewed code files could not be loaded. Refresh the account and try again." },
      { status: 500 }
    );
  }
}
