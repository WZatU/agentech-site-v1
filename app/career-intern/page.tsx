import Image from "next/image";
import Link from "next/link";
import { InternshipForm } from "@/components/internship-form";

export default function CareerInternPage() {
  return (
    <section className="min-h-screen bg-white px-6 py-16 text-slate-950 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/talents"
          className="talent-back-button mb-10 inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold transition"
        >
          Back to Agentech Talents
        </Link>

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.24em] !text-black">INTERNSHIP</p>
          <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.14em] !text-black md:text-6xl">
            APPLY FOR INTERNSHIP
          </h1>
          <p className="mt-5 text-base leading-8 !text-black md:text-lg">
            For university students and beyond
          </p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[24px] shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
          <Image
            src="/assets/programs/internship.png"
            alt="Agentech internship team collaborating on embodied robotics systems"
            width={1536}
            height={1024}
            priority
            className="h-[260px] w-full object-cover object-center sm:h-[360px] lg:h-[520px]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />
        </div>

        <InternshipForm />

        <div className="mt-8">
          <Link
            href="/talents"
            className="talent-back-button inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          >
            Back to Agentech Talents
          </Link>
        </div>
      </div>
    </section>
  );
}
