import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { resolveComingSoonFeature } from "@/lib/site-data";

type ComingSoonPageProps = {
  searchParams: Promise<{ feature?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Agentech is building this experience.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const { feature } = await searchParams;
  const resolvedFeature = resolveComingSoonFeature(feature);

  return <PlaceholderPage title={resolvedFeature.title} />;
}
