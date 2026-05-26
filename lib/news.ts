import entries from "@/data/news-entries.json";

export type NewsEntry = {
  slug: string;
  title: string;
  date: string;
  displayDate: string;
  author?: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  videos?: string[];
  media?: NewsMedia[];
  body: string[];
  visibility?: "public" | "company" | "private";
  translations?: {
    en?: NewsTranslation;
    zh?: NewsTranslation;
  };
};

export type NewsMedia = {
  type: "image" | "video";
  src: string;
};

export type NewsTranslation = {
  title?: string;
  excerpt?: string;
  body: string[];
};

export const newsEntries = entries as NewsEntry[];

export function getNewsEntry(slug: string) {
  return newsEntries.find((entry) => entry.slug === slug);
}
