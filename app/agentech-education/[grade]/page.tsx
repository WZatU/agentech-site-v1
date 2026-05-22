import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EducationCourseButton } from "@/components/education-course-button";
import { getEducationCoursesByGrade } from "@/lib/education-courses";
import { educationGradePages, getEducationGradePage } from "@/lib/education-grade-pages";
import { formatUsd } from "@/lib/pricing";

type GradePageProps = {
  params: Promise<{
    grade: string;
  }>;
};

export function generateStaticParams() {
  return educationGradePages.map((page) => ({
    grade: page.slug
  }));
}

export async function generateMetadata({ params }: GradePageProps) {
  const { grade } = await params;
  const page = getEducationGradePage(grade);

  if (!page) {
    return {};
  }

  return {
    title: `${page.grade} | Agentech Education`,
    description: page.subtitle
  };
}

export default async function EducationGradePage({ params }: GradePageProps) {
  const { grade } = await params;
  const page = getEducationGradePage(grade);

  if (!page) {
    notFound();
  }

  const courses = getEducationCoursesByGrade(page.slug);
  const heroImage = page.slug === "6-8" ? page.image : page.flyerImage;

  return (
    <main className="education-black min-h-screen bg-white text-black">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <Link href="/agentech-education" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
          Back to Agentech Education
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{page.grade}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {page.title}
            </h1>
            <div className="mt-5 max-w-2xl space-y-5 text-base leading-8 text-slate-700 md:text-lg">
              {page.subtitle.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?next=/account-setup"
                className="education-enroll-button inline-flex rounded-full px-6 py-3 text-sm font-semibold transition"
              >
                Enroll Now
              </Link>
              <Link
                href="/login?next=/account-setup"
                className="education-enroll-button inline-flex rounded-full px-6 py-3 text-sm font-semibold transition"
              >
                Parent Login
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-slate-50 shadow-[0_18px_45px_rgba(15,23,42,0.1)] ring-1 ring-slate-200">
            <Image
              src={heroImage}
              alt={`${page.grade} class flyer`}
              width={1200}
              height={1600}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>

        {courses.length ? (
          <div className="mt-14 border-t border-slate-200 pt-10">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Available Courses</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Course Flyers</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {courses.map((course) => (
                <article key={course.courseCode} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
                  <Link href={`/agentech-education/${page.slug}/${course.slug}`} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <Image
                        src={course.flyerImage}
                        alt={`${course.title} flyer`}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">{course.courseCode}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-950">{course.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{course.previewDescription}</p>
                        <p className="mt-4 text-xl font-semibold text-slate-950">{formatUsd(course.price)}</p>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950">View Flyer</p>
                      </div>
                      <Link
                        href={`/login?next=${encodeURIComponent(
                          course.locationCode === "WALNUT" ? `/account-setup?campus=walnut&course=${course.courseCode}` : "/account-setup"
                        )}`}
                        className="education-enroll-button inline-flex justify-center whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold transition"
                      >
                        Enroll Now
                      </Link>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
