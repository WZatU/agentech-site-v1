"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EducationCourseButtonProps = {
  courseCode: string;
  className?: string;
};

export function EducationCourseButton({ courseCode, className }: EducationCourseButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving">("idle");

  async function addCourse() {
    setStatus("saving");
    router.push(`/enroll?course=${courseCode}`);
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
