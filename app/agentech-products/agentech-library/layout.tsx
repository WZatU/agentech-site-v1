import { AgentechLibraryAccessGate } from "@/components/agentech-library-access-gate";

export default function AgentechLibraryLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AgentechLibraryAccessGate>{children}</AgentechLibraryAccessGate>;
}
