import { NextResponse } from "next/server";
import {
  createAccessProfile,
  getAccessProfileByUsername,
  getAccountRecord,
  isAccessProfileType,
  isValidProfileUsername,
  normalizeProfileUsername
} from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type ProfilePayload = {
  email?: string;
  profileType?: string;
  username?: string;
  displayName?: string;
  monthlyCreditLimit?: number | string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toCreditAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(clean(value));
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

function formatProfileLabel(profileType: string) {
  return profileType.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ProfilePayload | null;
  const email = normalizeEmail(payload?.email);
  const profileType = clean(payload?.profileType).toLowerCase();
  const username = normalizeProfileUsername(payload?.username);
  const displayName = clean(payload?.displayName);
  const monthlyCreditLimit = toCreditAmount(payload?.monthlyCreditLimit);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid account email is required." }, { status: 400 });
  }

  if (!isAccessProfileType(profileType)) {
    return NextResponse.json({ error: "Choose developer, student, teacher, or talent." }, { status: 400 });
  }

  if (!isValidProfileUsername(username)) {
    return NextResponse.json({ error: "Choose a username with 3-32 lowercase letters, numbers, dots, dashes, or underscores." }, { status: 400 });
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const usernameMatch = await getAccessProfileByUsername(username);
  if (usernameMatch) {
    return NextResponse.json({ error: "That profile username is already taken." }, { status: 409 });
  }

  const profile = await createAccessProfile({
    accountEmail: email,
    profileType,
    username,
    displayName: displayName || `${formatProfileLabel(profileType)} Profile`,
    monthlyCreditLimit
  });

  return NextResponse.json({ ok: true, profile });
}
