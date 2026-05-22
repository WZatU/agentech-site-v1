import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EducationCourseButton } from "@/components/education-course-button";
import { educationGradePages, getEducationGradePage } from "@/lib/education-grade-pages";
import { educationCourses, getEducationCourse } from "@/lib/education-courses";

type CoursePageProps = {
  params: Promise<{
    grade: string;
    course: string;
  }>;
};

export function generateStaticParams() {
  return educationCourses.map((course) => ({
    grade: course.gradeSlug,
    course: course.slug
  }));
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { grade, course } = await params;
  const courseData = getEducationCourse(grade, course);

  if (!courseData) {
    return {};
  }

  return {
    title: `${courseData.title} | Agentech Education`,
    description: courseData.description
  };
}

export default async function EducationCoursePage({ params }: CoursePageProps) {
  const { grade, course } = await params;
  const gradePage = getEducationGradePage(grade);
  const courseData = getEducationCourse(grade, course);

  if (!gradePage || !courseData) {
    notFound();
  }

  return (
    <main className="education-black min-h-screen bg-white text-black">
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/agentech-education/${gradePage.slug}`} className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
            Back to {gradePage.grade}
          </Link>
          <EducationCourseButton courseCode={courseData.courseCode} />
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{courseData.courseCode}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">{courseData.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{courseData.description}</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
          <Image
            src={courseData.flyerImage}
            alt={`${courseData.title} flyer`}
            width={1600}
            height={2200}
            className="h-auto w-full"
            priority
          />
        </div>
      </section>
    </main>
  );
}
