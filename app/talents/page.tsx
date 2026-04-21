import Link from "next/link";
import Image from "next/image";
import { company } from "@/lib/site-data";

const talentPathways = [
  {
    title: "TECH EDUCATION",
    audience: "MIDDLE SCHOOL + HIGH SCHOOL",
    href: "/tech-education"
  },
  {
    title: "SUMMER SCHOOL",
    audience: "HIGH SCHOOL",
    href: "/summer-school"
  },
  {
    title: "INTERNSHIP",
    audience: "UNIVERSITY + BEYOND",
    href: "/career-intern"
  }
] as const;

export default function TalentsPage() {
  return (
    <>
      <section className="border-b border-[#363d45]/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <h1 className="text-4xl font-semibold uppercase tracking-[0.16em] text-white md:text-6xl">
            TALENTS
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-[24px]">
          <Image
            src="/assets/agents/talents-page.png"
            alt="Agentech team"
            width={2400}
            height={1400}
            className="h-auto w-full"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="mx-auto mt-14 max-w-5xl text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-slate">Talent Vision</p>
          <h2 className="mt-5 text-3xl font-semibold uppercase tracking-[0.16em] text-white md:text-5xl">
            START EARLY. BUILD FOR REAL.
          </h2>
        </div>

        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4">
          {talentPathways.map((pathway) => (
            <Link
              key={pathway.href}
              href={pathway.href}
              className="group rounded-[28px] border border-white/10 bg-white/[0.03] px-8 py-7 text-left transition hover:border-white/22 hover:bg-white hover:text-black"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
                <h3 className="text-2xl font-semibold uppercase tracking-[0.08em] text-white transition group-hover:text-black md:text-[2rem]">
                  {pathway.title}
                </h3>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate transition group-hover:text-black/55 md:text-right">
                  {pathway.audience}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <a
            href={`mailto:${company.contactEmail}`}
            className="mt-8 inline-flex rounded-full border border-white/16 px-8 py-3.5 text-base font-medium text-white transition hover:bg-white/8"
          >
            {company.contactEmail}
          </a>
        </div>
      </section>
    </>
  );
}
