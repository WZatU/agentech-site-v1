"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { getEducationCourseByCode } from "@/lib/education-courses";
import { formatFullName } from "@/lib/name-format";

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
};

type AccountChild = {
  id: number;
  first_name: string;
  last_name: string;
  grade: string;
};

type AccountResult = {
  children?: AccountChild[];
  error?: string;
};

export function EducationEnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseCode = (searchParams.get("course") || "").toUpperCase();
  const course = useMemo(() => getEducationCourseByCode(courseCode), [courseCode]);
  const [email, setEmail] = useState("");
  const [children, setChildren] = useState<AccountChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "success" | "error">("loading");
  const [message, setMessage] = useState("Preparing enrollment...");

  useEffect(() => {
    async function loadEnrollment() {
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

      setEmail(session.email);
      const response = await fetch(`/api/account?email=${encodeURIComponent(session.email)}`);
      const result = (await response.json()) as AccountResult;
      const savedChildren = result.children || [];

      if (!savedChildren.length) {
        router.replace(`/account-setup?campus=walnut&course=${course.courseCode}`);
        return;
      }

      setChildren(savedChildren);
      setSelectedChildId(String(savedChildren[0].id));
      setStatus("ready");
      setMessage("Choose the student you want to enroll.");
    }

    loadEnrollment();
  }, [course, router]);

  async function submitEnrollment() {
    if (!course || !email || !selectedChildId) {
      setStatus("error");
      setMessage("Choose a student before enrolling.");
      return;
    }

    setStatus("saving");
    setMessage("Adding course to unpaid balance...");

      const response = await fetch("/api/education-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: course.courseCode,
        email,
        childId: Number(selectedChildId)
        })
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.error || "Unable to enroll in this course.");
        return;
      }

      setStatus("success");
      setMessage("Enrollment added to your request cart. Taking you to your account...");
      router.replace("/account");
  }

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
        {status === "ready" || status === "saving" ? (
          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Student</span>
              <select
                value={selectedChildId}
                onChange={(event) => setSelectedChildId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {formatFullName(child.first_name, child.last_name)} - {child.grade}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={submitEnrollment}
              disabled={status === "saving"}
              className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white"
            >
              {status === "saving" ? "Enrolling..." : "Add to Unpaid Balance"}
            </button>
          </div>
        ) : null}
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
