import { NextRequest, NextResponse } from "next/server";
import { company } from "@/lib/site-data";
import {
  SUMMER_SCHOOL_EXPERIENCE,
  SUMMER_SCHOOL_GRADES,
  SUMMER_SCHOOL_INTERESTS,
  buildSummerSchoolMailto,
  buildSummerSchoolSubject,
  buildSummerSchoolText,
  type SummerSchoolApplication,
  type SummerSchoolExperience,
  type SummerSchoolGrade,
  type SummerSchoolInterest
} from "@/lib/summer-school";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MIN_FORM_FILL_MS = 3_000;
const recentSubmissions = new Map<string, number>();

type SummerSchoolPayload = {
  name?: string;
  email?: string;
  school?: string;
  grade?: string;
  gpa?: string;
  interests?: string[];
  experience?: string;
  parentEmail?: string;
  projects?: string;
  uniqueness?: string;
  notes?: string;
  website?: string;
  startedAt?: number;
};

function clean(value: string | undefined, max = 200) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function isEmail(value: string) {
  return EMAIL_RE.test(value);
}

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function validate(payload: SummerSchoolPayload): { data?: SummerSchoolApplication; error?: string } {
  if (payload.website?.trim()) {
    return { error: "Submission rejected." };
  }

  if (!payload.startedAt || Date.now() - payload.startedAt < MIN_FORM_FILL_MS) {
    return { error: "Please review the form before submitting." };
  }

  const name = clean(payload.name, 120);
  const email = clean(payload.email, 160);
  const school = clean(payload.school, 160);
  const grade = clean(payload.grade, 10) as SummerSchoolGrade;
  const gpa = clean(payload.gpa, 20);
  const experience = clean(payload.experience, 40) as SummerSchoolExperience;
  const parentEmail = clean(payload.parentEmail, 160);
  const projects = clean(payload.projects, 1200);
  const uniqueness = clean(payload.uniqueness, 1200);
  const notes = clean(payload.notes, 1200);
  const rawInterests = Array.isArray(payload.interests) ? payload.interests : [];
  const uniqueInterests = [...new Set(rawInterests.map((item) => clean(item, 40)))];
  const interests = uniqueInterests.filter((item): item is SummerSchoolInterest =>
    SUMMER_SCHOOL_INTERESTS.includes(item as SummerSchoolInterest)
  );

  if (!name || !email || !school || !grade || !gpa || !experience || !parentEmail || !projects || !uniqueness) {
    return { error: "Please complete all required fields." };
  }

  if (!SUMMER_SCHOOL_GRADES.includes(grade)) {
    return { error: "Please choose one grade." };
  }

  if (!isEmail(email) || !isEmail(parentEmail)) {
    return { error: "Please enter a valid email address." };
  }

  if (!SUMMER_SCHOOL_EXPERIENCE.includes(experience)) {
    return { error: "Please choose an experience level." };
  }

  if (interests.length === 0 || interests.length > 3) {
    return { error: "Please choose up to three interests." };
  }

  return {
    data: {
      name,
      email,
      school,
      grade,
      gpa,
      interests,
      experience,
      parentEmail,
      projects,
      uniqueness,
      notes
    }
  };
}

async function sendWithResend(application: SummerSchoolApplication, receiverEmail: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return {
      mode: "mailto" as const,
      mailtoUrl: buildSummerSchoolMailto(application, receiverEmail)
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [receiverEmail],
      reply_to: [application.email, application.parentEmail],
      subject: buildSummerSchoolSubject(application.name),
      text: buildSummerSchoolText(application)
    })
  });

  if (!response.ok) {
    return {
      mode: "mailto" as const,
      mailtoUrl: buildSummerSchoolMailto(application, receiverEmail)
    };
  }

  return { mode: "sent" as const };
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  const lastAttempt = recentSubmissions.get(clientKey) ?? 0;

  if (Date.now() - lastAttempt < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json(
      { ok: false, message: "Please wait a minute before submitting again." },
      { status: 429 }
    );
  }

  const payload = (await request.json()) as SummerSchoolPayload;
  const validation = validate(payload);

  if (!validation.data) {
    return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
  }

  recentSubmissions.set(clientKey, Date.now());

  const receiverEmail = process.env.APPLICATION_RECEIVER_EMAIL || company.contactEmail;
  const result = await sendWithResend(validation.data, receiverEmail);

  if (result.mode === "mailto") {
    return NextResponse.json({
      ok: true,
      mode: "mailto",
      mailtoUrl: result.mailtoUrl,
      message: "Email service is not configured yet. Opening a prefilled email draft instead."
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "sent",
    message: "Application sent successfully."
  });
}
