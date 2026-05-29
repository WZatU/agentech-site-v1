# Agentech Website

Agentech company website built with Next.js App Router, TypeScript, and Tailwind CSS.

This repository contains the public website, education pages, talent application flows, robot preorder invoice flow, account dashboard, and Dropbox-driven News importer.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase REST and Storage for account records, forms, invoices, and resume uploads
- Resend for application and invoice emails
- Dropbox importer for News updates

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Preview on port 3001:

```bash
npm run serve:3001
```

## Main Folders

- `app/`: route pages, API routes, layout, metadata, sitemap, robots.
- `components/`: reusable UI, forms, account dashboard, news display, header/footer.
- `lib/`: business logic, Supabase helpers, pricing, account/session logic, news access, form email builders.
- `data/`: JSON-backed site data, including imported news entries.
- `public/assets/`: images, logos, products, flyers, partner logos, and imported news media.
- `scripts/`: maintenance scripts, including Dropbox news import/delete.
- `docs/`: operator notes, including Dropbox News automation.

## Important Pages

- `/`: homepage and partner logo roll.
- `/agentech-robotic`: robot product comparison table.
- `/preorder`: hidden robot invoice request form.
- `/agentech-education`: education landing page and grade cards.
- `/agentech-education/[grade]`: grade-specific education pages.
- `/agentech-education/[grade]/[course]`: course pages and enrollment button.
- `/talents`: talent program landing page.
- `/ai-robotics-club`, `/ai-robotics-club/zh`, `/ai-robotics-club/apply`: AI & Robotics Club pages and application form.
- `/career-intern`: internship application form.
- `/tech-education`: workshop application form.
- `/news`, `/news/[slug]`: news listing and article pages.
- `/login`, `/account-setup`, `/account`: account login, family/student setup, requests dashboard.
- `/field-interest/agt-qr-2026`: hidden QR-only field interest page for in-person outreach. Do not link this page in the public nav or sitemap.

## Quick Switches

These are the places to change when hidden or launch-gated items need to go live quickly.

### Robot Preorder Buttons

Robot preorder buttons are hidden on the product table by:

```ts
const showPreorderButtons = false;
```

File:

```text
app/agentech-robotic/page.tsx
```

Set it to `true` to show `PRE-ORDER` buttons. The buttons send visitors through login and then to:

```text
/preorder?product=<robot model>
```

The preorder backend already exists at:

```text
app/api/preorder/route.ts
```

It saves requests to Supabase table `agentech_preorder_invoices`, creates invoice items, and sends unpaid-balance invoice emails when email settings are configured.

### Education Enroll Buttons

The course `Enroll Now` button currently redirects to Learning Tree:

```text
components/education-course-button.tsx
```

Current URL:

```text
https://www.learningtrees.us/ai-summer-camp
```

An internal Supabase enrollment/cart flow still exists at:

```text
/enroll?course=<course code>
```

Relevant file:

```text
components/education-enroll-page.tsx
```

If the button should use the internal Agentech account flow again, update `components/education-course-button.tsx` to route to `/login?next=/enroll?course=...` or directly to `/enroll?course=...`.

### Hidden Grade 9-12 Education Card

The 9-12 grade page data exists, but the landing page hides it here:

```text
app/agentech-education/page.tsx
```

Look for:

```ts
const visibleGradePages = educationGradePages.filter((page) => page.slug !== "9-12");
```

Remove that filter when Grade 9-12 should appear on the main Education page.

### Hidden Field Interest QR

The in-person QR capture page lives at:

```text
/field-interest/agt-qr-2026
```

The QR code is intentionally fixed to the official production URL:

```text
https://agent-tech.ai/field-interest/agt-qr-2026
```

Do not change this path or URL unless you intend to reprint or replace every QR code that has already been shared. The route is not linked from the public navigation, is not included in the sitemap, and is blocked in `robots.txt`.

## News Auto-Update Through Dropbox

News entries are imported from Dropbox into:

```text
data/news-entries.json
data/news-imports.json
public/assets/news/
```

Main importer:

```text
scripts/import-dropbox-news.mjs
```

Operator docs:

```text
docs/dropbox-news-automation.md
```

Required GitHub repository secrets:

- `DROPBOX_ACCESS_TOKEN`
- `DROPBOX_NEWS_SHARED_LINK`

Manual local import:

```bash
npm run import:news
npm run build
git add data/news-entries.json data/news-imports.json public/assets/news
git commit -m "Import Dropbox news"
git push origin main
```

Manual import from a local folder:

```bash
npm run import:news:local -- --source "C:\path\to\news-folder"
```

Dropbox folder format:

```text
2026-05-22/
  index.md or news.txt
  1.jpg
  2.jpg
  3.mp4
```

Media can also live inside an `image/` folder. Numbered media files are used for the slideshow, and the first image is used as the cover.

## Supabase-Backed Forms and Database

Supabase schema:

```text
supabase-schema.sql
```

Server helper:

```text
lib/supabase-server.ts
```

Required environment variables:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
APPLICATION_FROM_EMAIL=
APPLICATION_RECEIVER_EMAIL=info@agent-tech.ai
```

Application and request tables include:

- `agentech_accounts`
- `agentech_profiles`
- `agentech_children`
- `agentech_education_courses`
- `agentech_enrollments`
- `agentech_invoice_items`
- `agentech_preorder_invoices`
- `agentech_workshop_applications`
- `agentech_ai_robotics_club_applications`
- `agentech_internship_applications`
- `agentech_field_interest_leads`

Resume uploads use Supabase Storage bucket:

```text
talent-resumes
```

## Talent Application Flows

Talent forms require an Agentech account session before submission.

- Internship form: `components/internship-form.tsx`
- AI & Robotics Club form: `components/summer-school-form.tsx`
- Workshop form: `components/tech-education-form.tsx`

API routes:

- `app/api/internship/route.ts`
- `app/api/summer-school/route.ts`
- `app/api/tech-education/route.ts`

Save helpers:

```text
lib/talent-applications.ts
lib/talent-resumes.ts
```

If Resend is configured, the APIs send email notifications. If Resend is not configured for the workshop and club forms, the site falls back to opening a prefilled email draft.

## Git Workflow

This website repository lives in:

```text
D:\Agentech\Agentech Website
```

The parent folder `D:\Agentech` is only a workspace folder and is not the Git repository. Run Git commands from the website folder:

```bash
cd "D:\Agentech\Agentech Website"
git status
git pull
git add .
git commit -m "Update website"
git push
```

## Useful Commands

```bash
npm run dev
npm run build
npm run serve:3001
npm run import:news
npm run list:news
npm run delete:news:number 1
```
