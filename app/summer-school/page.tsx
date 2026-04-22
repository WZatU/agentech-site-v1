import { SummerSchoolForm } from "@/components/summer-school-form";

export default function SummerSchoolPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">SUMMER SCHOOL</p>
        <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.14em] text-white md:text-6xl">
          APPLY FOR SUMMER SCHOOL
        </h1>
        <p className="mt-5 text-base leading-8 text-slate md:text-lg">
          For high school students / 面向高中学生
        </p>
      </div>

      <SummerSchoolForm />
    </section>
  );
}
