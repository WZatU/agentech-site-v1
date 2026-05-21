import { NextResponse } from "next/server";
import { findAccount, isValidEmail, normalizeEmail, verifyPassword } from "@/lib/prototype-auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = normalizeEmail(payload?.email);
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const account = await findAccount(email);
  if (!account || !verifyPassword(password, account)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, email });
}
