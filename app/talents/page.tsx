import Image from "next/image";
import Link from "next/link";
import { company } from "@/lib/site-data";

const talentPrograms = [
  {
    title: "Tech Education",
    audience: "Middle School + High School",
    href: "/tech-education",
    image: "/assets/programs/tech-education.png",
    alt: "Students building robotics projects in Agentech tech education"
  },
  {
    title: "Summer School",
    audience: "High School",
    href: "/summer-school",
    image: "/assets/programs/summer-school.png",
    alt: "Students collaborating on robotics projects during Agentech summer school"
  },
  {
    title: "Internship",
    audience: "University + Beyond",
    href: "/career-intern",
    image: "/assets/programs/internship.png",
    alt: "Agentech internship team collaborating on embodied robotics systems"
  }
] as const;

export default function TalentsPage() {
  return (
    <>
      <section className="border-b border-[#363d45]/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <h1 className="text-4xl font-semibold uppercase tracking-[0.16em] text-white md:text-6xl">
            Agentech Talents
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

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {talentPrograms.map((program) => (
            <Link
              key={program.href}
              href={program.href}
              className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition hover:border-white/24 hover:bg-white"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={program.image}
                  alt={program.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/8 to-transparent transition group-hover:from-black/20" />
              </div>
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate transition group-hover:text-black/55">
                  {program.audience}
                </p>
                <h3 className="mt-3 text-2xl font-semibold uppercase tracking-[0.08em] text-white transition group-hover:text-black">
                  {program.title}
                </h3>
                <div className="mt-6 inline-flex rounded-full border border-white/16 px-5 py-2 text-sm font-medium text-white transition group-hover:border-black/20 group-hover:text-black">
                  Open Form
                </div>
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
