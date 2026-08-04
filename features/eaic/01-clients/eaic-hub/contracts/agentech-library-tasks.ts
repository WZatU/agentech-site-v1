export const agentechLibraryTasks = [
  {
    slug: "start-coding",
    number: "01",
    title: "Start Coding",
    summary: "Install package, import Agentech, and copy example code.",
    accent: "#008a6c",
    tint: "#e5fff7"
  },
  {
    slug: "view-sdk",
    number: "02",
    title: "View SDK",
    summary: "Choose Aegis, Navi, or Master, then browse exact functions, parameters, limits, examples, and reference media.",
    accent: "#145cff",
    tint: "#ecf3ff"
  },
  {
    slug: "software-check",
    number: "03",
    title: "Code Certification",
    summary: "Run hardware safety first, then start software security review after it passes.",
    accent: "#c85016",
    tint: "#fff4ec"
  },
  {
    slug: "watch-live-run",
    number: "04",
    title: "Live Stream",
    summary: "Watch the supervised robot run after scheduling an approved session.",
    accent: "#149448",
    tint: "#edfff3"
  }
] as const;

export type AgentechLibraryTaskSlug = (typeof agentechLibraryTasks)[number]["slug"] | "physical-hardware-check";

export function getAgentechLibraryTask(slug: string) {
  return agentechLibraryTasks.find((task) => task.slug === slug);
}
