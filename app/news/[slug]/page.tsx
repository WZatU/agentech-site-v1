import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsSlideshow } from "@/components/news-slideshow";
import { getNewsEntry, newsEntries } from "@/lib/news";

type NewsArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return newsEntries.map((entry) => ({
    slug: entry.slug
  }));
}

export async function generateMetadata({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const entry = getNewsEntry(slug);

  if (!entry) {
    return {};
  }

  return {
    title: entry.title,
    description: entry.excerpt,
    openGraph: {
      title: entry.title,
      description: entry.excerpt,
      images: [entry.coverImage]
    }
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const entry = getNewsEntry(slug);

  if (!entry) {
    notFound();
  }

  return (
    <article>
      <NewsSlideshow images={entry.images} title={entry.title} />

      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
        <Link
          href="/news"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-slate transition hover:text-white"
        >
          Back to News
        </Link>
        <h1 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-5xl">
          {entry.title}
        </h1>
        <p className="mt-5 text-lg font-semibold text-white">{entry.displayDate}</p>

        <div className="mt-10 space-y-7 text-lg leading-8 text-[#d8e1ef]">
          {entry.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
