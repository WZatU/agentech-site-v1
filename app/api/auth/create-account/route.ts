import { NextResponse } from "next/server";
import {
  clearVerificationCode,
  createAccount,
  createPasswordHash,
  findAccount,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
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
  if (existing) {
    return NextResponse.json({ error: "This email already has an account. Please sign in." }, { status: 409 });
  }

  const codeValid = await verifyCode(email, code);
  if (!codeValid) {
    return NextResponse.json({ error: "Verification code is incorrect or expired." }, { status: 400 });
  }

  const { passwordHash, salt } = createPasswordHash(password);
  const now = new Date().toISOString();

  await createAccount({
    email,
    password_hash: passwordHash,
    salt,
    created_at: now,
    verified_at: now
  });
  await clearVerificationCode(email);

  return NextResponse.json({ ok: true, email });
}
