import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Agentech is building this experience.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ComingSoonPage() {
  return <PlaceholderPage title="COMING SOON" />;
}
