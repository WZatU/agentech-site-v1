import { NextResponse } from "next/server";
import {
  clearVerificationCode,
  findAccount,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  updateAccountPassword,
  verifyCode
} from "@/lib/prototype-auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    code?: string;
    password?: string;
  } | null;
  const email = normalizeEmail(payload?.email);
  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Enter your verification code." }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await findAccount(email);
  if (!existing) {
    return NextResponse.json({ error: "No Agentech account exists for that email." }, { status: 404 });
  }

  const codeValid = await verifyCode(email, code);
  if (!codeValid) {
    return NextResponse.json({ error: "Verification code is incorrect or expired." }, { status: 400 });
  }

  await updateAccountPassword(email, password);
  await clearVerificationCode(email);

  return NextResponse.json({ ok: true, email });
}
