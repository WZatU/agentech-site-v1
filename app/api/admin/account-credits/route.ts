import { NextResponse } from "next/server";
import { addAccountCredits } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type CreditPayload = {
  adminEmail?: string;
  targetEmail?: string;
  creditType?: string;
  credits?: number | string;
};

function isAdminEmail(email: string) {
  return email.endsWith("@agent-tech.ai");
}

function toCreditAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(typeof value === "string" ? value.trim() : 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as CreditPayload | null;
  const adminEmail = normalizeEmail(payload?.adminEmail);
  const targetEmail = normalizeEmail(payload?.targetEmail);
  const creditType = payload?.creditType === "bonus" ? "bonus" : "paid";
  const credits = toCreditAmount(payload?.credits);

  if (!isValidEmail(adminEmail) || !isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "An @agent-tech.ai admin account is required." }, { status: 403 });
  }

  if (!isValidEmail(targetEmail)) {
    return NextResponse.json({ error: "A valid target account email is required." }, { status: 400 });
  }

  if (credits <= 0) {
    return NextResponse.json({ error: "Enter a credit amount greater than zero." }, { status: 400 });
  }

  const result = await addAccountCredits(targetEmail, creditType, credits);
  if (!result) {
    return NextResponse.json({ error: "Target account not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, creditType, ...result });
}
