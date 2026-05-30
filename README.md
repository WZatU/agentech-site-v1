<p align="center">
  <img src="public/assets/logo/AGENTECH.png" alt="Agentech" width="420" />
</p>

# Agentech Website

Agentech Website is the company web platform for robotics, education, talent programs, product documentation, account workflows, and automated news publishing.

The site is built with Next.js App Router and is designed to keep business content, launch switches, and internal operating docs easy to maintain from GitHub.

## Highlights

- Public company website for Agentech Robotics, Education, Bots, Talents, About, and News.
- Dropbox-driven News importer that turns dated folders into website articles.
- Supabase-backed account, education, preorder, invoice, and application records.
- Resend-backed notification and invoice email flows.
- Hidden product documentation route backed by Markdown files.
- Simple launch switches for hidden preorder, enroll, and grade-page visibility.

## Documentation

| Area | Location |
| --- | --- |
| Website routes | `app/` |
| Reusable UI and forms | `components/` |
| Business logic and service helpers | `lib/` |
| Imported news JSON | `data/news-entries.json` |
| Dropbox News operations | `docs/dropbox-news-automation.md` |
| Documentation index | `docs/documentation-index.md` |
| Hidden product docs page | `/agentech-products/documents` |
| Supabase schema | `supabase-schema.sql` |

The product documents page is intentionally not linked from public navigation and is not included in the sitemap.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

Preview production locally on port 3001:

```bash
npm run serve:3001
```

## Environment

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

## News Automation

News is imported from a Dropbox shared folder into static website data.

```text
Dropbox folder
  -> scripts/import-dropbox-news.mjs
  -> data/news-entries.json
  -> data/news-imports.json
  -> public/assets/news/
  -> /news and /news/[slug]
```

Expected Dropbox folder format:

```text
2026-05-22/
  index.md or news.txt
  1.jpg
  2.jpg
  3.mp4
```

Media can also be placed under an `image/` folder:

```text
2026-05-22/
  index.md
  image/
    1.jpg
    2.jpg
```

Manual import:

```bash
npm run import:news
npm run build
git add data/news-entries.json data/news-imports.json public/assets/news
git commit -m "Import Dropbox news"
git push origin main
```

Useful news commands:

```bash
npm run list:news
npm run delete:news:number 1
npm run delete:news:date 2026-05-22
npm run delete:news:slug agentech-news
```

See `docs/dropbox-news-automation.md` for the full operator guide.

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

## Quick Launch Switches

### Robot Preorder

Robot preorder buttons are hidden by one constant:

```text
app/agentech-robotic/page.tsx
```

```ts
const showPreorderButtons = false;
```

Set it to `true` to show `PRE-ORDER` buttons. The buttons route through login to:

```text
/preorder?product=<robot model>
```

The backend API is:

```text
app/api/preorder/route.ts
```

It writes to `agentech_preorder_invoices`, creates unpaid invoice items, and sends invoice notification email when Resend is configured.

### Education Enrollment

Course enroll buttons currently send users to Learning Tree:

```text
components/education-course-button.tsx
```

Current target:

```text
https://www.learningtrees.us/ai-summer-camp
```

The internal Agentech flow still exists:

```text
/enroll?course=<course code>
components/education-enroll-page.tsx
```

### Grade 9-12 Visibility

The 9-12 grade page data exists but is hidden from the Education landing page:

```text
app/agentech-education/page.tsx
```

Look for:

```ts
const visibleGradePages = educationGradePages.filter((page) => page.slug !== "9-12");
```

Remove the filter when the 9-12 card should be visible.

### Field Interest QR

The in-person QR capture page lives at:

```text
/field-interest/agt-qr-2026
```

The permanent QR asset is:

```text
public/assets/qr/agentech-workshop-qr.png
```

Keep this route hidden from public navigation unless the QR campaign changes.

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

Server-side Supabase helper:

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

## Product Documents Page

The main website includes a hidden documentation portal:

```text
/agentech-products/documents
```

It is not linked from public navigation and is marked `noindex`.

The page is structured around a professional documentation model inspired by NumPy, TensorFlow, ReadTheDocs, and SDK/API reference sites:

```text
README.md
docs/
|-- robotics/
|-- agents/
|-- education/
|-- products/
|-- sdk/
|-- api/
`-- developer-onboarding.md
```

The first version is a hidden internal landing page for two important repositories:

- `https://github.com/WZatU/agentech-site-v1`
- `https://github.com/agent-tech/grades-3-5-teaching-materials`

The source note for this page is:

```text
docs/documentation-index.md
```

## Git Workflow

This repository lives at:

```text
D:\Agentech\Agentech Website
```

The parent folder `D:\Agentech` is a workspace folder, not the Git repository.

```bash
cd "D:\Agentech\Agentech Website"
git status
git pull
git add .
git commit -m "Update website"
git push
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build production site |
| `npm run start` | Start production server |
| `npm run serve:3001` | Start production server on port 3001 |
| `npm run import:news` | Import news from Dropbox |
| `npm run import:news:local` | Import news from a local source folder |
| `npm run list:news` | List current news entries |
| `npm run delete:news:number` | Delete a news entry by list number |
| `npm run delete:news:date` | Delete a news entry by date |
| `npm run delete:news:slug` | Delete a news entry by slug |

## Legacy Snapshot

`trae-local/` is a legacy snapshot and is intentionally separate from the current Next.js application.
