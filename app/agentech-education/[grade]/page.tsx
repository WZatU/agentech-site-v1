import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { educationGradePages, getEducationGradePage } from "@/lib/education-grade-pages";

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
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              {page.subtitle}
            </p>
            <Link
              href="/login?next=/account-setup"
              className="mt-8 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Parent Login
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl bg-slate-50 shadow-[0_18px_45px_rgba(15,23,42,0.1)] ring-1 ring-slate-200">
            <Image
              src={page.flyerImage}
              alt={`${page.grade} class flyer`}
              width={1200}
              height={1600}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </section>
    </main>
  );
}
