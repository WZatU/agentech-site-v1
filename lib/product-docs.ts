export const documentationRepositories = [
  {
    id: "website",
    name: "Agentech Website",
    repository: "agentech-site-v1",
    githubUrl: "https://github.com/WZatU/agentech-site-v1",
    localPath: "D:\\Agentech\\Agentech Website",
    summary:
      "Main Next.js website, Dropbox News automation, Supabase forms, account flows, robot preorder flow, hidden launch switches, and public pages.",
    docsPath: "README.md, docs/dropbox-news-automation.md",
    sections: [
      "Website automation",
      "Dropbox News flow",
      "Supabase forms and database",
      "Hidden preorder/enroll switches",
      "Main public route map"
    ]
  },
  {
    id: "grades-3-5",
    name: "Grades 3-5 Teaching Materials",
    repository: "grades-3-5-teaching-materials",
    githubUrl: "https://github.com/agent-tech/grades-3-5-teaching-materials",
    localPath: "D:\\Agentech\\grades-3-5-teaching-materials",
    summary:
      "Education curriculum repository for Grades 3-5 Python lessons, teacher scripts, classroom activities, visual simulators, and robot-connected coding examples.",
    docsPath: "README.md plus topic README files",
    sections: [
      "Input and Output",
      "Functions",
      "If/Else",
      "One-hour combined teacher script",
      "Python classroom simulators"
    ]
  }
] as const;
