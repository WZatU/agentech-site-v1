"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getAccountSession } from "@/lib/account-session";

type EducationCourseButtonProps = {
  courseCode: string;
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export function EducationCourseButton({ courseCode }: EducationCourseButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function addCourse() {
    const session = getAccountSession();

    if (!session?.email) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/education-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCode,
        email: session.email
      })
    });
    const result = (await response.json()) as ApiResult;

    if (!response.ok || !result.ok) {
      setStatus("error");
      setMessage(result.error || "Unable to add course.");
      return;
    }

    setStatus("success");
    setMessage(result.message || "Course added. Invoice email requested.");
  }

  return (
    <div>
      <button
        type="button"
        onClick={addCourse}
        disabled={status === "saving"}
        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {status === "saving" ? "Adding..." : "Add Course to Cart"}
      </button>
      {message ? (
        <p className={`mt-3 text-sm font-semibold ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
