# Agentech Documentation Index

This Markdown file is the source note for the hidden website documents page:

```text
/agentech-products/documents
```

The page is intentionally hidden from public navigation. It is the first version of a company-wide documentation system for turning code, curriculum, automation, APIs, robot capabilities, and internal tools into reusable Agentech product knowledge.

## Documentation Workflow

```text
Write Markdown
-> Push to GitHub
-> Review
-> Merge
-> Website links to updated docs
```

## Repository 1: Agentech Website

Repository:

```text
https://github.com/agent-tech0316/agentech-site-v1
```

Primary docs:

```text
README.md
CONTRIBUTING.md
docs/software-check-access-policy.md
docs/dropbox-news-automation.md
```

Current documentation structure:

```text
agentech-site-v1/
|-- README.md
|-- CONTRIBUTING.md
|-- Software Check Access Policy
|-- Overview
|-- Architecture
|-- News Automation
|-- Supabase Data Model
|-- Account and Application Flows
|-- Launch Switches
|-- Deployment
`-- Troubleshooting
```

Covered topics:

- What the website contains and which business areas it supports.
- Next.js route structure, shared components, service helpers, generated data, and static assets.
- Dropbox News importer architecture, folder format, media handling, generated JSON, and article routing.
- Supabase tables for accounts, profiles, children, enrollments, invoices, preorder requests, and talent applications.
- Environment variables and server-only secrets.
- Local development, production build, preview server, and GitHub workflow.
- Internal/external account identity, Software Check credit policy, persisted review gates, and admin visibility.
- Hidden preorder, enroll, grade visibility, and QR route switch points.

Next expansion targets:

- Dedicated architecture page.
- Dedicated deployment page.
- Dedicated Supabase schema reference.
- Dedicated troubleshooting page for News, Supabase, and email failures.

## Repository 2: Grades 3-5 Teaching Materials

Repository:

```text
https://github.com/Agent-tech-ai/grades-3-5-teaching-materials
```

Primary docs:

```text
README.md
input-output/README.md
functions/README.md
if-else/README.md
one_hour_combined_teacher_script.md
```

Current documentation structure:

```text
grades-3-5-teaching-materials/
|-- README.md
|-- Overview
|-- Curriculum Map
|-- Lesson Structure
|-- Input and Output
|-- Functions
|-- If/Else
|-- Teacher Guide
|-- Student Exercises
|-- Simulator Guide
`-- Maintenance Workflow
```

Covered topics:

- Curriculum map for input/output, functions, if/else, and the combined one-hour lesson.
- Teacher-facing scripts and classroom pacing.
- Python examples and simulator commands.
- Robot-connected programming concepts.
- Lesson maintenance workflow and publishing checklist.

Next expansion targets:

- Student worksheets.
- Simulator guide with screenshots.
- Teacher setup guide.
- Lesson assessment rubric.
- Parent-facing curriculum summary.

## Planned Repository: Robotics Secondary Development

English term:

```text
Secondary development
```

Chinese reference:

```text
二次开发
```

Planned repository:

```text
https://github.com/Agent-tech-ai/robotics-secondary-development
```

Planned documentation structure:

```text
robotics-secondary-development/
|-- README.md
|-- Overview
|-- Secondary Development Guide
|-- Robot SDK
|-- Robot Skills
|-- Hardware Interfaces
|-- Software Interfaces
|-- Examples
`-- Troubleshooting
```

Planned topics:

- How developers build on top of Agentech robots.
- Robot SDK usage.
- Robot skills and reusable capabilities.
- Hardware and software interfaces.
- Integrations and examples.
- Safe operating assumptions and troubleshooting.
