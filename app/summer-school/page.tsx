import Image from "next/image";
import { SummerSchoolForm } from "@/components/summer-school-form";

export default function SummerSchoolPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">SUMMER SCHOOL</p>
        <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.14em] text-white md:text-6xl">
          APPLY FOR SUMMER SCHOOL
        </h1>
        <p className="mt-5 text-base leading-8 text-slate md:text-lg">
          For high school students / 面向高中学生
        </p>
      </div>

      <div className="relative mt-12 overflow-hidden rounded-[24px]">
        <Image
          src="/assets/programs/summer-school.png"
          alt="Students collaborating on robotics projects during Agentech summer school"
          width={1536}
          height={1024}
          priority
          className="h-[260px] w-full object-cover object-center sm:h-[360px] lg:h-[520px]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <SummerSchoolForm />
    </section>
  );
}
