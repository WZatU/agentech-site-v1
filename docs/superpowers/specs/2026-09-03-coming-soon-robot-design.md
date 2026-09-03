# Coming Soon Robot Design

**Date:** 2026-09-03
**Status:** Approved for implementation planning

## Goal

Create a reusable, playful empty-state experience for unfinished Agentech pages. A precision wireframe robot acts like a small engineer who is actively drawing and assembling the missing page, so customers see intentional progress instead of an empty screen.

All customer-facing copy is English. The component does not display Chinese text, even when it appears on a page that otherwise supports multiple languages.

## Scope

The first implementation adds:

- a reusable `ComingSoonRobot` presentation component
- an upgraded shared `PlaceholderPage` wrapper that composes the animation with page-specific copy
- a direct `/coming-soon` preview route for visual review
- page-scoped Light and Dark palettes
- desktop, tablet, mobile, hover, keyboard-focus, and reduced-motion behavior

It does not replace existing routes in bulk. After the visual is approved, unfinished routes can adopt the shared wrapper one at a time.

## Customer Experience

The empty state presents these default messages:

- Eyebrow: `COMING SOON`
- Headline: `Building at full speed.`
- Description: `Our little engineer is wiring up this page. Check back soon.`
- Hover/focus speech bubble: `Oh—hi! You caught me building.`

Pages may override the eyebrow, headline, and description. The playful speech bubble remains consistent so the character develops a recognizable Agentech personality.

## Visual Direction

The robot is an original inline SVG illustration inspired by engineering wireframes rather than a raster copy of the supplied reference. It uses a clean humanoid silhouette with a rounded helmet, visor, articulated shoulders and elbows, technical hands, a compact chest shell, and visible construction lines.

The scene includes:

- a drafting surface with a partially drawn page frame
- a stylus held by the robot's drawing hand
- a second hand resting on or hovering above the plan
- a horizontal scanner line that reveals small interface marks
- a chest status light and a few restrained construction sparks
- subtle grid and coordinate marks behind the figure

The illustration remains detailed enough to feel technical but avoids tiny ornamental paths that would become visual noise on mobile screens.

## Motion and Interaction

The idle sequence loops approximately every six seconds:

1. The drawing forearm moves across the drafting surface.
2. A scanner line travels over the unfinished page frame.
3. The chest light breathes and the visor blinks once.
4. A small spark travels along the newest drawn line.
5. The robot briefly looks up, then returns to work.

When the customer hovers over the illustration, or focuses it with a keyboard, the drawing motion pauses, the free hand lifts in a short greeting, and the English speech bubble enters. Leaving hover or focus returns the robot to its idle loop.

The scene has no click action and does not pretend to be a navigation control. Motion is decorative and never blocks reading or page interaction.

## Component Boundaries

`components/coming-soon-robot.tsx` owns the semantic structure and inline SVG. It accepts:

```ts
type ComingSoonRobotProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};
```

`components/coming-soon-robot.css` owns all scene layout, theme variables, keyframes, hover/focus states, and responsive rules. Stable `data-coming-soon-*` hooks identify the component, illustration, copy, and animated robot parts.

`components/placeholder-page.tsx` becomes the shared page-level wrapper. Its existing `title` input is preserved and mapped to the new eyebrow so future adopters do not need to learn a completely different API.

`app/coming-soon/page.tsx` renders the default version as a visual review route. It is not added to the site navigation or sitemap.

## Theme Behavior

The component uses its own scoped palette and inherits the site's global theme preference.

- Light canvas: warm off-white `#f5f4f1`
- Light linework: near-black and graphite with blue-cyan status accents
- Dark canvas: deep navy `#07111f`
- Dark linework: warm ivory and muted steel with blue-cyan status accents

The artwork must remain readable without relying on glow. Glow is a restrained secondary effect around the scanner, visor, and status light.

## Responsive Behavior

On wide screens, the copy and robot scene form a balanced two-column composition. On smaller screens, the copy appears first and the illustration stacks below it. The SVG keeps a fixed view box and scales with `width: 100%`, so it remains crisp at every density.

The compact variant reduces the scene height, background grid density, and descriptive copy spacing for use inside panels or small empty cards.

## Accessibility

- The heading and description remain real HTML text, not text embedded in SVG.
- The SVG is decorative and hidden from assistive technology.
- The scene wrapper has a concise English accessible label describing the robot building the page.
- The hover response is also available through keyboard focus.
- `prefers-reduced-motion: reduce` disables looping transforms and scanner travel while preserving a static finished composition.
- Color is not the only progress signal; the visible copy explicitly says the page is coming soon.

## Failure Behavior

The component has no network, media, canvas, or third-party animation dependency. If CSS animation is unavailable, the inline SVG still renders as a complete static illustration. If custom props are omitted, the default English copy always produces a usable empty state.

## Verification and Acceptance

Automated regression tests verify:

- the shared component exposes stable theme and animation hooks
- default customer-facing copy is English only
- Light and Dark palettes are page-scoped
- reduced-motion rules disable the looping animations
- `PlaceholderPage` composes the reusable robot instead of the old text-only state

Local acceptance requires:

- focused regression tests pass after first demonstrating the missing behavior
- TypeScript validation and a production build pass
- `/coming-soon` is visually checked in Light and Dark themes at desktop and mobile widths
- hover and keyboard focus both reveal the greeting state
- reduced-motion mode produces a stable static scene
- the browser console contains no errors

