import Image from "next/image";
import { TechEducationForm } from "@/components/tech-education-form";

export default function TechEducationPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">TECH EDUCATION</p>
        <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.14em] text-white md:text-6xl">
          APPLY FOR TECH EDUCATION
        </h1>
        <p className="mt-5 text-base leading-8 text-slate md:text-lg">
          For middle school and high school students / 面向初中和高中学生
        </p>
      </div>

      <div className="relative mt-12 overflow-hidden rounded-[24px]">
        <Image
          src="/assets/programs/tech-education.png"
          alt="Students building robotics projects in Agentech tech education"
          width={1536}
          height={1024}
          priority
          className="h-[260px] w-full object-cover object-center sm:h-[360px] lg:h-[520px]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <TechEducationForm />
    </section>
  );
}
