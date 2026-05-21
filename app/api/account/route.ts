import { NextResponse } from "next/server";
import { getAccountSummary, getProfile } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const summary = await getAccountSummary(email);
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(payload?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const profile = await getProfile(email);
  return NextResponse.json({ ok: true, profile });
}
