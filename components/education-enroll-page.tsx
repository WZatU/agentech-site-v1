"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { getEducationCourseByCode } from "@/lib/education-courses";

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export function EducationEnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseCode = (searchParams.get("course") || "").toUpperCase();
  const course = useMemo(() => getEducationCourseByCode(courseCode), [courseCode]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Preparing enrollment...");

  useEffect(() => {
    async function enroll() {
      if (!course) {
        setStatus("error");
        setMessage("Choose a valid course before enrolling.");
        return;
      }

      const session = getAccountSession();
      if (!session?.email) {
        router.replace(`/login?next=${encodeURIComponent(`/enroll?course=${course.courseCode}`)}`);
        return;
      }

      const response = await fetch("/api/education-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: course.courseCode,
          email: session.email
        })
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.error || "Unable to enroll in this course.");
        return;
      }

      setStatus("success");
      setMessage(result.message || "Course added. Agentech emailed your current unpaid balance.");
    }

    enroll();
  }, [course, router]);

  return (
    <main className="education-black min-h-screen bg-white px-6 py-16 text-black lg:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_55px_rgba(15,23,42,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Agentech Education</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Enrollment</h1>
        {course ? (
          <p className="mt-3 text-base leading-7 text-slate-600">
            {course.title} ({course.courseCode}) - ${course.price}
          </p>
        ) : null}
        <p className={`mt-6 text-sm font-semibold ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {message}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/agentech-education" className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition">
            Back to Education
          </Link>
          {status === "success" ? (
            <Link href="/account" className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition">
              View Account
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
