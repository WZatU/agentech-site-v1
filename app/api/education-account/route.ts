import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

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

const counterPath = path.join(process.cwd(), "data", "account-counter.json");

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

async function incrementChildrenEnrolled(count: number) {
  await fs.mkdir(path.dirname(counterPath), { recursive: true });

  let childrenEnrolled = 0;
  try {
    const raw = await fs.readFile(counterPath, "utf8");
    const parsed = JSON.parse(raw) as { childrenEnrolled?: number; accountsCreated?: number };
    childrenEnrolled =
      typeof parsed.childrenEnrolled === "number"
        ? parsed.childrenEnrolled
        : typeof parsed.accountsCreated === "number"
          ? parsed.accountsCreated
          : 0;
  } catch {
    childrenEnrolled = 0;
  }

  const next = childrenEnrolled + count;
  await fs.writeFile(counterPath, `${JSON.stringify({ childrenEnrolled: next }, null, 2)}\n`);
  return next;
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
