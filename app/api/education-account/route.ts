import { NextResponse } from "next/server";
import { getChildrenEnrolled } from "@/lib/education-counter";
import { replaceChildren, upsertProfile } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type ChildPayload = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  grade?: string;
  sex?: string;
  schoolInfo?: string;
  preferredLocation?: string;
};

type AccountPayload = {
  accountType?: "individual" | "group";
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  dob?: string;
  children?: ChildPayload[];
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validate(payload: AccountPayload) {
  const accountType = payload.accountType;
  const limit = accountType === "group" ? 100 : 6;
  const children = Array.isArray(payload.children) ? payload.children : [];
  const email = normalizeEmail(payload.email);

  if (accountType !== "individual" && accountType !== "group") {
    return "Choose an account type.";
  }

  if (!isValidEmail(email) || !clean(payload.firstName) || !clean(payload.lastName) || !clean(payload.phone)) {
    return "Account email, first name, last name, and phone number are required.";
  }

  if (!children.length) {
    return "Add at least one child.";
  }

  if (children.length > limit) {
    return `${accountType === "group" ? "Group" : "Individual"} accounts can have at most ${limit} children.`;
  }

  for (const child of children) {
    if (!clean(child.firstName) || !clean(child.lastName) || !clean(child.dob) || !clean(child.grade) || !clean(child.sex)) {
      return "Every child must include first name, last name, date of birth, grade, and sex.";
    }
  }

  return null;
}

export async function POST(request: Request) {
  let payload: AccountPayload;

  try {
    payload = (await request.json()) as AccountPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const error = validate(payload);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const children = Array.isArray(payload.children) ? payload.children : [];
  const email = normalizeEmail(payload.email);

  await upsertProfile({
    email,
    first_name: clean(payload.firstName),
    last_name: clean(payload.lastName),
    phone: clean(payload.phone),
    company: null,
    address: clean(payload.address) || null,
    dob: clean(payload.dob) || null,
    account_type: payload.accountType ?? null
  });

  await replaceChildren(
    email,
    children.map((child) => ({
      first_name: clean(child.firstName),
      last_name: clean(child.lastName),
      dob: clean(child.dob),
      grade: clean(child.grade),
      sex: clean(child.sex),
      school_info: clean(child.schoolInfo) || null,
      preferred_location: clean(child.preferredLocation) || null
    }))
  );

  const childrenEnrolled = await getChildrenEnrolled();

  return NextResponse.json({
    ok: true,
    childrenEnrolled
  });
}
