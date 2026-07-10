import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AgentechLibraryWorkbench } from "@/components/agentech-library-workbench";
import { agentechLibraryTasks, getAgentechLibraryTask, type AgentechLibraryTaskSlug } from "@/lib/agentech-library-tasks";
import { getEaicHubTaskPath } from "@/lib/eaic-hub";

const legacyTaskRedirects: Record<string, AgentechLibraryTaskSlug> = {
  "browse-functions": "view-sdk",
  "try-code": "view-sdk",
  "safety-limits": "view-sdk",
  examples: "view-sdk",
  submit: "software-check",
  "submit-review": "software-check",
  "physical-hardware-check": "software-check",
  "request-robot-slot": "watch-live-run"
};

type PageProps = {
  params: Promise<{
    task: string;
  }>;
};

export function generateStaticParams() {
  return agentechLibraryTasks.map((task) => ({ task: task.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { task: taskSlug } = await params;
  const task = getAgentechLibraryTask(taskSlug);

  if (!task) {
    return {
      title: "EAIC HUB | Agentech Products"
    };
  }

  return {
    title: `${task.title} | EAIC HUB`,
    description: task.summary,
    robots: {
      index: false,
      follow: false
    }
  };
}

export default async function EaicHubTaskPage({ params }: PageProps) {
  const { task: taskSlug } = await params;
  const redirectSlug = legacyTaskRedirects[taskSlug];

  if (redirectSlug) {
    redirect(getEaicHubTaskPath(redirectSlug));
  }

  const task = getAgentechLibraryTask(taskSlug);

  if (!task) {
    notFound();
  }

  return <AgentechLibraryWorkbench task={task.slug as AgentechLibraryTaskSlug} />;
}
