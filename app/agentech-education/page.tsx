import Image from "next/image";
import Link from "next/link";
import { EducationProgramTabs } from "@/components/education-program-tabs";
import { getChildrenEnrolled } from "@/lib/education-counter";
import { educationGradePages } from "@/lib/education-grade-pages";

export default async function AgentechEducationPage() {
  const childrenEnrolled = await getChildrenEnrolled();

  return (
    <div className="education-black min-h-screen bg-white text-black">
      <section className="px-6 py-8 lg:px-8">
       <div className="mx-auto grid max-w-7xl items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Children Enrolled</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{childrenEnrolled}</p>
          </div>

          <div className="flex justify-center">
            <Image
              src="/assets/logo/AGENTECH-education.png"
              alt="Agentech Education"
              width={1000}
              height={247}
              className="h-auto w-full max-w-md"
              priority
            />
          </div>

          <div className="flex justify-start md:justify-end">
            <Link
              href="/login?next=/account-setup"
              className="education-enroll-button rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition"
            >
              Parent Login
            </Link>
          </div>
        </div>
      </section>

      <EducationProgramTabs programs={educationGradePages} />
    </div>
  );
}
