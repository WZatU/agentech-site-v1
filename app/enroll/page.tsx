import { Suspense } from "react";
import { EducationEnrollPage } from "@/components/education-enroll-page";

export default function EnrollPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white p-8 text-black">Loading...</main>}>
      <EducationEnrollPage />
    </Suspense>
  );
}
