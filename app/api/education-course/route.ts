import { NextResponse } from "next/server";
import { createInvoiceItem } from "@/lib/invoices";
import { getEducationCourseByCode } from "@/lib/education-courses";
import { formatFullName, formatPersonName } from "@/lib/name-format";
import { accountExists } from "@/lib/talent-applications";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { supabaseRequest } from "@/lib/supabase-server";

type EducationCoursePayload = {
  courseCode?: string;
  email?: string;
  childId?: number;
};

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

  const children = await supabaseRequest<Array<{ id: number; first_name: string; last_name: string; dob: string; grade: string }>>("agentech_children", {
    query: `id=eq.${childId}&parent_email=eq.${encodeURIComponent(email)}&select=id,first_name,last_name,dob,grade&limit=1`
  }).catch(() => []);
  const child = children[0];

  if (!child) {
    return NextResponse.json({ error: "Add at least one student before enrolling in a course." }, { status: 400 });
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

  return NextResponse.json({
    ok: true,
    message: "Course added to your account. Confirm your request from your account page when ready."
  });
}
