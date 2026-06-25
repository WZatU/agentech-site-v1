import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createInvoiceItem } from "@/lib/invoices";
import { getEducationCourseByCode, getEligibleGradesForEducationCourse } from "@/lib/education-courses";
import { formatFullName, formatPersonName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";
import { accountExists } from "@/lib/talent-applications";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { siteUrl } from "@/lib/site-config";
import { supabaseRequest } from "@/lib/supabase-server";

type EducationCoursePayload = {
  courseCode?: string;
  email?: string;
  childId?: number;
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

async function upsertCourse(course: NonNullable<ReturnType<typeof getEducationCourseByCode>>) {
  await supabaseRequest<null>("agentech_course_locations", {
    method: "POST",
    query: "on_conflict=location_code",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      location_code: course.locationCode,
      city: course.city,
      state: course.state,
      location_name: course.locationName,
      address: course.locationAddress || null
    }
  });

  await supabaseRequest<null>("agentech_education_courses", {
    method: "POST",
    query: "on_conflict=course_code",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      course_code: course.courseCode,
      location_code: course.locationCode,
      grade_slug: course.gradeSlug,
      course_name: course.courseName,
      course_title: course.title,
      course_description: course.description,
      flyer_image: course.flyerImage,
      preview_description: course.previewDescription,
      class_time: course.classTime,
      starting_date: course.startingDate,
      age_range: course.ageRange,
      price: course.price,
      active: true
    }
  });
}

async function sendCourseEnrollmentReceipt(
  email: string,
  course: NonNullable<ReturnType<typeof getEducationCourseByCode>>,
  child: EducationChild
) {
  const childName = formatFullName(child.first_name, child.last_name);
  const accountUrl = new URL("/account", siteUrl).toString();
  const logoUrl = new URL("/assets/logo/AGENTECH.png", siteUrl).toString();
  const priceLine = course.price > 0 ? [`Program fee: ${formatUsd(course.price)}`] : [];
  const priceRow = course.price > 0
    ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program fee</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(formatUsd(course.price))}</td>
      </tr>
    `
    : "";

  return sendEmail({
    to: email,
    subject: `Agentech Education enrollment request received: ${course.title}`,
    text: [
      "Dear Parent/Guardian,",
      "",
      `Thank you for signing ${childName} up for ${course.title}. This email confirms that Agentech has received your enrollment request.`,
      "",
      "Enrollment request summary:",
      `Program: ${course.title}`,
      `Student: ${childName}`,
      `Grade: ${child.grade}`,
      `Program dates: ${course.classTime}`,
      `Location: ${course.locationName}`,
      ...priceLine,
      "",
      "Our team will review the request and follow up with any additional program details, payment instructions, or next steps as needed.",
      "Online payment is not accepted at this time. If a program price is finalized later, it will appear in your Agentech account and related invoice communications.",
      "",
      `You can review your request in your Agentech account: ${accountUrl}`,
      "",
      "Thank you,",
      "Agentech Education Team"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 620px;">
        <div style="margin: 0 0 24px;">
          <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="168" style="display: block; max-width: 168px; height: auto;" />
        </div>
        <h1 style="margin: 0 0 14px;">Enrollment request received</h1>
        <p style="margin: 0 0 16px;">Dear Parent/Guardian,</p>
        <p style="margin: 0 0 16px;">Thank you for signing ${escapeHtml(childName)} up for ${escapeHtml(course.title)}. This email confirms that Agentech has received your enrollment request.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 22px 0;">
          <tbody>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(course.title)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Student</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(childName)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Grade</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(child.grade)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Program dates</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(course.classTime)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Location</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${escapeHtml(course.locationName)}</td>
            </tr>
            ${priceRow}
          </tbody>
        </table>
        <p style="margin: 0 0 16px;">Our team will review the request and follow up with any additional program details, payment instructions, or next steps as needed.</p>
        <p style="margin: 0 0 18px;">Online payment is not accepted at this time. If a program price is finalized later, it will appear in your Agentech account and related invoice communications.</p>
        <p style="margin: 0 0 20px;">
          You can review your request in your Agentech account:<br />
          <a href="${escapeHtml(accountUrl)}" style="color: #2563eb; font-weight: 700;">${escapeHtml(accountUrl)}</a>
        </p>
        <p style="margin: 0;">Thank you,<br />Agentech Education Team</p>
      </div>
    `
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as EducationCoursePayload | null;
  const email = normalizeEmail(payload?.email);
  const courseCode = (payload?.courseCode || "").trim().toUpperCase();
  const childId = Number(payload?.childId);
  const course = getEducationCourseByCode(courseCode);

  if (!course) {
    return NextResponse.json({ error: "Choose a valid course." }, { status: 400 });
  }

  if (!isValidEmail(email) || !(await accountExists(email))) {
    return NextResponse.json({ error: "Please sign in before adding this course." }, { status: 401 });
  }

  if (!Number.isInteger(childId) || childId <= 0) {
    return NextResponse.json({ error: "Choose a student before enrolling." }, { status: 400 });
  }

  const children = await supabaseRequest<EducationChild[]>("agentech_children", {
    query: `id=eq.${childId}&parent_email=eq.${encodeURIComponent(email)}&select=id,first_name,last_name,dob,grade&limit=1`
  }).catch(() => []);
  const child = children[0];

  if (!child) {
    return NextResponse.json({ error: "Add at least one student before enrolling in a course." }, { status: 400 });
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

  const existingItems = await supabaseRequest<Array<{ id: number }>>("agentech_invoice_items", {
    query: `email=eq.${encodeURIComponent(email)}&source_type=eq.course&source_id=eq.${encodeURIComponent(course.courseCode)}&child_id=eq.${childId}&paid=eq.false&select=id&limit=1`
  }).catch(() => []);

  if (existingItems.length) {
    return NextResponse.json({
      ok: true,
      message: "This course is already in your unpaid invoice requests."
    });
  }

  await upsertCourse(course);

  await createInvoiceItem({
    email,
    sourceType: "course",
    sourceId: course.courseCode,
    itemName: `${course.title} (${course.courseCode}) for ${formatFullName(child.first_name, child.last_name)}`.trim(),
    amount: course.price,
    childId
  });
  const emailResult = await sendCourseEnrollmentReceipt(email, course, child).catch(() => ({ sent: false }));

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? "Enrollment request added to your account. A confirmation email was sent."
      : "Enrollment request added to your account. Confirmation email is not configured yet."
  });
}
