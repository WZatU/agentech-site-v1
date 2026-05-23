import Image from "next/image";
import Link from "next/link";
import { newsEntries } from "@/lib/news";

export default function NewsPage() {
  return (
    <section className="border-b border-[#d8dde5] bg-[#eeeeee]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#64748b]">Agentech Updates</p>
          <h1 className="mt-4 text-4xl font-semibold uppercase tracking-[0.16em] text-[#0b1220] md:text-6xl">
            News
          </h1>
        </div>

        <div className="space-y-5">
          {newsEntries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/news/${entry.slug}`}
              className="group grid min-h-[150px] grid-cols-[1fr_34%] gap-5 rounded-[8px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:min-h-[170px] sm:gap-8 sm:p-7"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-[#4666a1]">{entry.author || "Agentech"}</span>
                  <span className="text-[#a3aab5]">{entry.displayDate}</span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-xl font-semibold leading-snug text-[#111827] sm:text-2xl">
                  {entry.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4b5563] sm:text-base">
                  {entry.excerpt}
                </p>
                <p className="mt-4 text-sm font-semibold text-[#9ca3af]">
                  Read more
                </p>
              </div>

              <div className="relative self-center overflow-hidden rounded-[5px] bg-[#dbe3ee] max-sm:aspect-[4/3] sm:aspect-[16/9]">
                <Image
                  src={entry.coverImage}
                  alt={entry.title}
                  fill
                  sizes="(min-width: 768px) 320px, 34vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  priority
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
