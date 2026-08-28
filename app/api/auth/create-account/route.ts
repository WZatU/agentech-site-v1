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
import { upsertProfile } from "@/lib/account-records";
import { setSignedAccountSessionCookie } from "@/lib/server-account-session";
import { ensureSupabaseAuthUser } from "@/lib/supabase-auth-admin";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    code?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
  } | null;
  const email = normalizeEmail(payload?.email);
  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  const firstName = cleanName(payload?.firstName);
  const lastName = cleanName(payload?.lastName);
  const phone = clean(payload?.phone);
  const addressLine1 = clean(payload?.addressLine1);
  const addressLine2 = clean(payload?.addressLine2);
  const address = [addressLine1, addressLine2].filter(Boolean).join("\n");

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Enter your verification code." }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: "First name, last name, and phone number are required." }, { status: 400 });
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
    first_name: firstName,
    last_name: lastName,
    phone,
    credit_balance: 0,
    paid_credit_balance: 0,
    bonus_credit_balance: 0,
    created_at: now,
    verified_at: now
  });
  await upsertProfile({
    email,
    first_name: firstName,
    last_name: lastName,
    phone,
    company: null,
    address: address || null,
    dob: null,
    account_type: null
  });
  await clearVerificationCode(email);
  await ensureSupabaseAuthUser(email, password);

  const response = NextResponse.json({ ok: true, email });
  setSignedAccountSessionCookie(response, email);
  return response;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanName(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
