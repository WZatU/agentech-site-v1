# Agentech UI Change Playbook

This is the fast path for recurring Agentech website visual changes. It records the approaches already proven in this repository so a later task can start from the correct files, tests, and verification steps without rediscovering them.

## 1. Start From the Exact Page

1. Record the route shown in the browser or screenshot.
2. Find the route and visible copy with `rg` rather than scanning the whole repository.
3. Inspect the page component, its page-level theme scope, and the relevant block in `app/globals.css`.
4. Check `git status` and preserve unrelated user changes.

Useful searches:

```bash
rg -n "VISIBLE COPY|data-.*hero|theme-page" app components lib
rg -n "data-theme=|opacity|filter|background:.*gradient" app/globals.css
```

## 2. Theme Architecture

- Theme preference is controlled by `components/theme-toggle.tsx` and the helpers in `lib/theme.ts`.
- Page palettes belong under a stable page scope such as `.robotics-theme-page`, `.education-grade-theme`, `.ff-immersion`, or `.eaic-task-theme`.
- Light canvases use `#f5f4f1`.
- Use semantic `data-*` hooks for visual regions, for example `data-robotics-hero-image` and `data-robotics-hero-overlay`.
- Avoid global color overrides when only one page is wrong.
- When a route returns a standalone component early, confirm that component has its own theme scope; it may bypass a parent page scope.

## 3. Making a Hero Image Clearer

Before editing or regenerating an image, inspect the original asset. If the source is clear, trace CSS in this order:

1. Image `opacity` and `filter`.
2. Overlay opacity, direction, and stops.
3. Bottom fades and pseudo-elements.
4. `object-position`, cropping, and container size.

For a light hero with copy on the left and a robot on the right:

- Keep the source image close to full opacity.
- Use a horizontal overlay that remains opaque behind the left-side copy and becomes transparent over the robot.
- Add only modest contrast; do not sharpen or regenerate a good source asset unnecessarily.
- Leave the dark-theme treatment unchanged unless the request includes it.

Current Robotics example:

```css
:root[data-theme="light"] .robotics-theme-page [data-robotics-hero-image] {
  opacity: 0.92 !important;
  filter: contrast(1.08) saturate(0.96) !important;
}
```

## 4. Reusable Navigation Patterns

- Detail-page return controls use `components/history-back-button.tsx` so both the page button and the browser Back control follow actual history.
- Keep a fallback route for direct visits with no usable history.
- Do not replace `Back to top` or form-internal back actions when standardizing history buttons.
- Shared header visibility and homepage-only theme-switcher behavior belong in `lib/site-header-visibility.ts`, with tests in `lib/site-header-visibility.test.ts`.

## 5. Tests Before the Fix

Add the smallest failing regression test before production code. Existing theme assertions live in `lib/theme-page-scopes.test.ts`.

Focused gates:

```bash
pnpm test:theme
pnpm test:site-header-visibility
pnpm typecheck
pnpm build
```

For a CSS regression test, assert the page exposes a stable `data-*` hook and that its scoped rule contains the intended behavior. Watch the test fail for the missing behavior, make the smallest change, then watch it pass.

## 6. Browser Verification

1. Start current code on a free port; port `3000` may contain a stale `next start`, so use `3001` when needed.
2. Open the exact route, not only the homepage.
3. Select the requested theme and inspect computed background, color, opacity, and overflow.
4. Check the page at desktop and mobile widths when layout is affected.
5. Confirm there are no console errors.

For visual issues, compare the screenshot with the original local asset and the computed styles. Do not assume the bitmap is bad when an overlay is washing it out.

## 7. Public Review Links Without Viewer Login

For a short-lived review link, an anonymous Vercel deployment is public and does not require the reviewer to log in:

```bash
pnpm dlx vercel@latest deploy --temporary --yes
```

Important:

- Do not add `--project` to an anonymous temporary deployment. It can produce a URL that redirects to Vercel authentication.
- Anonymous links expire in roughly one hour.
- If the anonymous alias is being reused with little time remaining, deploy from a temporary copy with a unique package name. Exclude `.git`, `.vercel`, `.next`, and `node_modules` from the copy.
- Never share the Vercel claim URL.
- A permanent link requires an authenticated Vercel project, but viewers still do not need accounts when Deployment Protection is disabled.

Verify the final URL before sharing it:

```bash
curl -L -sS -o /tmp/agentech-public.html -w '%{http_code}\n%{url_effective}\n' "PUBLIC_URL"
rg -i "vercel authentication|authentication required|log in to vercel|continue with email" /tmp/agentech-public.html
```

Success means HTTP `200`, the effective URL remains the Agentech URL, the expected page content is present, and the login-gate search returns no matches.

## 8. Completion Checklist

- Requested route matches the screenshot and stated behavior.
- Only the requested theme/page changed.
- Focused test failed before the fix and passes after it.
- Typecheck and production build pass.
- Real-browser route and console are clean.
- Public URL was checked without authentication.
- Temporary-link expiration is stated clearly to the user.

## Common Time-Wasting Mistakes

- Editing the image before checking CSS opacity and overlays.
- Applying a global theme rule for a single page.
- Verifying only localhost after creating a public link.
- Treating HTTP `200` as sufficient when the response body is actually a Vercel login page.
- Redeploying the same anonymous alias without checking its remaining expiration time.
- Running a stale server on port `3000` and assuming it contains the latest code.
