# Coming Soon Robot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original, reusable English-only wireframe robot empty state that animates like a small engineer assembling an unfinished Agentech page.

**Architecture:** A server-rendered React component owns the semantic copy and a dependency-free inline SVG; a colocated global CSS file owns scoped theme variables, responsive layout, animation, hover/focus response, and reduced-motion behavior. The existing `PlaceholderPage` becomes the compatibility wrapper, while `/coming-soon` provides an unlisted visual-review route.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.8, inline SVG, CSS keyframes, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-03-coming-soon-robot-design.md`

## Global Constraints

- All customer-facing copy is English; the component must contain no Chinese text.
- The illustration is an original inline SVG and has no raster, canvas, network, Lottie, GIF, video, or third-party animation dependency.
- Light canvas is exactly `#f5f4f1`; dark canvas is exactly `#07111f`.
- Theme selectors stay scoped under `[data-coming-soon-robot]` and stable `data-coming-soon-*` hooks.
- Hover and keyboard focus reveal the same greeting state; the scene has no click action.
- `prefers-reduced-motion: reduce` disables looping transforms and scanner travel while preserving the static illustration.
- The first change does not replace unfinished routes in bulk and does not add `/coming-soon` to navigation or the sitemap.
- Preserve unrelated worktree changes and stage only the files named by each task.

---

### Task 1: English Copy Contract and Wireframe Scene

**Files:**
- Create: `components/coming-soon-robot.tsx`
- Create: `components/coming-soon-robot.css`
- Create: `lib/coming-soon-robot.test.ts`

**Interfaces:**
- Consumes: global `data-theme` value already maintained by `components/theme-toggle.tsx` and `lib/theme.ts`.
- Produces: `ComingSoonRobot(props: ComingSoonRobotProps): JSX.Element`, where `ComingSoonRobotProps` contains optional `eyebrow`, `title`, `description`, `compact`, and `className` properties.

- [ ] **Step 1: Write the failing component contract test**

Create `lib/coming-soon-robot.test.ts` with the shared file reader and the first test:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

