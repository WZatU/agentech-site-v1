import { NextResponse } from "next/server";
import { incrementChildrenEnrolled } from "@/lib/education-counter";

type ChildPayload = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  grade?: string;
  sex?: string;
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

  if (accountType !== "individual" && accountType !== "group") {
    return "Choose an account type.";
  }

  if (!clean(payload.email) || !clean(payload.firstName) || !clean(payload.lastName) || !clean(payload.phone)) {
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
  const childrenEnrolled = await incrementChildrenEnrolled(children.length);

  return NextResponse.json({
    ok: true,
    childrenEnrolled
  });
}
