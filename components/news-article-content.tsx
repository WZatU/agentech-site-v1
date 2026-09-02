"use client";

import { useState } from "react";
import type { NewsEntry, NewsTranslation } from "@/lib/news";

type NewsArticleContentProps = {
  entry: NewsEntry;
};

function getTranslation(entry: NewsEntry, language: "en" | "zh"): NewsTranslation {
  return entry.translations?.[language] || {
    title: entry.title,
    excerpt: entry.excerpt,
    body: entry.body
  };
}

export function NewsArticleContent({ entry }: NewsArticleContentProps) {
  const hasEnglish = Boolean(entry.translations?.en?.body?.length);
  const hasChinese = Boolean(entry.translations?.zh?.body?.length);
  const [language, setLanguage] = useState<"en" | "zh">(hasEnglish ? "en" : "zh");
  const active = getTranslation(entry, language);
  const showToggle = hasEnglish && hasChinese;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 data-news-title className="font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
          {active.title || entry.title}
        </h1>

        {showToggle ? (
          <div data-news-language-group role="group" aria-label="Article language" className="inline-flex rounded-full border border-[#d9e1ea] bg-white p-1 text-sm font-bold shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            {[
              ["en", "English"],
              ["zh", "\u4e2d\u6587"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-news-language
                aria-pressed={language === value}
                onClick={() => setLanguage(value as "en" | "zh")}
                className={`rounded-full px-4 py-2 transition ${
                  language === value
                    ? "bg-[#0b1220] text-white"
                    : "!text-[#0b1220] hover:bg-[#f1f5f9]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p data-news-meta className="mt-5 text-lg font-semibold text-white">{entry.displayDate}</p>
      <p data-news-author className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate">
        {entry.author || "Agentech"}
      </p>

      <div data-news-body className="mt-10 space-y-7 text-lg leading-8 text-[#d8e1ef]">
        {(active.body.length ? active.body : entry.body).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </>
  );
}
