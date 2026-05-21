import Image from "next/image";
import Link from "next/link";
import { getChildrenEnrolled } from "@/lib/education-counter";

export default async function AgentechEducationPage() {
  const childrenEnrolled = await getChildrenEnrolled();

  return (
    <div className="min-h-screen bg-white text-black">
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
              href="/login"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Parent Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="min-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Course Flyer</p>
          </article>
          <article className="min-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Program Advertisement</p>
          </article>
          <article className="min-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Parent Information</p>
          </article>
        </div>
      </section>
    </div>
  );
}
