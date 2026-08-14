# Master Gateway Session Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure unrelated active robot sessions cannot hide a valid Master test from the production camera gateway.

**Architecture:** Build the protected PostgREST query in the Master gateway-session module and consume it from the route. Filter `robot_model=eq.Master` before ordering and limiting rows.

**Tech Stack:** Next.js 15, TypeScript, Node test runner, Supabase PostgREST.

## Global Constraints

- Keep the Master test duration at three minutes.
- Preserve gateway bearer authorization and existing active-status checks.
- Do not affect Aegies or Navi streaming.

---

### Task 1: Filter the Master gateway query

**Files:**
- Modify: `lib/master-live-camera-gateway-session.ts`
- Modify: `app/api/master-live-camera/gateway/route.ts`
- Test: `scripts/master-live-camera-gateway.test.mjs`

**Interfaces:**
- Produces: `buildMasterGatewaySessionQuery(now: Date): string`
- Consumes: the returned query in the protected gateway route.

- [ ] **Step 1: Write the failing regression test**

Assert that the query equals a hand-derived PostgREST query containing `robot_model=eq.Master` before `limit=10`.

- [ ] **Step 2: Verify RED**

Run `npm run test:master-live-camera-gateway`; expect failure because the query builder does not exist.

- [ ] **Step 3: Implement the minimal query builder and route integration**

Return the time bounds, `robot_model=eq.Master`, selected columns, ordering, and limit; replace the inline query in the route.

- [ ] **Step 4: Verify GREEN and production build**

Run `npm run test:master-live-camera-gateway`, `npm run typecheck`, and `npm run build`.

- [ ] **Step 5: Commit, push, deploy, and verify**

Commit the focused files, push the production branch, deploy with Vercel, and confirm AGENTECH01 receives `active: true` during the Master test.
