# Master Live Test Three-Minute Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce newly created internal Master view-only test sessions from 30 minutes to exactly 3 minutes.

**Architecture:** Keep `MASTER_LIVE_TEST_DURATION_MINUTES` as the single policy source and update its tests first. Then update only duration-specific UI, error, and operational copy; customer booking logic and LiveKit lifecycle code remain untouched.

**Tech Stack:** TypeScript, React 19, Next.js 15, Node.js test runner.

## Global Constraints

- Apply the three-minute duration only to the internal Master view-only test session.
- Do not change existing stored sessions retroactively.
- Do not change customer-booked Master sessions, Aegies, Navi, pricing, or LiveKit disconnect behavior.
- Preserve unrelated working-tree changes.

---

### Task 1: Change the Master Test Policy Test-First

**Files:**
- Modify: `scripts/master-live-test-access.test.mjs`
- Modify: `lib/master-live-test-access.ts`

**Interfaces:**
- Consumes: `masterLiveTestWindow(now: Date)` and `buildMasterLiveTestSessionInput(email, profile, now)`.
- Produces: new test sessions whose `scheduledEnd` is exactly three minutes after `scheduledStart`.

- [ ] **Step 1: Change the focused expectations to three minutes**

Update the authorization-window test name and expected end to `2026-08-11T18:03:00.000Z`. Update the session-input and new-session conflict-window expectations to the same end time.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scripts/master-live-test-access.test.mjs`

Expected: FAIL because production still returns `2026-08-11T18:30:00.000Z`.

- [ ] **Step 3: Apply the minimal policy change**

Change:

```ts
export const MASTER_LIVE_TEST_DURATION_MINUTES = 3;
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test scripts/master-live-test-access.test.mjs`

Expected: all tests pass.

### Task 2: Align Duration-Specific Copy and Regression Tests

**Files:**
- Modify: `features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx`
- Modify: `lib/account-records.ts`
- Modify: `lib/master-live-test-session.ts`
- Modify: `scripts/master-live-test-route.test.mjs`
- Modify: `scripts/master-live-test-ui.test.mjs`
- Modify: `docs/operations/master-livekit-production.md`

**Interfaces:**
- Consumes: the three-minute Master test policy from Task 1.
- Produces: UI, conflicts, route fixtures, and operations instructions that consistently describe three minutes.

- [ ] **Step 1: Update duration-specific tests before production copy**

Change Master test route fixtures from `18:30` to `18:03`, change the conflict message to `3-minute`, and change UI assertions from `/30-minute/i` to `/3-minute/i` while explicitly rejecting `/30-minute/i`.

- [ ] **Step 2: Run the Master test suite and verify RED**

Run: `npm run test:master-live-test`

Expected: FAIL because application copy still says `30-minute`.

- [ ] **Step 3: Update the minimal production and operations copy**

Replace duration-specific internal Master test wording from `30-minute` to `3-minute` in the listed application and operations files. Do not edit historical specs/plans or the unrelated 30-minute fallback in `app/api/master-live-camera/route.ts`.

- [ ] **Step 4: Run focused and broad verification**

Run: `npm run test:master-live-test`

Run: `npm test`

Run: `npm run typecheck`

Expected: all commands pass.

- [ ] **Step 5: Commit and push the scoped change**

Stage only the files listed in Tasks 1 and 2 plus this plan. Commit with `feat: shorten Master live test to three minutes`, verify the staged/committed file list excludes unrelated changes, and push the current branch to `origin`.
