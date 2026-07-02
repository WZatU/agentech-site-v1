"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { eaiImmersionCourseCode, getEducationCourseByCode, getEligibleGradesForEducationCourse } from "@/lib/education-courses";
import { eaiInterestOptions, eaiPriceSummary, type EaiInterestOptionId } from "@/lib/eai-immersion-options";
import { formatFullName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  emailSent?: boolean;
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
  const [selectedEaiOptionId, setSelectedEaiOptionId] = useState<EaiInterestOptionId>("session-1");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "success" | "error">("loading");
  const [message, setMessage] = useState("Preparing enrollment...");
  const isEaiInterest = course?.courseCode === eaiImmersionCourseCode;

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
      const eligibleGrades = getEligibleGradesForEducationCourse(course);
      const eligibleChildren = eligibleGrades.length
        ? savedChildren.filter((child) => eligibleGrades.includes(child.grade))
        : savedChildren;

      if (!savedChildren.length) {
        router.replace(isEaiInterest ? `/account-setup?course=${course.courseCode}` : `/account-setup?campus=walnut&course=${course.courseCode}`);
        return;
      }

      if (!eligibleChildren.length) {
        setChildren([]);
        setSelectedChildId("");
        setStatus("error");
        setMessage(`You don't have a child eligible for this program. This program is for ${course.ageRange}.`);
        return;
      }

      setChildren(eligibleChildren);
      setSelectedChildId(String(eligibleChildren[0].id));
      setStatus("ready");
      setMessage(isEaiInterest ? "Choose a student and session option." : "Choose the student you want to enroll.");
    }

    loadEnrollment();
  }, [course, isEaiInterest, router]);

  async function submitEnrollment() {
    if (!course || !email || !selectedChildId) {
      setStatus("error");
      setMessage(isEaiInterest ? "Choose a student before submitting interest." : "Choose a student before enrolling.");
      return;
    }

    setStatus("saving");
    setMessage(isEaiInterest ? "Submitting interest..." : "Adding course to unpaid balance...");

    if (isEaiInterest) {
      const response = await fetch("/api/eai-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: course.courseCode,
          email,
          childId: Number(selectedChildId),
          optionId: selectedEaiOptionId
        })
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.error || "Unable to submit interest for this program.");
        return;
      }

      setStatus("success");
      setMessage(result.message || "Interest submitted. Our team will follow up with next steps.");
      return;
    }

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
    setMessage(result.message || "Enrollment request added to your account. Taking you to your account...");
    router.replace("/account");
  }

  return (
    <main className="education-black min-h-screen bg-white px-6 py-16 text-black lg:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_55px_rgba(15,23,42,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Agentech Education</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{isEaiInterest ? "Apply Interest" : "Enrollment"}</h1>
        {course ? (
          <p className="mt-3 text-base leading-7 text-slate-600">
            {course.title} ({course.courseCode})
            {isEaiInterest ? ` - ${eaiPriceSummary}` : course.price > 0 ? ` - ${formatUsd(course.price)}` : ""}
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
            {isEaiInterest ? (
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Session Preference</legend>
                <div className="grid gap-3">
                  {eaiInterestOptions.map((option) => {
                    const selected = option.id === selectedEaiOptionId;

                    return (
                      <label
                        key={option.id}
                        className={`block rounded-2xl border p-4 transition ${
                          selected ? "border-slate-950 bg-slate-950 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]" : "border-slate-200 bg-white text-slate-950 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="eai-session-option"
                          value={option.id}
                          checked={selected}
                          onChange={() => setSelectedEaiOptionId(option.id)}
                          className="sr-only"
                        />
                        <span className="flex items-start justify-between gap-4">
                          <span>
                            <span className="block text-sm font-semibold">{option.label}</span>
                            <span className={`mt-1 block text-xs leading-5 ${selected ? "text-white/70" : "text-slate-500"}`}>{option.dateLabel}</span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold">{option.priceLabel}</span>
                        </span>
                        <span className={`mt-3 block text-sm leading-6 ${selected ? "text-white/78" : "text-slate-600"}`}>{option.description}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            <button
              type="button"
              onClick={submitEnrollment}
              disabled={status === "saving"}
              className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white"
            >
              {status === "saving" ? (isEaiInterest ? "Submitting..." : "Enrolling...") : isEaiInterest ? "Submit Interest" : "Add to Unpaid Balance"}
            </button>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/agentech-education" className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition">
            Back to Education
          </Link>
          {status === "success" && !isEaiInterest ? (
            <Link href="/account" className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition">
              View Account
            </Link>
          ) : null}
          {status === "error" && course ? (
            <Link href={`/account-setup?course=${encodeURIComponent(course.courseCode)}`} className="education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition">
              Edit Students
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
