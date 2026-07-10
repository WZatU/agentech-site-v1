import type { Metadata } from "next";
import { AgentechLibraryHome } from "@/components/agentech-library-home";

export const metadata: Metadata = {
  title: "EAIC HUB | Agentech Products",
  description: "Developer-gated EAIC HUB for Agentech robot commands, parameters, code checks, submissions, scheduling, and supervised live runs.",
  robots: {
    index: false,
    follow: false
  }
};

export default function EaicHubPage() {
  return <AgentechLibraryHome />;
}
