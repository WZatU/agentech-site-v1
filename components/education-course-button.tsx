"use client";

import { useState } from "react";
import { eaiImmersionCourseCode } from "@/lib/education-courses";

type EducationCourseButtonProps = {
  courseCode: string;
  className?: string;
};

export function EducationCourseButton({ courseCode, className }: EducationCourseButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const isEaiInterest = courseCode === eaiImmersionCourseCode;

  function addCourse() {
    setStatus("saving");
    window.location.href = `/enroll?course=${encodeURIComponent(courseCode)}`;
  }

  return (
    <div>
      <button
        type="button"
        onClick={addCourse}
        disabled={status === "saving"}
        className={
          className ||
          "education-enroll-button rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white"
        }
      >
        {status === "saving" ? (isEaiInterest ? "Opening..." : "Enrolling...") : isEaiInterest ? "Apply Interest" : "Enroll Now"}
      </button>
    </div>
  );
}
