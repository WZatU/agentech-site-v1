import type { Metadata } from "next";
import { AgentechLibraryHome } from "@/components/agentech-library-home";

export const metadata: Metadata = {
  title: "Agentech Robot Dog Library",
  description: "Hidden developer workbench for Agentech robot dog commands, parameters, code paste, and robot run previews.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AgentechLibraryPage() {
  return <AgentechLibraryHome />;
}
