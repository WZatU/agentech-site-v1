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
    summary: "Browse functions, parameters, safety limits, examples, and GIF previews.",
    accent: "#145cff",
    tint: "#ecf3ff"
  },
  {
    slug: "submit",
    number: "03",
    title: "Submit",
    summary: "Submit code for review first, then schedule a supervised robot slot.",
    accent: "#6c2bd9",
    tint: "#f3efff"
  },
  {
    slug: "watch-live-run",
    number: "04",
    title: "Watch Live Run",
    summary: "Live camera viewer and real-time session status.",
    accent: "#149448",
    tint: "#edfff3"
  }
] as const;

export type AgentechLibraryTaskSlug = (typeof agentechLibraryTasks)[number]["slug"];

export function getAgentechLibraryTask(slug: string) {
  return agentechLibraryTasks.find((task) => task.slug === slug);
}
