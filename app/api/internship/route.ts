import { NextRequest, NextResponse } from "next/server";
import { company } from "@/lib/site-data";
import { uploadSupabaseStorageObject } from "@/lib/supabase-server";
import { accountExists, saveInternshipApplication } from "@/lib/talent-applications";
import {
  INTERNSHIP_ROLE_INTERESTS,
  buildInternshipSubject,
  buildInternshipText,
  type InternshipApplication,
  type InternshipRoleInterest
} from "@/lib/internship";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MIN_FORM_FILL_MS = 3_000;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const recentSubmissions = new Map<string, number>();

function clean(value: FormDataEntryValue | null, max = 200) {
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

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildResumeStoragePath(accountEmail: string, filename: string) {
  const accountFolder = accountEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${accountFolder}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
}

function getRoleInterests(formData: FormData) {
  const values = formData.getAll("roleInterests");
  const uniqueValues = [...new Set(values.map((value) => clean(value, 120)))];

  return uniqueValues.filter((value): value is InternshipRoleInterest =>
    INTERNSHIP_ROLE_INTERESTS.includes(value as InternshipRoleInterest)
  );
}

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

function buildApplication(formData: FormData, resumeFilename: string): { data?: InternshipApplication; error?: string } {
  const website = clean(formData.get("website"));
  const startedAt = Number(formData.get("startedAt"));

  if (website) {
    return { error: "Submission rejected." };
  }

  if (!startedAt || Date.now() - startedAt < MIN_FORM_FILL_MS) {
    return { error: "Please review the form before submitting." };
  }

  const name = clean(formData.get("name"), 120);
  const email = clean(formData.get("email"), 160);
  const organization = clean(formData.get("organization"), 160);
  const major = clean(formData.get("major"), 160);
  const graduationYear = clean(formData.get("graduationYear"), 20);
  const location = clean(formData.get("location"), 160);
  const roleInterests = getRoleInterests(formData);
  const profileLink = clean(formData.get("profileLink"), 400);
  const built = clean(formData.get("built"), 2000);
  const whyAgentech = clean(formData.get("whyAgentech"), 2000);
  const notes = clean(formData.get("notes"), 1200);

  if (!name || !email || !organization || !major || !graduationYear || !location || !built || !whyAgentech) {
    return { error: "Please complete all required fields." };
  }

  if (!isEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (roleInterests.length === 0 || roleInterests.length > 2) {
    return { error: "Please choose up to two role interests." };
  }

  return {
    data: {
      name,
      email,
      organization,
      major,
      graduationYear,
      location,
      roleInterests,
      profileLink,
      built,
      whyAgentech,
      resumeFilename,
      notes
    }
  };
}

async function sendWithResend(application: InternshipApplication, receiverEmail: string, resumeFile: File) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APPLICATION_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return {
      ok: false as const,
      status: 503,
      message: "Email service is not configured yet. Please set RESEND_API_KEY and APPLICATION_FROM_EMAIL."
    };
  }

  const fileBuffer = await resumeFile.arrayBuffer();
  const attachments = [
    {
      content: toBase64(fileBuffer),
      filename: application.resumeFilename,
      content_type: "application/pdf"
    }
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [receiverEmail],
      reply_to: [application.email],
      subject: buildInternshipSubject(application.name),
      text: buildInternshipText(application),
      attachments
    })
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: 502,
      message: "Unable to send the application right now."
    };
  }

  return {
    ok: true as const,
    status: 200,
    message: "Application sent successfully."
  };
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
  const resume = formData.get("resume");
  const accountEmail = clean(formData.get("accountEmail"), 160).toLowerCase();

  if (!accountEmail || !isEmail(accountEmail) || !(await accountExists(accountEmail))) {
    return NextResponse.json(
      { ok: false, message: "Please sign in to your Agentech account before submitting this form." },
      { status: 401 }
    );
  }

  if (!(resume instanceof File)) {
    return NextResponse.json({ ok: false, message: "Please upload your resume." }, { status: 400 });
  }

  if (resume.size === 0 || resume.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ ok: false, message: "Please upload a PDF under 5MB." }, { status: 400 });
  }

  const lowerFilename = resume.name.toLowerCase();
  const isPdf = resume.type === "application/pdf" || lowerFilename.endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json({ ok: false, message: "Resume must be a PDF." }, { status: 400 });
  }

  const resumeFilename = sanitizeFilename(resume.name || "resume.pdf");
  const application = buildApplication(formData, resumeFilename);

  if (!application.data) {
    return NextResponse.json({ ok: false, message: application.error }, { status: 400 });
  }

  recentSubmissions.set(clientKey, Date.now());

  const uploadedResume = await uploadSupabaseStorageObject(
    "talent-resumes",
    buildResumeStoragePath(accountEmail, application.data.resumeFilename),
    resume,
    "application/pdf"
  );

  await saveInternshipApplication(accountEmail, application.data, uploadedResume.path);

  const receiverEmail = process.env.APPLICATION_RECEIVER_EMAIL || company.contactEmail;
  const result = await sendWithResend(application.data, receiverEmail, resume);

  return NextResponse.json({ ok: result.ok, message: result.message }, { status: result.status });
}
