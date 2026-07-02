import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { eaiImmersionCourseCode, getEducationCourseByCode, getEligibleGradesForEducationCourse } from "@/lib/education-courses";
import { eaiPriceSummary, getEaiInterestOption } from "@/lib/eai-immersion-options";
import { formatFullName, formatPersonName } from "@/lib/name-format";
import { accountExists } from "@/lib/talent-applications";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { siteUrl } from "@/lib/site-config";
import { company } from "@/lib/site-data";
import { supabaseRequest } from "@/lib/supabase-server";

type EaiInterestPayload = {
  courseCode?: string;
  email?: string;
  childId?: number;
  optionId?: string;
};

type EducationChild = {
  id: number;
  first_name: string;
  last_name: string;
  dob: string;
  grade: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAgeOnDate(dob: string, date: string) {
  const birthDate = new Date(`${dob}T00:00:00`);
  const targetDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(targetDate.getTime())) {
    return null;
  }

  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(targetDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (targetDate < birthdayThisYear) {
    age -= 1;
  }

  return age;
}

async function sendParentReceipt(email: string, child: EducationChild, option: NonNullable<ReturnType<typeof getEaiInterestOption>>) {
  const childName = formatFullName(child.first_name, child.last_name);
  const programUrl = new URL("/agentech-education/agentech-ff-eai-robotics-future-founder-immersion-program", siteUrl).toString();
  const logoUrl = new URL("/assets/logo/AGENTECH.png", siteUrl).toString();

  return sendEmail({
    to: email,
    subject: "EAI Robotics Future Founder Immersion Program interest received",
    text: [
      "Dear Parent/Guardian,",
      "",
      `Thank you for sharing interest in the EAI Robotics Future Founder Immersion Program for ${childName}.`,
      "",
      "Interest summary:",
      `Student: ${childName}`,
      `Grade: ${child.grade}`,
      `Selected option: ${option.label}`,
      `Program window: ${option.dateLabel}`,
      `Program fee: ${option.priceLabel}`,
      "",
      "Our team will review the interest submission and follow up with availability, final dates, and next steps.",
      "",
      `Program page: ${programUrl}`,
      "",
      "Thank you,",
      "Agentech Education Team"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 620px;">
        <div style="margin: 0 0 24px;">
          <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="168" style="display: block; max-width: 168px; height: auto;" />
        </div>
        <h1 style="margin: 0 0 14px;">Interest received</h1>
        <p style="margin: 0 0 16px;">Dear Parent/Guardian,</p>
        <p style="margin: 0 0 16px;">Thank you for sharing interest in the EAI Robotics Future Founder Immersion Program for ${escapeHtml(childName)}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 22px 0;">
          <tbody>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Student</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(childName)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Grade</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(child.grade)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Selected option</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(option.label)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program window</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(option.dateLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program fee</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(option.priceLabel)}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin: 0 0 18px;">Our team will review the interest submission and follow up with availability, final dates, and next steps.</p>
        <p style="margin: 0 0 20px;">
          Program page:<br />
          <a href="${escapeHtml(programUrl)}" style="color: #2563eb; font-weight: 700;">${escapeHtml(programUrl)}</a>
        </p>
        <p style="margin: 0;">Thank you,<br />Agentech Education Team</p>
      </div>
    `
  });
}

async function sendTeamNotification(email: string, child: EducationChild, option: NonNullable<ReturnType<typeof getEaiInterestOption>>) {
  const childName = formatFullName(child.first_name, child.last_name);
  const receiverEmail = process.env.APPLICATION_RECEIVER_EMAIL || company.contactEmail;

  return sendEmail({
    to: receiverEmail,
    subject: `New EAI program interest: ${option.label}`,
    text: [
      "New EAI Robotics Future Founder Immersion Program interest",
      "",
      `Parent email: ${email}`,
      `Student: ${childName}`,
      `Grade: ${child.grade}`,
      `Selected option: ${option.label}`,
      `Program window: ${option.dateLabel}`,
      `Price: ${option.priceLabel}`,
      `All pricing: ${eaiPriceSummary}`
    ].join("\n")
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as EaiInterestPayload | null;
  const email = normalizeEmail(payload?.email);
  const courseCode = (payload?.courseCode || "").trim().toUpperCase();
  const childId = Number(payload?.childId);
  const option = getEaiInterestOption((payload?.optionId || "").trim());
  const course = getEducationCourseByCode(courseCode);

  if (!course || course.courseCode !== eaiImmersionCourseCode) {
    return NextResponse.json({ error: "Choose a valid EAI program." }, { status: 400 });
  }

  if (!option) {
    return NextResponse.json({ error: "Choose a session option." }, { status: 400 });
  }

  if (!isValidEmail(email) || !(await accountExists(email))) {
    return NextResponse.json({ error: "Please sign in before submitting interest." }, { status: 401 });
  }

  if (!Number.isInteger(childId) || childId <= 0) {
    return NextResponse.json({ error: "Choose a student before submitting interest." }, { status: 400 });
  }

  const children = await supabaseRequest<EducationChild[]>("agentech_children", {
    query: `id=eq.${childId}&parent_email=eq.${encodeURIComponent(email)}&select=id,first_name,last_name,dob,grade&limit=1`
  }).catch(() => []);
  const child = children[0];

  if (!child) {
    return NextResponse.json({ error: "Add at least one student before submitting interest." }, { status: 400 });
  }

  const eligibleGrades = getEligibleGradesForEducationCourse(course);
  if (eligibleGrades.length && !eligibleGrades.includes(child.grade)) {
    return NextResponse.json(
      {
        error: `${formatPersonName(child.first_name)} is not eligible for ${course.title}. This program is for ${course.ageRange}.`
      },
      { status: 400 }
    );
  }

  const childAge = getAgeOnDate(child.dob, course.startingDate);
  if (childAge === null || childAge < course.minAge || childAge > course.maxAge) {
    return NextResponse.json(
      {
        error: `${formatPersonName(child.first_name)} is not in the age range for ${course.title}. ${course.ageRange} is for ages ${course.minAge}-${course.maxAge}.`
      },
      { status: 400 }
    );
  }

  const childName = formatFullName(child.first_name, child.last_name);
  const notes = JSON.stringify({
    program: course.title,
    courseCode: course.courseCode,
    optionId: option.id,
    optionLabel: option.label,
    optionDate: option.dateLabel,
    optionPrice: option.priceLabel,
    pricing: eaiPriceSummary,
    childId,
    studentName: childName,
    studentGrade: child.grade,
    parentEmail: email,
    submittedAt: new Date().toISOString()
  });

  await supabaseRequest("agentech_field_interest_leads", {
    method: "POST",
    body: {
      email,
      interest_area: `EAI Robotics - ${option.label}`,
      notes,
      source: "eai_immersion_page",
      status: "new"
    },
    prefer: "return=minimal"
  });

  const [parentEmailResult, teamEmailResult] = await Promise.all([
    sendParentReceipt(email, child, option).catch(() => ({ sent: false })),
    sendTeamNotification(email, child, option).catch(() => ({ sent: false }))
  ]);

  return NextResponse.json({
    ok: true,
    emailSent: Boolean(parentEmailResult.sent || teamEmailResult.sent),
    message: parentEmailResult.sent
      ? "Interest submitted. A confirmation email was sent."
      : "Interest submitted. Our team will follow up with next steps."
  });
}
