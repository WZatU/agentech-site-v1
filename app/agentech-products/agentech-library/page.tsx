import type { Metadata } from "next";
import { AgentechLibraryHome } from "@/components/agentech-library-home";

export const metadata: Metadata = {
  title: "EAI Cloud | Agentech Products",
  description: "Developer-gated EAI Cloud workbench for Agentech robot commands, parameters, code submissions, and robot run previews.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AgentechLibraryPage() {
  return <AgentechLibraryHome />;
}
