import { AgentechLibraryAccessGate } from "@/components/agentech-library-access-gate";

export default function EaicHubLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV !== "production") {
    return children;
  }

  return <AgentechLibraryAccessGate>{children}</AgentechLibraryAccessGate>;
}
