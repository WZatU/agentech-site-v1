import Image from "next/image";
import Link from "next/link";
import { SummerSchoolForm } from "@/components/summer-school-form";

export default function AiRoboticsClubApplyPage() {
  return (
    <section className="min-h-screen bg-white px-6 py-16 text-slate-950 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/ai-robotics-club"
          className="talent-back-button mb-10 inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold transition"
        >
          Back to AI & Robotics Club
        </Link>

        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-black">AI & Robotics Club</p>
            <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.12em] text-black md:text-6xl">
              Apply for AI & Robotics Club
            </h1>
            <p className="mt-5 text-base leading-8 text-black md:text-lg">
              For motivated students ready to build AI projects, robotics systems, and future-ready engineering portfolios.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <Image
              src="/assets/talents/club/club-1.png"
              alt="AI and Robotics Club"
              width={1400}
              height={900}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>

        <SummerSchoolForm />
      </div>
    </section>
  );
}
