import Image from "next/image";
import Link from "next/link";
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
              href="/login"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Parent Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
          <div className="flex min-w-max gap-4 lg:grid lg:min-w-0 lg:grid-cols-4 lg:gap-5">
            {educationGradePages.map((advertisement) => (
              <Link
                key={advertisement.slug}
                href={`/agentech-education/${advertisement.slug}`}
                className="w-[74vw] max-w-[360px] shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 lg:w-auto lg:max-w-none"
              >
                <div className="relative aspect-[3/4] w-full bg-slate-50">
                  <Image
                    src={advertisement.image}
                    alt={`${advertisement.grade} class advertisement`}
                    fill
                    sizes="(min-width: 1024px) 25vw, 74vw"
                    className="object-cover"
                  />
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-950">{advertisement.grade}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
