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
    slug: "physical-hardware-check",
    number: "03",
    title: "Physical Hardware Check",
    summary: "Upload or paste Python code so command parameters and robot-body limits are checked before software review.",
    accent: "#6c2bd9",
    tint: "#f3efff"
  },
  {
    slug: "software-check",
    number: "04",
    title: "Software Check",
    summary: "Run the GPT software security review after the physical hardware check passes.",
    accent: "#c85016",
    tint: "#fff4ec"
  },
  {
    slug: "watch-live-run",
    number: "05",
    title: "Live Stream",
    summary: "Watch the supervised robot run after scheduling an approved session.",
    accent: "#149448",
    tint: "#edfff3"
  }
] as const;

export type AgentechLibraryTaskSlug = (typeof agentechLibraryTasks)[number]["slug"];

export function getAgentechLibraryTask(slug: string) {
  return agentechLibraryTasks.find((task) => task.slug === slug);
}
