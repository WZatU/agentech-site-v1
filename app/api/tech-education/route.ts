import { NextRequest, NextResponse } from "next/server";
import { company } from "@/lib/site-data";
import { accountExists, saveWorkshopApplication } from "@/lib/talent-applications";
import { sanitizeResumeFilename, uploadTalentResume, validateTalentResumeFile } from "@/lib/talent-resumes";
import {
  TECH_EDUCATION_EXPERIENCE,
  TECH_EDUCATION_GRADES,
  TECH_EDUCATION_INTERESTS,
  buildTechEducationMailto,
  buildTechEducationSubject,
  buildTechEducationText,
  type TechEducationApplication,
  type TechEducationExperience,
  type TechEducationGrade,
  type TechEducationInterest
} from "@/lib/tech-education";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MIN_FORM_FILL_MS = 3_000;
const recentSubmissions = new Map<string, number>();

type TechEducationPayload = {
  accountEmail?: string;
  name?: string;
  email?: string;
  school?: string;
  grade?: string;
  gpa?: string;
  interests?: string[];
  experience?: string;
  parentEmail?: string;
  notes?: string;
  website?: string;
  startedAt?: number;
  resume?: File | null;
};

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
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

function payloadFromFormData(formData: FormData): TechEducationPayload {
  return {
    accountEmail: clean(formData.get("accountEmail"), 160),
    name: clean(formData.get("name"), 120),
    email: clean(formData.get("email"), 160),
    school: clean(formData.get("school"), 160),
    grade: clean(formData.get("grade"), 10),
    gpa: clean(formData.get("gpa"), 20),
    interests: formData.getAll("interests").map((value) => clean(value, 40)),
    experience: clean(formData.get("experience"), 40),
    parentEmail: clean(formData.get("parentEmail"), 160),
    notes: clean(formData.get("notes"), 1200),
    website: clean(formData.get("website")),
    startedAt: Number(formData.get("startedAt")),
    resume: formData.get("resume") instanceof File ? formData.get("resume") as File : null
  };
}

function validate(payload: TechEducationPayload, resumeFilename?: string): { data?: TechEducationApplication; error?: string } {
  if (payload.website?.trim()) {
    return { error: "Submission rejected." };
  }

  if (!payload.startedAt || Date.now() - payload.startedAt < MIN_FORM_FILL_MS) {
    return { error: "Please review the form before submitting." };
  }

  const name = clean(payload.name, 120);
  const email = clean(payload.email, 160);
  const school = clean(payload.school, 160);
  const grade = clean(payload.grade, 10) as TechEducationGrade;
  const gpa = clean(payload.gpa, 20);
  const experience = clean(payload.experience, 40) as TechEducationExperience;
  const parentEmail = clean(payload.parentEmail, 160);
  const notes = clean(payload.notes, 1200);
  const rawInterests = Array.isArray(payload.interests) ? payload.interests : [];
  const uniqueInterests = [...new Set(rawInterests.map((item) => clean(item, 40)))];
  const interests = uniqueInterests.filter((item): item is TechEducationInterest =>
    TECH_EDUCATION_INTERESTS.includes(item as TechEducationInterest)
  );

  if (!name || !email || !school || !grade || !gpa || !experience || !parentEmail) {
    return { error: "Please complete all required fields." };
  }

  if (!TECH_EDUCATION_GRADES.includes(grade)) {
    return { error: "Please choose one grade." };
  }

  if (!isEmail(email) || !isEmail(parentEmail)) {
    return { error: "Please enter a valid email address." };
  }

  if (!TECH_EDUCATION_EXPERIENCE.includes(experience)) {
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
      resumeFilename,
      notes
    }
  };
}

async function sendWithResend(application: TechEducationApplication, receiverEmail: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return {
      mode: "mailto" as const,
      mailtoUrl: buildTechEducationMailto(application, receiverEmail)
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
      subject: buildTechEducationSubject(application.name),
      text: buildTechEducationText(application)
    })
  });

  if (!response.ok) {
    const fallbackUrl = buildTechEducationMailto(application, receiverEmail);
    return {
      mode: "mailto" as const,
      mailtoUrl: fallbackUrl
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

  const formData = await request.formData();
  const payload = payloadFromFormData(formData);
  const accountEmail = clean(payload.accountEmail, 160).toLowerCase();
  let uploadedResume: Awaited<ReturnType<typeof uploadTalentResume>> | null = null;
  const resumeFilename = payload.resume ? sanitizeResumeFilename(payload.resume.name || "resume.pdf") : undefined;

  if (payload.resume) {
    const resumeError = validateTalentResumeFile(payload.resume);
    if (resumeError) {
      return NextResponse.json({ ok: false, message: resumeError }, { status: 400 });
    }
  }

  if (!accountEmail || !isEmail(accountEmail) || !(await accountExists(accountEmail))) {
    return NextResponse.json(
      { ok: false, message: "Please sign in to your Agentech account before submitting this form." },
      { status: 401 }
    );
  }

  const validation = validate(payload, resumeFilename);

  if (!validation.data) {
    return NextResponse.json({ ok: false, message: validation.error }, { status: 400 });
  }

  if (payload.resume) {
    uploadedResume = await uploadTalentResume(accountEmail, payload.resume);
  }

  recentSubmissions.set(clientKey, Date.now());

  await saveWorkshopApplication(accountEmail, validation.data, uploadedResume?.path);

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
