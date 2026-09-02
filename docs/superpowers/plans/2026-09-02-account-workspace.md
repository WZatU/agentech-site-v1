# Account Workspace Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan inline. Preserve the existing working tree and do not commit or publish without a separate request.

**Goal:** Bring `/account` into the approved Agentech visual system without changing account behavior.

**Architecture:** A route-scoped stylesheet adapts the shared dashboard's legacy utility colors to semantic theme tokens. Stable data attributes style the header, tabs, overview and controls; scheduling routes keep their existing appearance.

**Tech Stack:** Next.js 15, React 19, Tailwind, CSS, Node test runner.

**Spec:** User-approved design: warm `#f5f4f1` canvas; white cards with `#d8d3ca` borders; `#111111` titles, `#526174` secondary text and `#1a73e8` accent; restrained dark counterparts. Oxanium only for the Account title, Manrope for interface and personal information, IBM Plex Mono 400/500 for metrics and identifiers. Black primary buttons with 12px corners. Flatten metrics; remove redundant dashboard sign-out/avatar and letter tab icons. Preserve authentication, account data, tab behavior and all existing unrelated changes.

## Global Constraints

- No authentication, API, data or production changes.
- `/account` scope only; keep scheduling and create-profile routes unchanged.
- Existing `previewProfile` fixtures are development-only; never submit fixture forms.
- Test before code; run typecheck and production build sequentially.

### Task 1: Account visual contract

**Files:** Create `scripts/account-workspace-theme.test.mjs`, `app/account/account-workspace.css`; modify `app/account/page.tsx`, `components/account-dashboard.tsx`.

- [x] Add CSS regression tests using PostCSS: `assert.equal(declarations('[data-account-metric-value]')['font-weight'], '500')`; verify route scope, typography, tokens, primary controls, and dark semantic states.
- [x] Run `node --test scripts/account-workspace-theme.test.mjs` and observe the missing account theme contract.
- [x] Add route hook `data-account-workspace` and remove this route's legacy `account-white-page` class. Import the account stylesheet here only.
- [x] Add semantic hooks to dashboard regions. Flatten metric tiles, make tabs text/count, keep only the top avatar and global sign-out on this route. Keep handlers unchanged.
- [x] Apply scoped CSS, e.g. `[data-account-workspace] { background: var(--color-canvas); }` and `[data-account-workspace] [data-account-title] { font-family: var(--font-brand); font-weight: 600; }`. Map legacy status colors to accessible success/warning/danger tokens, preserve code surfaces, and keep all controls keyboard-visible.
- [x] Rerun targeted visual and account-selection tests; run `pnpm typecheck`, then the production build. Final build verified in an isolated source copy because another concurrent build removed `.next/build-manifest.json` in the shared workspace. Source files compared byte-for-byte.

### Task 2: Browser and regression review

- [x] Verify the existing teacher preview fixture in local development, then select Developer Lab (the developer fixture redirects to its gateway-owner admin). Inspect Light/Dark fonts, palette, 12px button corners, and flat metrics.
- [x] Check 390px mobile layout, horizontally scrollable tabs, edit/cancel only, account/profile/billing/history/code/request/invoice views, and keyboard focus. No data saved or sessions scheduled.
- [x] Check unauthenticated `/account` still requires sign-in, and production ignores `previewProfile`.
- [x] Review diff for functional changes and unrelated edits. Record reusable theme/testing entrypoints in the UI playbook.
- [x] Show the completion modal and provide the local result; explicitly state that it has not been pushed.
