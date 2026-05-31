<p align="center">
  <img src="public/assets/logo/AGENTECH.png" alt="Agentech" width="420" />
</p>

# Agentech Website

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6)](https://www.typescriptlang.org/)

Agentech Website is the main web platform for Agentech robotics, education, talent programs, product documentation, account workflows, and automated news publishing.

The repository is designed to work like a professional product codebase: public pages live beside operational documentation, hidden launch switches are easy to find, and repeatable content flows such as News can be maintained through GitHub.

## What This Repository Contains

- Public company website for Robotics, Education, Bots, Talents, About, and News.
- Dropbox-driven News importer for publishing dated folders as website articles.
- Supabase-backed accounts, profiles, children, enrollments, preorder requests, invoices, and applications.
- Resend-backed application, invoice, and notification email flows.
- Hidden product documentation page at `/agentech-products/documents`.
- Internal launch switches for preorder, enroll, and grade visibility.

## Documentation Map

| Area | Location |
| --- | --- |
| App routes and API routes | `app/` |
| Shared UI and forms | `components/` |
| Business logic and service helpers | `lib/` |
| Static and imported data | `data/` |
| Images, logos, QR codes, news media | `public/assets/` |
| Maintenance and importer scripts | `scripts/` |
| Operator documentation | `docs/` |
| Supabase schema | `supabase-schema.sql` |

Important documents:

- [Dropbox News automation](docs/dropbox-news-automation.md)
- [Documentation index](docs/documentation-index.md)
- Hidden product documents page: `/agentech-products/documents`

The product documents page is intentionally not linked from public navigation and is marked `noindex`. It still works by direct URL for internal review.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build and run production locally:

```bash
npm run build
npm run start
```

Preview production on port 3001:

```bash
npm run serve:3001
```

Hidden documents preview:

```text
http://localhost:3001/agentech-products/documents
```

## Environment Variables

Create local environment variables as needed:

```text
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
APPLICATION_FROM_EMAIL=
APPLICATION_RECEIVER_EMAIL=info@agent-tech.ai
RESEND_REPLY_TO=

DROPBOX_ACCESS_TOKEN=
DROPBOX_NEWS_SHARED_LINK=
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## Core Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage and partner logo roll |
| `/agentech-robotic` | Robot product comparison table |
| `/preorder` | Hidden robot invoice request form |
| `/agentech-education` | Education landing page |
| `/agentech-education/[grade]` | Grade-specific education page |
| `/agentech-education/[grade]/[course]` | Course detail and enrollment CTA |
| `/talents` | Talent program landing page |
| `/ai-robotics-club` | AI & Robotics Club landing page |
| `/ai-robotics-club/apply` | AI & Robotics Club application |
| `/career-intern` | Internship application |
| `/tech-education` | Workshop application |
| `/news` | News listing |
| `/news/[slug]` | News article |
| `/login` | Universal account sign-in |
| `/account-setup` | Parent/student setup |
| `/account` | Account requests dashboard |
| `/field-interest/agt-qr-2026` | Hidden QR-only field interest form |
| `/agentech-products/documents` | Hidden internal product docs |

## Architecture Overview

```text
Next.js App Router
  -> app/ pages and API routes
  -> components/ reusable UI and forms
  -> lib/ Supabase, accounts, pricing, news, email helpers
  -> data/ generated JSON content
  -> public/assets/ static and imported media
```

External services:

| Service | Use |
| --- | --- |
| Supabase | Accounts, profiles, children, enrollments, invoices, applications, resume storage |
| Resend | Application notifications and invoice emails |
| Dropbox | Source folder for automated News imports |
| GitHub | Review, version control, deployment source, documentation workflow |

## News Automation

News is imported from a Dropbox shared folder into static website data. This lets non-developers prepare article text and media in Dropbox while the website keeps a Git-tracked copy of the final published content.

High-level flow:

```text
Dropbox folder
  -> scripts/import-dropbox-news.mjs
  -> data/news-entries.json
  -> data/news-imports.json
  -> public/assets/news/
  -> /news and /news/[slug]
```

Files changed by a successful import:

| File or folder | Purpose |
| --- | --- |
| `data/news-entries.json` | Published news article data used by the website |
| `data/news-imports.json` | Import tracking map so Dropbox folders update existing articles instead of duplicating |
| `public/assets/news/` | Copied article images and videos |

### Dropbox Folder Format

Each top-level Dropbox folder becomes one news article. Folder names should start with a date:

```text
2026-05-22/
  index.md or news.txt
  1.jpg
  2.jpg
  3.mp4
```

Media may also be placed under an `image/` folder:

```text
2026-05-22/
  index.md
  image/
    1.jpg
    2.jpg
```

Folder rules:

- Use a date prefix such as `2026-05-22`.
- Put article text in `index.md`, another `.md` file, or a `.txt` file.
- Use numbered media names such as `1.jpg`, `2.png`, `3.mp4`, or `01.jpg`.
- The first numbered image becomes the cover image.
- Videos are supported with `.mp4`, `.mov`, `.webm`, and `.m4v`.
- Folders starting with `_` are ignored.
- Example folders are ignored when their name contains `example`.

Optional front matter:

```markdown
---
title: "Agentech Opens New Robotics Program"
author_override: "Agentech"
---
```

Language sections:

```markdown
## English

English article text here.

## 中文

Chinese article text here.
```

If only one language is provided, the website shows only that language. If both sections are provided, the article page can show the language toggle.

### Manual Import

Run from the website repository:

```bash
npm run import:news
npm run build
git add data/news-entries.json data/news-imports.json public/assets/news
git commit -m "Import Dropbox news"
git push origin main
```

### Local Import From A Specific Folder

Use this when testing a local copy before Dropbox/GitHub automation:

```bash
npm run import:news:local -- --source "C:\path\to\news-folder"
```

### GitHub Action Import

The automated workflow uses repository secrets:

```text
DROPBOX_ACCESS_TOKEN
DROPBOX_NEWS_SHARED_LINK
```

Manual run in GitHub:

1. Open the GitHub repository.
2. Go to `Actions`.
3. Select `Import Dropbox News`.
4. Click `Run workflow`.

The importer uses the Dropbox API token first. If no token is configured, it can fall back to downloading the shared folder zip from the Dropbox link.

### Updating Existing News

If more media or edited text is added to a Dropbox folder that was already imported, the importer updates the existing article instead of creating a duplicate. This is tracked by:

```text
data/news-imports.json
```

Do not delete rows from `data/news-imports.json` unless you intentionally want the importer to treat the Dropbox folder as new.

### Listing And Deleting News

Useful commands:

```bash
npm run list:news
npm run delete:news:number 1
npm run delete:news:date 2026-05-22
npm run delete:news:slug agentech-news
npm run delete:news:source 2026-05-22-example
```

The delete command removes the article from `data/news-entries.json`, removes the import record from `data/news-imports.json`, and removes the referenced media folder from `public/assets/news/`.

If Windows has an image or video locked because the site is running locally, stop the local server first and run the delete command again.

### News Troubleshooting

| Problem | What to check |
| --- | --- |
| Article does not appear | Confirm the Dropbox folder starts with a date and contains `index.md`, another `.md`, or `.txt` |
| Images do not appear | Confirm media files are numbered and use supported extensions |
| Duplicate article appears | Check whether `data/news-imports.json` lost the original source folder mapping |
| Language toggle missing | Confirm both `## English` and `## 中文` sections exist |
| GitHub Action fails | Check `DROPBOX_ACCESS_TOKEN`, `DROPBOX_NEWS_SHARED_LINK`, and Action logs |
| Delete command cannot remove assets | Stop `npm run start` or `npm run serve:3001`, then retry |

See [docs/dropbox-news-automation.md](docs/dropbox-news-automation.md) for the full operator guide.

## Launch Switches

These are the files to check when hidden or launch-gated items need to go live quickly.

### Robot Preorder

File:

```text
app/agentech-robotic/page.tsx
```

Switch:

```ts
const showPreorderButtons = false;
```

Set it to `true` to show `PRE-ORDER` buttons. The buttons route through login to:

```text
/preorder?product=<robot model>
```

Backend:

```text
app/api/preorder/route.ts
```

### Education Enrollment

Course enroll buttons currently send users to Learning Tree.

File:

```text
components/education-course-button.tsx
```

Current target:

```text
https://www.learningtrees.us/ai-summer-camp
```

The internal Agentech enrollment flow still exists:

```text
/enroll?course=<course code>
components/education-enroll-page.tsx
```

### Grade 9-12 Visibility

File:

```text
app/agentech-education/page.tsx
```

Current filter:

```ts
const visibleGradePages = educationGradePages.filter((page) => page.slug !== "9-12");
```

Remove the filter when the 9-12 grade card should appear on the Education landing page.

### Field Interest QR

Hidden QR route:

```text
/field-interest/agt-qr-2026
```

Permanent QR asset:

```text
public/assets/qr/agentech-workshop-qr.png
```

Keep this route out of public navigation unless the QR campaign changes.

## Supabase Data Model

Main tables:

- `agentech_accounts`
- `agentech_profiles`
- `agentech_children`
- `agentech_counters`
- `agentech_education_courses`
- `agentech_enrollments`
- `agentech_invoice_items`
- `agentech_preorder_invoices`
- `agentech_workshop_applications`
- `agentech_ai_robotics_club_applications`
- `agentech_internship_applications`

Resume uploads use Supabase Storage:

```text
talent-resumes
```

Server helper:

```text
lib/supabase-server.ts
```

## Talent Application Flows

Talent forms require an Agentech account session before submission.

| Program | Page | API | Supabase table |
| --- | --- | --- | --- |
| Internship | `/career-intern` | `app/api/internship/route.ts` | `agentech_internship_applications` |
| AI & Robotics Club | `/ai-robotics-club/apply` | `app/api/summer-school/route.ts` | `agentech_ai_robotics_club_applications` |
| Workshop | `/tech-education` | `app/api/tech-education/route.ts` | `agentech_workshop_applications` |

Shared helpers:

```text
lib/talent-applications.ts
lib/talent-resumes.ts
```

## Product Documentation

The website includes a hidden documentation portal:

```text
/agentech-products/documents
```

This page is the beginning of a company-wide documentation system inspired by NumPy, TensorFlow, ReadTheDocs, and SDK/API reference sites. The goal is to turn existing company work into reusable, maintainable product knowledge.

Initial linked repositories:

- `https://github.com/WZatU/agentech-site-v1`
- `https://github.com/Agent-tech-ai/grades-3-5-teaching-materials`

Recommended long-term documentation structure:

```text
docs/
|-- robotics/
|-- agents/
|-- education/
|-- products/
|-- sdk/
|-- api/
`-- developer-onboarding.md
```

## Development Workflow

This repository lives at:

```text
D:\Agentech\Agentech Website
```

The parent folder `D:\Agentech` is a workspace folder, not the Git repository.

Typical workflow:

```bash
cd "D:\Agentech\Agentech Website"
git status
git pull
npm run build
git add .
git commit -m "Update website"
git push
```

Documentation workflow:

```text
Write Markdown
-> Push to GitHub
-> Review
-> Merge
-> Website links to docs
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build production site |
| `npm run start` | Start production server |
| `npm run serve:3001` | Start production server on port 3001 |
| `npm run import:news` | Import News from Dropbox |
| `npm run import:news:local` | Import News from a local source folder |
| `npm run list:news` | List current News entries |
| `npm run delete:news:number` | Delete a News entry by list number |
| `npm run delete:news:date` | Delete a News entry by date |
| `npm run delete:news:slug` | Delete a News entry by slug |

## Repository Notes

`trae-local/` is a legacy snapshot and is intentionally separate from the current Next.js application.
