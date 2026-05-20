export type NewsEntry = {
  slug: string;
  title: string;
  date: string;
  displayDate: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  body: string[];
};

export const newsEntries: NewsEntry[] = [
  {
    slug: "agentech-begins-new-chapter-ai-native-company",
    title: "Agentech Begins a New Chapter as an AI-Native Company",
    date: "2026-03-16",
    displayDate: "March 16, 2026",
    excerpt:
      "March 16, 2026 marks the official beginning of Agentech's journey as an AI-native company built for the future.",
    coverImage: "/assets/news/agentech-new-chapter-1.jpg",
    images: [
      "/assets/news/agentech-new-chapter-1.jpg",
      "/assets/news/agentech-new-chapter-2.jpg",
      "/assets/news/agentech-new-chapter-3.jpg"
    ],
    body: [
      "March 16, 2026 marks more than the opening of a new office - it marks the official beginning of Agentech's journey as an AI-native company built for the future.",
      "As artificial intelligence rapidly evolves beyond traditional software and becomes capable of perception, reasoning, and autonomous action, Agentech was founded with a clear vision: to help shape the next generation of intelligent systems that will transform how people learn, work, and live.",
      "We believe the future will not belong to companies that simply use AI as a tool, but to organizations that are fundamentally designed around AI from the very beginning. At Agentech, AI is not an add-on - it is part of our core identity, culture, and long-term mission.",
      "This milestone represents the start of a new era where innovation moves faster, intelligent agents become real-world collaborators, and technology becomes more human-centered than ever before. Our mission is to bridge education, intelligence, and action - creating systems that empower people and unlock new possibilities for the future.",
      "As we celebrated this important moment together, we were reminded that we are not simply witnessing the AI revolution. We are building within it.",
      "The future has already begun - and Agentech is proud to be part of creating it."
    ]
  }
];

export function getNewsEntry(slug: string) {
  return newsEntries.find((entry) => entry.slug === slug);
}