test("the coming soon robot exposes English copy and stable scene hooks", async () => {
  const component = await readWorkspaceFile("components/coming-soon-robot.tsx");

  for (const copy of [
    "COMING SOON",
    "Building at full speed.",
    "Our little engineer is wiring up this page. Check back soon.",
    "Oh—hi! You caught me building."
  ]) {
    assert.match(component, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(component, /[\u3400-\u9fff]/, "customer-facing component copy must stay English-only");

  for (const hook of [
    "data-coming-soon-robot",
    "data-coming-soon-copy",
    "data-coming-soon-scene",
    "data-coming-soon-speech",
    "data-coming-soon-head",
    "data-coming-soon-visor",
    "data-coming-soon-drawing-arm",
    "data-coming-soon-wave-arm",
    "data-coming-soon-scanner",
    "data-coming-soon-status-light"
  ]) {
    assert.match(component, new RegExp(hook));
  }

  assert.match(component, /tabIndex=\{0\}/);
  assert.match(component, /aria-label="Wireframe robot building this page"/);
  assert.match(component, /<svg[\s\S]*aria-hidden="true"/);
});
```

- [ ] **Step 2: Run the focused test and verify the missing component is the failure**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern="English copy" lib/coming-soon-robot.test.ts
```

Expected: FAIL with `ENOENT` for `components/coming-soon-robot.tsx`.

- [ ] **Step 3: Create the semantic component and complete SVG scene**

Create `components/coming-soon-robot.tsx`. Keep the visible text outside the SVG and use this component boundary:

```tsx
import "./coming-soon-robot.css";

export type ComingSoonRobotProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

export function ComingSoonRobot({
  eyebrow = "COMING SOON",
  title = "Building at full speed.",
  description = "Our little engineer is wiring up this page. Check back soon.",
  compact = false,
  className = ""
}: ComingSoonRobotProps) {
  return (
    <section
      data-coming-soon-robot
      data-compact={compact ? "true" : "false"}
      className={className}
    >
      <div data-coming-soon-copy>
        <p data-coming-soon-eyebrow>{eyebrow}</p>
        <h1 className="font-display">{title}</h1>
        <p>{description}</p>
        <div data-coming-soon-progress aria-hidden="true">
          <span />
          <span />
          <span />
          <b>ASSEMBLING</b>
        </div>
      </div>

      <div
        data-coming-soon-scene
        tabIndex={0}
        role="img"
        aria-label="Wireframe robot building this page"
      >
        <p data-coming-soon-speech>Oh—hi! You caught me building.</p>
        <svg viewBox="0 0 760 620" aria-hidden="true" focusable="false">
          <g data-coming-soon-grid>
            <path d="M36 86H724M36 166H724M36 246H724M36 326H724M36 406H724M36 486H724" />
            <path d="M92 38V576M188 38V576M284 38V576M380 38V576M476 38V576M572 38V576M668 38V576" />
            <circle cx="92" cy="166" r="4" />
            <circle cx="668" cy="406" r="4" />
          </g>

          <g data-coming-soon-blueprint>
            <path d="M86 452 565 428 689 528 196 574Z" />
            <path d="m139 469 379-18 99 64-389 35Z" />
            <rect x="252" y="473" width="174" height="54" rx="8" transform="rotate(-3 252 473)" />
            <path d="m278 492 54-3M278 504l111-6M278 516l82-4" />
            <path data-coming-soon-scanner d="m149 487 421-22" />
          </g>

          <g data-coming-soon-robot-body>
            <g data-coming-soon-head>
              <path d="M258 86Q258 42 304 28H433Q482 42 490 88L477 224Q469 252 438 260H304Q271 250 263 222Z" />
              <path data-coming-soon-visor d="M286 98Q292 75 318 70H427Q454 78 458 103L450 179Q446 199 424 204H319Q296 199 291 178Z" />
              <path d="M306 55Q369 29 442 57M276 132H258M489 132H471M296 219Q370 239 454 217" />
              <path d="M315 42V67M347 34V66M381 31V65M415 35V68M447 47V72" />
              <g data-coming-soon-eyes>
                <path d="M332 118v32M412 118v32" />
              </g>
            </g>

            <g data-coming-soon-torso>
              <path d="M289 265Q371 234 455 265L490 387Q445 421 373 423Q300 421 250 388Z" />
              <path d="M305 278Q373 256 439 279L461 365Q421 386 373 388Q323 386 280 364Z" />
              <path d="M324 297H423M307 328H440M294 357H451" />
              <circle data-coming-soon-status-light cx="373" cy="333" r="12" />
              <path d="M332 399v34M414 399v34M332 417h82" />
            </g>

            <g data-coming-soon-drawing-arm>
              <circle cx="273" cy="281" r="38" />
              <path d="M251 300 199 368Q190 384 204 397L235 413Q249 419 259 405L300 334" />
              <circle cx="226" cy="403" r="27" />
              <path d="m214 421-23 56 18 8 29-55M203 475l-7 34M214 480l-2 34M226 481l5 29" />
              <path data-coming-soon-stylus d="m185 508 90-33" />
            </g>

            <g data-coming-soon-wave-arm>
              <circle cx="469" cy="281" r="38" />
              <path d="M485 306 526 376Q534 390 523 402L494 421Q480 429 469 413L443 344" />
              <circle cx="507" cy="415" r="27" />
              <path d="m516 432 27 42-16 11-32-42M543 473l22 28M532 481l14 31M520 485l5 32" />
            </g>

            <g data-coming-soon-joints>
              <circle cx="273" cy="281" r="22" />
              <circle cx="469" cy="281" r="22" />
              <circle cx="226" cy="403" r="14" />
              <circle cx="507" cy="415" r="14" />
            </g>
          </g>

          <g data-coming-soon-sparks>
            <path d="m204 500-17-9M207 494l-3-18M214 499l13-13" />
          </g>
        </svg>
      </div>
    </section>
  );
}
```

Create `components/coming-soon-robot.css` with a minimal non-animated baseline so the new component is valid before Task 2:

```css
[data-coming-soon-robot] {
  display: grid;
  min-height: 70vh;
  align-items: center;
  gap: clamp(2rem, 6vw, 6rem);
  padding: clamp(2rem, 6vw, 6rem);
  background: #07111f;
  color: #f4f7fb;
}

[data-coming-soon-robot] svg {
  display: block;
  width: 100%;
  height: auto;
}
```

- [ ] **Step 4: Run the focused test and typecheck**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern="English copy" lib/coming-soon-robot.test.ts
```

Expected: PASS, 1 test passed.

Run:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit 0 with no TypeScript diagnostics.

- [ ] **Step 5: Commit only the component contract files**

```bash
git add components/coming-soon-robot.tsx components/coming-soon-robot.css lib/coming-soon-robot.test.ts
git commit -m "feat: add coming soon robot scene"
```

---

### Task 2: Theme, Animation, Interaction, and Reduced Motion

**Files:**
- Modify: `components/coming-soon-robot.css`
- Modify: `lib/coming-soon-robot.test.ts`

**Interfaces:**
- Consumes: the `data-coming-soon-*` hooks emitted by `ComingSoonRobot` in Task 1.
- Produces: complete `[data-coming-soon-robot]` theme variables and keyframes named `coming-soon-draw`, `coming-soon-scan`, `coming-soon-blink`, `coming-soon-breathe`, `coming-soon-look`, and `coming-soon-spark`.

- [ ] **Step 1: Add a failing visual-behavior regression test**

Append this test to `lib/coming-soon-robot.test.ts`:

```ts
test("the coming soon scene has scoped themes, interaction, and reduced motion", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");

  assert.match(css, /\[data-coming-soon-robot\][^{]*\{[^}]*--coming-soon-canvas:\s*#07111f;/);
  assert.match(
    css,
    /:root\[data-theme="light"\] \[data-coming-soon-robot\][^{]*\{[^}]*--coming-soon-canvas:\s*#f5f4f1;/
  );

  for (const name of ["draw", "scan", "blink", "breathe", "look", "spark"]) {
    assert.match(css, new RegExp(`@keyframes coming-soon-${name}`));
  }

  assert.match(css, /\[data-coming-soon-scene\]:(?:hover|focus)[\s\S]*\[data-coming-soon-speech\]/);
  assert.match(css, /\[data-coming-soon-scene\]:focus-visible[^{]*\{[^}]*outline:/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none\s*!important;/
  );
});
```

- [ ] **Step 2: Run the visual-behavior test and verify it fails on the missing palette and keyframes**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern="scoped themes" lib/coming-soon-robot.test.ts
```

Expected: FAIL because the baseline stylesheet has no `--coming-soon-canvas` variable or animation keyframes.

- [ ] **Step 3: Replace the baseline stylesheet with the complete scoped visual system**

Implement these exact sections in `components/coming-soon-robot.css`:

```css
[data-coming-soon-robot] {
  --coming-soon-canvas: #07111f;
  --coming-soon-surface: #0c1a2d;
  --coming-soon-line: #e7dfcf;
  --coming-soon-muted: #9caabd;
  --coming-soon-accent: #77dcff;
  --coming-soon-accent-2: #d9ff79;
  --coming-soon-grid: rgba(231, 223, 207, 0.12);
  display: grid;
  grid-template-columns: minmax(15rem, 0.78fr) minmax(24rem, 1.22fr);
  min-height: 70vh;
  align-items: center;
  gap: clamp(2rem, 6vw, 6rem);
  padding: clamp(2rem, 6vw, 6rem);
  overflow: hidden;
  background:
    radial-gradient(circle at 74% 38%, rgba(52, 142, 190, 0.16), transparent 34rem),
    var(--coming-soon-canvas);
  color: var(--coming-soon-line);
}

:root[data-theme="light"] [data-coming-soon-robot] {
  --coming-soon-canvas: #f5f4f1;
  --coming-soon-surface: #ffffff;
  --coming-soon-line: #111820;
  --coming-soon-muted: #586575;
  --coming-soon-accent: #0b7ca7;
  --coming-soon-accent-2: #17714f;
  --coming-soon-grid: rgba(17, 24, 32, 0.11);
  background:
    radial-gradient(circle at 74% 38%, rgba(54, 170, 207, 0.13), transparent 34rem),
    var(--coming-soon-canvas);
}

[data-coming-soon-copy] {
  position: relative;
  z-index: 2;
  max-width: 34rem;
}

[data-coming-soon-eyebrow] {
  margin: 0 0 1rem;
  color: var(--coming-soon-accent);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.26em;
}

[data-coming-soon-copy] h1 {
  max-width: 10ch;
  margin: 0;
  font-size: clamp(3rem, 7vw, 6.75rem);
  font-weight: 600;
  line-height: 0.92;
  letter-spacing: -0.045em;
}

[data-coming-soon-copy] > p:last-of-type {
  max-width: 31rem;
  margin: 1.5rem 0 0;
  color: var(--coming-soon-muted);
  font-size: clamp(1rem, 1.45vw, 1.18rem);
  line-height: 1.75;
}

[data-coming-soon-progress] {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 2rem;
  color: var(--coming-soon-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
}

[data-coming-soon-progress] span {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--coming-soon-accent-2);
  animation: coming-soon-breathe 1.4s ease-in-out infinite;
}

[data-coming-soon-progress] span:nth-child(2) { animation-delay: 140ms; }
[data-coming-soon-progress] span:nth-child(3) { animation-delay: 280ms; }

[data-coming-soon-scene] {
  position: relative;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--coming-soon-line) 18%, transparent);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--coming-soon-surface) 84%, transparent);
  box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.2);
  color: var(--coming-soon-line);
  outline: none;
  isolation: isolate;
}

[data-coming-soon-scene]:focus-visible {
  outline: 2px solid var(--coming-soon-accent);
  outline-offset: 6px;
}

[data-coming-soon-scene] svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

[data-coming-soon-scene] svg path,
[data-coming-soon-scene] svg circle,
[data-coming-soon-scene] svg rect {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

[data-coming-soon-grid] { color: var(--coming-soon-grid); }
[data-coming-soon-blueprint] { color: color-mix(in srgb, var(--coming-soon-line) 62%, transparent); }
[data-coming-soon-scene] [data-coming-soon-visor] {
  fill: color-mix(in srgb, var(--coming-soon-accent) 8%, transparent);
}
[data-coming-soon-scanner],
[data-coming-soon-status-light] { color: var(--coming-soon-accent); }
[data-coming-soon-scene] [data-coming-soon-status-light] { fill: currentColor; }
[data-coming-soon-sparks] { color: var(--coming-soon-accent-2); }

[data-coming-soon-drawing-arm] {
  transform-box: fill-box;
  transform-origin: 64% 10%;
  animation: coming-soon-draw 2.8s ease-in-out infinite;
}

[data-coming-soon-wave-arm] {
  transform-box: fill-box;
  transform-origin: 18% 12%;
  transition: transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

[data-coming-soon-head] {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: coming-soon-look 6s ease-in-out infinite;
}

[data-coming-soon-eyes] {
  transform-box: fill-box;
  transform-origin: center;
  animation: coming-soon-blink 6s ease-in-out infinite;
}

[data-coming-soon-scanner] {
  stroke-width: 4 !important;
  stroke-dasharray: 90 330;
  filter: drop-shadow(0 0 8px currentColor);
  animation: coming-soon-scan 2.8s linear infinite;
}

[data-coming-soon-status-light] {
  filter: drop-shadow(0 0 10px currentColor);
  animation: coming-soon-breathe 1.8s ease-in-out infinite;
}

[data-coming-soon-sparks] {
  opacity: 0;
  animation: coming-soon-spark 2.8s ease-out infinite;
}

[data-coming-soon-speech] {
  position: absolute;
  top: 7%;
  right: 4%;
  z-index: 3;
  max-width: 12rem;
  margin: 0;
  padding: 0.8rem 1rem;
  border: 1px solid color-mix(in srgb, var(--coming-soon-accent) 55%, transparent);
  border-radius: 1rem 1rem 0.25rem 1rem;
  background: var(--coming-soon-surface);
  color: var(--coming-soon-line);
  font-size: 0.82rem;
  line-height: 1.4;
  opacity: 0;
  transform: translateY(0.75rem) scale(0.94);
  transition: opacity 220ms ease, transform 320ms ease;
  pointer-events: none;
}

[data-coming-soon-scene]:hover [data-coming-soon-speech],
[data-coming-soon-scene]:focus [data-coming-soon-speech] {
  opacity: 1;
  transform: translateY(0) scale(1);
}

[data-coming-soon-scene]:hover [data-coming-soon-drawing-arm],
[data-coming-soon-scene]:focus [data-coming-soon-drawing-arm] {
  animation-play-state: paused;
}

[data-coming-soon-scene]:hover [data-coming-soon-wave-arm],
[data-coming-soon-scene]:focus [data-coming-soon-wave-arm] {
  transform: translate(-14px, -10px) rotate(-17deg);
}

@keyframes coming-soon-draw {
  0%, 100% { transform: rotate(-1deg) translate(0, 0); }
  48% { transform: rotate(4deg) translate(8px, -2px); }
}

@keyframes coming-soon-scan {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -420; }
}

@keyframes coming-soon-blink {
  0%, 43%, 47%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(0.08); }
}

@keyframes coming-soon-breathe {
  0%, 100% { opacity: 0.42; transform: scale(0.82); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes coming-soon-look {
  0%, 35%, 65%, 100% { transform: rotate(0); }
  45%, 55% { transform: rotate(-3deg) translateY(-4px); }
}

@keyframes coming-soon-spark {
  0%, 70%, 100% { opacity: 0; transform: scale(0.7); }
  76%, 84% { opacity: 1; transform: scale(1); }
}

@media (max-width: 860px) {
  [data-coming-soon-robot] {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 2.25rem 1rem 3rem;
  }

  [data-coming-soon-copy] h1 { font-size: clamp(3rem, 15vw, 5.4rem); }
  [data-coming-soon-scene] { border-radius: 1rem; }
}

[data-coming-soon-robot][data-compact="true"] {
  min-height: 28rem;
  padding: clamp(1.5rem, 4vw, 3rem);
}

[data-coming-soon-robot][data-compact="true"] [data-coming-soon-grid] {
  opacity: 0.48;
}

@media (prefers-reduced-motion: reduce) {
  [data-coming-soon-robot] *,
  [data-coming-soon-robot] *::before,
  [data-coming-soon-robot] *::after {
    animation: none !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }

  [data-coming-soon-speech] { transform: none; }
}
```

Refine only dimensions and path weights during browser review; do not change the approved copy or add a dependency.

- [ ] **Step 4: Run both component tests and typecheck**

Run:

```bash
node --experimental-strip-types --test lib/coming-soon-robot.test.ts
```

Expected: PASS, 2 tests passed.

Run:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit the visual system**

```bash
git add components/coming-soon-robot.css lib/coming-soon-robot.test.ts
git commit -m "feat: animate coming soon robot"
```

---

### Task 3: Shared Placeholder Integration and Preview Route

**Files:**
- Modify: `components/placeholder-page.tsx`
- Create: `app/coming-soon/page.tsx`
- Modify: `lib/coming-soon-robot.test.ts`
- Modify: `lib/typography-responsibility.test.ts`

**Interfaces:**
- Consumes: `ComingSoonRobot` and `ComingSoonRobotProps` from Task 1.
- Produces: `PlaceholderPage({ title, headline?, description?, compact? })` with backward-compatible required `title`, plus the unlisted `/coming-soon` route.

- [ ] **Step 1: Add a failing integration test**

Append:

```ts
test("the shared placeholder and preview route compose the robot without entering navigation", async () => {
  const [placeholder, route, sitemap] = await Promise.all([
    readWorkspaceFile("components/placeholder-page.tsx"),
    readWorkspaceFile("app/coming-soon/page.tsx"),
    readWorkspaceFile("app/sitemap.ts")
  ]);

  assert.match(placeholder, /import \{ ComingSoonRobot \} from "@\/components\/coming-soon-robot"/);
  assert.match(placeholder, /<ComingSoonRobot/);
  assert.match(placeholder, /eyebrow=\{title\}/);
  assert.match(placeholder, /headline\?: string/);
  assert.match(route, /<PlaceholderPage\s+title="COMING SOON"/);
  assert.match(route, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.doesNotMatch(sitemap, /coming-soon/);
});
```

- [ ] **Step 2: Run the integration test and verify the missing preview route is the failure**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern="shared placeholder" lib/coming-soon-robot.test.ts
```

Expected: FAIL because `app/coming-soon/page.tsx` does not exist and the old placeholder does not compose `ComingSoonRobot`.

- [ ] **Step 3: Replace the text-only wrapper with the reusable component**

Replace `components/placeholder-page.tsx` with:

```tsx
import { ComingSoonRobot } from "@/components/coming-soon-robot";

type PlaceholderPageProps = {
  title: string;
  headline?: string;
  description?: string;
  compact?: boolean;
};

export function PlaceholderPage({
  title,
  headline,
  description,
  compact = false
}: PlaceholderPageProps) {
  return (
    <ComingSoonRobot
      eyebrow={title}
      title={headline}
      description={description}
      compact={compact}
    />
  );
}
```

- [ ] **Step 4: Create the unlisted visual-review route**

Create `app/coming-soon/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Agentech is building this experience.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ComingSoonPage() {
  return <PlaceholderPage title="COMING SOON" />;
}
```

Do not modify `app/sitemap.ts`, `lib/site-data.ts`, or the shared header.

- [ ] **Step 5: Move the shared-title typography assertion to the component that now owns the heading**

In `lib/typography-responsibility.test.ts`, remove `components/placeholder-page.tsx` from the existing `components` array in `shared public-facing title components use Display`, then add these assertions after that loop:

```ts
  const [placeholder, comingSoonRobot] = await Promise.all([
    readWorkspaceFile("components/placeholder-page.tsx"),
    readWorkspaceFile("components/coming-soon-robot.tsx")
  ]);

  assert.match(placeholder, /<ComingSoonRobot/);
  assert.match(comingSoonRobot, /font-display/);
```

This preserves the responsibility check: the wrapper delegates presentation, and the component that renders the customer-facing heading owns `font-display`.

- [ ] **Step 6: Run all focused tests and typecheck**

Run:

```bash
node --experimental-strip-types --test lib/coming-soon-robot.test.ts lib/typography-responsibility.test.ts
```

Expected: PASS. The existing shared-title test still sees `font-display` through `ComingSoonRobot`.

Run:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 7: Stage the clean integration files**

```bash
git add components/placeholder-page.tsx app/coming-soon/page.tsx lib/coming-soon-robot.test.ts
```

- [ ] **Step 8: Interactively stage only the new typography-responsibility hunk**

`lib/typography-responsibility.test.ts` already contains unrelated worktree changes. Stage only the hunk that moves the placeholder assertion:

```bash
git add -p lib/typography-responsibility.test.ts
```

Expected: accept only the hunk that reads `components/coming-soon-robot.tsx`; reject every pre-existing hunk.

- [ ] **Step 9: Verify the staged patch contains no unrelated work**

```bash
git diff --cached --check
git diff --cached --name-status
```

Expected staged files: `components/placeholder-page.tsx`, `app/coming-soon/page.tsx`, `lib/coming-soon-robot.test.ts`, and one focused hunk from `lib/typography-responsibility.test.ts`.

- [ ] **Step 10: Commit the integration**

```bash
git commit -m "feat: add coming soon page preview"
```

---

### Task 4: Production and Real-Browser Acceptance

**Files:**
- Verify: `components/coming-soon-robot.tsx`
- Verify: `components/coming-soon-robot.css`
- Verify: `components/placeholder-page.tsx`
- Verify: `app/coming-soon/page.tsx`
- Verify: `lib/coming-soon-robot.test.ts`

**Interfaces:**
- Consumes: the complete component, CSS, wrapper, and preview route from Tasks 1–3.
- Produces: verified screenshots and computed-state evidence; no source changes unless verification exposes a defect.

- [ ] **Step 1: Run whitespace, focused tests, typecheck, and production build**

Run each command separately and require exit 0:

```bash
git diff --check
node --experimental-strip-types --test lib/coming-soon-robot.test.ts lib/typography-responsibility.test.ts
node node_modules/typescript/bin/tsc --noEmit
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build
```

- [ ] **Step 2: Start the fresh production build on an unused port**

Run:

```bash
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3004
```

Expected: `Ready` and `http://127.0.0.1:3004`.

- [ ] **Step 3: Verify desktop Light and Dark appearance**

Using a named `agent-browser` session, run:

```bash
agent-browser --session coming-soon-review open http://127.0.0.1:3004/coming-soon
agent-browser --session coming-soon-review set viewport 1440 1000
agent-browser --session coming-soon-review set media light
agent-browser --session coming-soon-review screenshot output/coming-soon-light-desktop.png
agent-browser --session coming-soon-review set media dark
agent-browser --session coming-soon-review screenshot output/coming-soon-dark-desktop.png
```

Inspect both screenshots. Light must use `#f5f4f1`, Dark must use `#07111f`, the robot must be fully visible, and the English copy must not overlap the illustration.

- [ ] **Step 4: Verify the greeting interaction with pointer and keyboard**

Run:

```bash
agent-browser --session coming-soon-review hover "[data-coming-soon-scene]"
agent-browser --session coming-soon-review get styles "[data-coming-soon-speech]"
agent-browser --session coming-soon-review focus "[data-coming-soon-scene]"
agent-browser --session coming-soon-review get styles "[data-coming-soon-speech]"
```

Expected after hover and focus: the speech bubble has opacity `1`; the scene has no click navigation and focus has a visible outline.

- [ ] **Step 5: Verify mobile and reduced-motion layouts**

Run:

```bash
agent-browser --session coming-soon-review set viewport 390 844
agent-browser --session coming-soon-review set media light reduced-motion
agent-browser --session coming-soon-review screenshot output/coming-soon-light-mobile-reduced.png
agent-browser --session coming-soon-review eval "getComputedStyle(document.querySelector('[data-coming-soon-drawing-arm]')).animationName"
```

Expected: single-column composition, readable English copy, complete robot inside the viewport, and computed animation name `none`.

- [ ] **Step 6: Verify the console, close the test session, and inspect the final diff**

Run:

```bash
agent-browser --session coming-soon-review errors
agent-browser --session coming-soon-review console
agent-browser --session coming-soon-review close
git status --short
git diff --check
```

Expected: no browser errors, no malformed CSS, and no unrelated file staged by this feature.

- [ ] **Step 7: Correct only evidence-backed defects, then repeat the complete acceptance gate**

If any screenshot, computed style, test, typecheck, build, or console check fails, add the smallest failing regression assertion, apply the minimum scoped correction, and repeat Steps 1–6. Do not commit a visual correction until the complete gate passes.

- [ ] **Step 8: Commit any verified review correction**

If Step 7 changed source:

```bash
git add components/coming-soon-robot.tsx components/coming-soon-robot.css components/placeholder-page.tsx app/coming-soon/page.tsx lib/coming-soon-robot.test.ts
git commit -m "fix: refine coming soon robot presentation"
```

If Step 7 required no source correction, do not create an empty commit.
