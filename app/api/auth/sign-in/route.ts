import { NextResponse } from "next/server";
import { createAccount, createPasswordHash, findAccount, isValidEmail, normalizeEmail, verifyPassword } from "@/lib/prototype-auth";
import { setSignedAccountSessionCookie } from "@/lib/server-account-session";
import { ensureSupabaseAuthUser, verifySupabasePassword } from "@/lib/supabase-auth-admin";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = normalizeEmail(payload?.email);
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  let account = await findAccount(email);
  const supabasePasswordValid = await verifySupabasePassword(email, password).catch(() => false);
  const legacyPasswordValid = Boolean(account && verifyPassword(password, account));
  if (!supabasePasswordValid && !legacyPasswordValid) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  if (!supabasePasswordValid && legacyPasswordValid) {
    await ensureSupabaseAuthUser(email, password);
  }

  if (!account) {
    const { passwordHash, salt } = createPasswordHash(password);
    const now = new Date().toISOString();
    await createAccount({
      email,
      password_hash: passwordHash,
      salt,
      first_name: "",
      last_name: "",
      phone: "",
      credit_balance: 0,
      paid_credit_balance: 0,
      bonus_credit_balance: 0,
      created_at: now,
      verified_at: now
    });
  }

  const response = NextResponse.json({ ok: true, email, authProvider: "supabase" });
  setSignedAccountSessionCookie(response, email);
  return response;
}
