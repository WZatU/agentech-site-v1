import Image from "next/image";
import Link from "next/link";
import { newsEntries } from "@/lib/news";

export default function NewsPage() {
  return (
    <section className="border-b border-[#363d45]/70">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Agentech Updates</p>
          <h1 className="mt-4 text-4xl font-semibold uppercase tracking-[0.16em] text-white md:text-6xl">
            News
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {newsEntries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/news/${entry.slug}`}
              className="group overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.03] transition hover:border-accent/60 hover:bg-white/[0.06]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <Image
                  src={entry.coverImage}
                  alt={entry.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  priority
                />
              </div>
              <div className="p-6">
                <p className="text-sm font-semibold text-accent">{entry.displayDate}</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">{entry.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate">{entry.excerpt}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                  Read News
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
