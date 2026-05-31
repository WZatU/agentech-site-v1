export const documentationRepositories = [
  {
    id: "website",
    name: "Agentech Website",
    repository: "agentech-site-v1",
    githubUrl: "https://github.com/WZatU/agentech-site-v1",
    docsUrl: "https://github.com/WZatU/agentech-site-v1#readme",
    image: "/assets/logo/AGENTECH.png",
    imageAlt: "Agentech company logo",
    imageFit: "contain",
    accent: "cyan",
    summary:
      "Main Next.js website, Dropbox News automation, Supabase forms, account flows, robot preorder flow, hidden launch switches, and public pages.",
    docsPath: "README.md, docs/dropbox-news-automation.md",
    readmeTree: [
      "Overview",
      "Architecture",
      "News Automation",
      "Supabase Data Model",
      "Account and Application Flows",
      "Launch Switches",
      "Deployment",
      "Troubleshooting"
    ],
    docs: [
      {
        title: "Overview",
        description:
          "Explains what the website contains, which business areas it supports, and how the repository turns Agentech operations into maintainable product documentation."
      },
      {
        title: "Architecture",
        description:
          "Documents the Next.js App Router structure, route groups, shared components, service helpers, static data, imported media, and external service boundaries."
      },
      {
        title: "Dropbox News Automation",
        description:
          "Covers the Dropbox folder format, importer script, generated JSON files, media storage, article routing, manual import commands, and delete/list maintenance commands."
      },
      {
        title: "Supabase Forms and Database",
        description:
          "Lists the core Supabase tables and explains how accounts, profiles, children, enrollments, invoices, preorder requests, workshop applications, club applications, and internship applications are stored."
      },
      {
        title: "Environment and Deployment",
        description:
          "Defines required environment variables, server-only secrets, local build commands, production preview commands, and GitHub-based deployment workflow."
      },
      {
        title: "Launch Switches and Troubleshooting",
        description:
          "Identifies the exact files for hidden preorder buttons, education enrollment routing, Grade 9-12 visibility, QR-only field interest routing, and common operator checks before publishing."
      }
    ]
  },
  {
    id: "robotics-secondary-development",
    name: "Robotics Secondary Development",
    repository: "robotics-secondary-development",
    githubUrl: "https://github.com/Agent-tech-ai/robotics-secondary-development",
    docsUrl: "https://github.com/Agent-tech-ai/robotics-secondary-development#readme",
    image: "/assets/master-edu.png",
    imageAlt: "Agentech robot for secondary development documentation",
    imageFit: "contain",
    accent: "violet",
    summary:
      "Planned robotics developer documentation for secondary development, robot SDK usage, robot skills, integrations, hardware/software extension points, and developer-facing examples.",
    docsPath: "Planned README.md and robotics developer docs",
    readmeTree: [
      "Overview",
      "Secondary Development Guide",
      "Robot SDK",
      "Robot Skills",
      "Hardware Interfaces",
      "Software Interfaces",
      "Examples",
      "Troubleshooting"
    ],
    docs: [
      {
        title: "Secondary Development Guide",
        description:
          "Defines how developers can build on top of Agentech robots after the base product ships, including extension points, project structure, and supported development boundaries."
      },
      {
        title: "Robot SDK",
        description:
          "Planned reference for robot control APIs, local SDK usage, command patterns, state access, configuration, and developer examples."
      },
      {
        title: "Robot Skills",
        description:
          "Documents reusable robot capabilities such as movement, perception, interaction, task routines, and skill packaging for future products."
      },
      {
        title: "Interfaces and Integrations",
        description:
          "Planned guide for hardware ports, software interfaces, data exchange, external integrations, and safe operating assumptions."
      }
    ]
  },
  {
    id: "grades-3-5",
    name: "Grades 3-5 Teaching Materials",
    repository: "grades-3-5-teaching-materials",
    githubUrl: "https://github.com/Agent-tech-ai/grades-3-5-teaching-materials",
    docsUrl: "https://github.com/Agent-tech-ai/grades-3-5-teaching-materials#readme",
    image: "/assets/programs/summer-school.png",
    imageAlt: "Agentech education program visual",
    imageFit: "cover",
    accent: "blue",
    summary:
      "Education curriculum repository for Grades 3-5 Python lessons, teacher scripts, classroom activities, visual simulators, and robot-connected coding examples.",
    docsPath: "README.md plus topic README files",
    readmeTree: [
      "Overview",
      "Curriculum Map",
      "Lesson Structure",
      "Input and Output",
      "Functions",
      "If/Else",
      "Teacher Guide",
      "Student Exercises",
      "Simulator Guide",
      "Maintenance Workflow"
    ],
    docs: [
      {
        title: "Curriculum Map",
        description:
          "Shows the three main topic folders, the combined one-hour teacher script, primary files, and the learning outcome for each lesson area."
      },
      {
        title: "Lesson Structure",
        description:
          "Defines the teaching pattern: explain the concept, show a short Python example, connect it to a robot-like action, run the simulator, then review vocabulary."
      },
      {
        title: "Input and Output Lesson",
        description:
          "Documents teacher script, name badge example, math machine example, robot simulator, and visual 2D simulator for introducing input-process-output thinking."
      },
      {
        title: "Functions Lesson",
        description:
          "Documents reusable instruction blocks, simple function examples, function machine simulator, teacher script, and visual simulator for classroom demonstration."
      },
      {
        title: "If/Else Lesson",
        description:
          "Documents decision-making logic through fire safety, weather, flower, nested condition, and visual if/else simulators."
      },
      {
        title: "Teacher and Simulator Guide",
        description:
          "Explains how to run Python simulators, when to use each activity, how to pace a Grades 3-5 classroom, and what to check before publishing lesson updates."
      }
    ]
  }
] as const;
