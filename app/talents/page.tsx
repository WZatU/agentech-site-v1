import Image from "next/image";
import Link from "next/link";
import { company } from "@/lib/site-data";

const talentPrograms = [
  {
    title: "Workshop",
    audience: "Middle School + High School",
    href: "/tech-education",
    image: "/assets/programs/tech-education.png",
    alt: "Students building robotics projects in Agentech workshop"
  },
  {
    title: "AI & Robotics Club",
    audience: "High School",
    href: "/summer-school",
    image: "/assets/programs/summer-school.png",
    alt: "Students collaborating in the Agentech AI and Robotics Club"
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
    <div className="min-h-screen bg-white text-black">
      <section className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl justify-center px-6 py-14 lg:px-8 lg:py-20">
          <Image
            src="/assets/logo/AGENTECH-talents.png"
            alt="Agentech Talents"
            width={900}
            height={180}
            priority
            className="h-auto w-[min(78vw,520px)] object-contain sm:w-[min(68vw,640px)] lg:w-[min(52vw,760px)]"
          />
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/20 to-transparent" />
        </div>

        <div className="mx-auto mt-14 max-w-5xl text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Talent Vision</p>
          <h2 className="mt-5 text-3xl font-semibold uppercase tracking-[0.16em] text-slate-950 md:text-5xl">
            START EARLY. BUILD FOR REAL.
          </h2>
        </div>

        <div className="mt-14">
          <div className="mx-auto grid max-w-[420px] gap-5 lg:max-w-none lg:grid-cols-3">
          {talentPrograms.map((program) => (
            <Link
              key={program.href}
              href={program.href}
              className="group w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14)]"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={program.image}
                  alt={program.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition group-hover:from-black/10" />
              </div>
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {program.audience}
                </p>
                <h3 className="mt-3 text-2xl font-semibold uppercase tracking-[0.08em] text-slate-950">
                  {program.title}
                </h3>
                <div className="talent-open-form-button mt-6 inline-flex rounded-full border px-5 py-2 text-sm font-medium transition">
                  Open Form
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <a
            href={`mailto:${company.contactEmail}`}
            className="mt-8 inline-flex rounded-full border border-slate-950 px-8 py-3.5 text-base font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            {company.contactEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
