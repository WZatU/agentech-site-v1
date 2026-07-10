import { redirect } from "next/navigation";
import { getEaicHubTaskPath } from "@/lib/eaic-hub";

type PageProps = {
  params: Promise<{
    task: string;
  }>;
};

export default async function AgentechLibraryTaskPage({ params }: PageProps) {
  const { task: taskSlug } = await params;
  redirect(getEaicHubTaskPath(taskSlug));
}
