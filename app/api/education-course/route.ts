import { NextResponse } from "next/server";
import { createInvoiceItem, sendUnpaidBalanceInvoice } from "@/lib/invoices";
import { getEducationCourseByCode } from "@/lib/education-courses";
import { accountExists } from "@/lib/talent-applications";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { supabaseRequest } from "@/lib/supabase-server";

type EducationCoursePayload = {
  courseCode?: string;
  email?: string;
};

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
  const course = getEducationCourseByCode(courseCode);

  if (!course) {
    return NextResponse.json({ error: "Choose a valid course." }, { status: 400 });
  }

  if (!isValidEmail(email) || !(await accountExists(email))) {
    return NextResponse.json({ error: "Please sign in before adding this course." }, { status: 401 });
  }

  const existingItems = await supabaseRequest<Array<{ id: number }>>("agentech_invoice_items", {
    query: `email=eq.${encodeURIComponent(email)}&source_type=eq.course&source_id=eq.${encodeURIComponent(course.courseCode)}&paid=eq.false&select=id&limit=1`
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
    itemName: `${course.title} (${course.courseCode})`,
    amount: course.price
  });

  await sendUnpaidBalanceInvoice(email, `COURSE-${course.courseCode}-${Date.now().toString().slice(-6)}`).catch(() => null);

  return NextResponse.json({
    ok: true,
    message: "Course added. Agentech emailed your current unpaid balance."
  });
}
