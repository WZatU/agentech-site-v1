"use client";

import { useState } from "react";

type EducationCourseButtonProps = {
  courseCode: string;
  className?: string;
};

const learningTreeEnrollmentUrl = "https://www.learningtrees.us/ai-summer-camp";

export function EducationCourseButton({ className }: EducationCourseButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving">("idle");

  async function addCourse() {
    setStatus("saving");
    window.location.href = learningTreeEnrollmentUrl;
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
        {status === "saving" ? "Enrolling..." : "Enroll Now"}
      </button>
    </div>
  );
}
