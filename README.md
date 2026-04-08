# Agentech V1 Website

Version 1 of the Agentech company website built with Next.js and Tailwind CSS.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open:

```bash
http://localhost:3000
```

## Build for production

```bash
npm run build
npm run start
```

## Main folders

- `app/`: pages and layout
- `components/`: reusable UI blocks
- `lib/site-data.ts`: editable company copy, navigation, metrics, links, and form notes

## What to edit later

- Replace company copy and metrics in `lib/site-data.ts`
- Replace placeholder links and contact email in `lib/site-data.ts`
- Connect form submission handlers in `components/forms.tsx`
- Replace the Calendly placeholder in `app/cooperation/page.tsx`

## Notes

- Resume upload is UI-only right now and needs backend wiring.
- Cooperation form is UI-only right now and needs backend wiring.
- The old `trae-local/` folder is left untouched as a separate legacy snapshot.
