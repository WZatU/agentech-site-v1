import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsArticleContent } from "@/components/news-article-content";
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
      <NewsSlideshow images={entry.images} media={entry.media} title={entry.title} />

      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
        <Link
          href="/news"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-slate transition hover:text-white"
        >
          Back to News
        </Link>
        <div className="mt-6">
          <NewsArticleContent entry={entry} />
        </div>
      </div>
    </article>
  );
}
