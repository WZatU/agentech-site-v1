import { InternshipForm } from "@/components/internship-form";

export default function CareerInternPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">INTERNSHIP</p>
        <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.14em] text-white md:text-6xl">
          APPLY FOR INTERNSHIP
        </h1>
        <p className="mt-5 text-base leading-8 text-slate md:text-lg">
          For university students and beyond / 面向大学及以上申请者
        </p>
      </div>

      <InternshipForm />
    </section>
  );
}
