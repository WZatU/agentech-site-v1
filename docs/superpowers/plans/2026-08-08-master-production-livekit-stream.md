# Master Production LiveKit Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Master's approved four-camera program continuously from AGENTECH01 to the existing `agentech-robot-lab` LiveKit Cloud project and display it on the production Vercel website without using the developer laptop.

**Architecture:** A local gateway program on AGENTECH01 consumes the existing authenticated Master Robot Vision relay at `ws://127.0.0.1:4175/robot`, paints one 3840x2160 browser program, and exposes it to an OBS browser source. OBS sends exactly one track through a LiveKit Cloud ingress. The Vercel API stores session-bound wall/focus state in Supabase, and AGENTECH01 polls that authenticated state; the public browser only subscribes to LiveKit.

**Tech Stack:** Next.js 15, TypeScript, Supabase REST, LiveKit Cloud, OBS Studio/WebSocket, Node.js, coBridge WebSocket, Windows Task Scheduler.

## Global Constraints

- Show only Front Main, Front Left, Front Right, and RGB-D Color.
- Never show Rear View, Depth Map, or LiDAR.
- Publish exactly one maximum-3840x2160 LiveKit video track.
- Wall mode uses four 1920x1080 allocations; focus mode subscribes only to the selected camera.
- Master controls exist only during an active Master session.
- Do not change Aegies or Navi rendering, execution, streaming, or session behavior.
- Never commit LiveKit, Supabase, robot, OBS, or Vercel secrets.
- The developer laptop is not part of the production path.

---

### Task 1: Persist Master View State for Serverless Vercel

**Files:**
- Create: `supabase/migrations/202608080001_master_live_camera_state.sql`
- Modify: `lib/master-live-camera-state.ts`
- Modify: `app/api/master-live-camera/route.ts`
- Modify: `scripts/master-live-camera-state.test.mjs`

**Interfaces:**
- Produces: `getMasterViewSelection(sessionId: number): Promise<MasterViewSelection>`
- Produces: `setMasterViewSelection(sessionId: number, value: unknown): Promise<MasterViewSelection>`
- Produces: `clearExpiredMasterViewSelections(now?: Date): Promise<void>`
- Consumes: server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Write a failing state test**

Use an injected in-memory fetch adapter and assert that a missing row returns `{ mode: "wall" }`, a valid focus write upserts one normalized row, and `rear-view` is stored as wall. Also assert the module never references client-side environment variables.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm run test:master-live-camera`

Expected: FAIL because the current state API is synchronous and process-local.

- [ ] **Step 3: Add the migration and async repository**

Create a table with `session_id bigint primary key`, `mode text check (mode in ('wall','focus'))`, nullable `camera_id` constrained to the four IDs, `expires_at timestamptz not null`, and `updated_at timestamptz not null default now()`. Enable RLS and add no public policies; only the service role accesses it.

Implement REST calls with these exact payloads:

```ts
type StoredMasterSelection = {
  session_id: number;
  mode: "wall" | "focus";
  camera_id: MasterCameraId | null;
  expires_at: string;
};
```

- [ ] **Step 4: Await persistence in the authenticated route**

Keep the existing account/session checks, reject non-Master sessions, derive `expires_at` from the active session end, and await repository reads/writes. Do not alter `/api/livekit-token` authorization.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:master-live-camera && npm run typecheck`

Commit: `feat: persist Master camera selections`

### Task 2: Add a Private Gateway Control Endpoint

**Files:**
- Create: `app/api/master-live-camera/gateway/route.ts`
- Create: `lib/master-live-camera-gateway-auth.ts`
- Create: `scripts/master-live-camera-gateway.test.mjs`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `Authorization: Bearer ${MASTER_CAMERA_GATEWAY_SECRET}`.
- Produces: `{ active: false } | { active: true; sessionId: number; roomName: string; selection: MasterViewSelection; expiresAt: string }`.

- [ ] **Step 1: Write failing authentication and scope tests**

Test missing/wrong bearer tokens as 401, no active Master session as `{ active: false }`, and an active Master session as the exact response above. Assert Aegies and Navi sessions never become active gateway responses.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test scripts/master-live-camera-gateway.test.mjs`

- [ ] **Step 3: Implement constant-time bearer validation and the route**

Use `timingSafeEqual` after equal-length validation. Query the currently active Master booking using the same server-side session source used by the viewer token route, read its persisted selection, and return cache-control `no-store`.

- [ ] **Step 4: Add the test script and environment contract**

Add `test:master-live-camera-gateway` to `package.json` and document `MASTER_CAMERA_GATEWAY_SECRET` and `MASTER_CAMERA_GATEWAY_URL` in `.env.example` without values.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:master-live-camera-gateway && npm run typecheck`

Commit: `feat: add private Master gateway control API`

### Task 3: Build the AGENTECH01 4K Program Page

**Files (SDK repository):**
- Create: `agentech/robots/master/master vision app/src/master-program/MasterProgram.jsx`
- Create: `agentech/robots/master/master vision app/src/master-program/master-program.css`
- Create: `agentech/robots/master/master vision app/src/master-program/latest-frame.js`
- Create: `agentech/robots/master/master vision app/src/master-program/latest-frame.test.mjs`
- Modify: `agentech/robots/master/master vision app/src/App.jsx`

**Interfaces:**
- Consumes: the existing local relay URL and the four topic constants from `src/lib/sensors.js`.
- Consumes: `GET /gateway-state` from the local share server.
- Produces: `/master-program` at a fixed 3840x2160 canvas for OBS.

- [ ] **Step 1: Write failing latest-frame and allowlist tests**

Assert each camera has at most one decode in flight, superseded frames are discarded, focus mode requests exactly one topic, wall mode requests exactly four approved topics, and rear/depth/LiDAR never appear.

- [ ] **Step 2: Run the SDK tests and verify failure**

Run: `npm test -- --test-name-pattern="Master program"`

- [ ] **Step 3: Implement the fixed program canvas**

Render a black 3840x2160 canvas. Wall rectangles are `(0,0,1920,1080)`, `(1920,0,1920,1080)`, `(0,1080,1920,1080)`, and `(1920,1080,1920,1080)`. Focus mode letterboxes the selected source into the full canvas. Use `createImageBitmap`, retain previous pixels, and label unavailable quadrants without clearing working cameras.

- [ ] **Step 4: Wire selection changes without reconnect storms**

Wall-to-focus unsubscribes the three non-selected channels; focus-to-wall restores all four. Ignore duplicate selection revisions and reconnect with bounded 1s/2s/5s backoff.

- [ ] **Step 5: Verify and commit in the SDK repository**

Run: `npm test && npm run build`

Commit: `feat: add Master 4K production program`

### Task 4: Relay Authenticated Vercel State Locally

**Files (SDK repository):**
- Modify: `agentech/robots/master/master vision app/server/share-server.cjs`
- Modify: `agentech/robots/master/master vision app/server/share-server.test.cjs`
- Modify: `agentech/robots/master/master vision app/.env.example`

**Interfaces:**
- Consumes: `MASTER_CAMERA_GATEWAY_URL`, `MASTER_CAMERA_GATEWAY_SECRET`, and a 2-second polling interval.
- Produces: loopback-only `GET /gateway-state` containing the last validated active state.

- [ ] **Step 1: Write failing polling/security tests**

Assert bearer auth is sent only to the configured HTTPS origin, responses are schema-validated, expired/non-Master states become inactive, failures retain the last state for at most 10 seconds, and `/gateway-state` is available only on the existing loopback relay.

- [ ] **Step 2: Run the server tests and verify failure**

Run: `node --test server/share-server.test.cjs`

- [ ] **Step 3: Implement bounded state polling**

Never log the bearer token. Apply a 3-second request timeout, exponential retry capped at 10 seconds, and an inactive state after the stale deadline.

- [ ] **Step 4: Verify and commit in the SDK repository**

Run: `npm test`

Commit: `feat: sync Master program state from website`

### Task 5: Configure One LiveKit Ingress and OBS Scene

**Files:**
- Create: `docs/operations/master-livekit-production.md`
- Create: `scripts/configure-master-obs.ps1`
- Create: `scripts/configure-master-obs.test.mjs`

**Interfaces:**
- Consumes: LiveKit ingress URL/key stored only as AGENTECH01 user environment variables.
- Produces: OBS scene `Master Live Program`, browser source URL `http://127.0.0.1:4175/master-program`, canvas/output 3840x2160, and exactly one video output.

- [ ] **Step 1: Write a failing configuration contract test**

Assert the script creates/updates only the named Master scene/source, uses 3840x2160, never embeds secrets, and leaves existing Aegies/Navi scenes unchanged.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test scripts/configure-master-obs.test.mjs`

- [ ] **Step 3: Create one LiveKit Cloud ingress**

In the existing `agentech-robot-lab` project, create a single ingress for room `master-live-1` and participant identity `master-gateway`. Store its URL/key in AGENTECH01 user environment variables and never in repository files.

- [ ] **Step 4: Implement idempotent OBS configuration**

Use OBS WebSocket to create or update only `Master Live Program`, preserve all unrelated scenes, set the browser source dimensions to 3840x2160, and configure the ingress output from environment variables.

- [ ] **Step 5: Verify and commit**

Run: `node --test scripts/configure-master-obs.test.mjs`

Commit: `ops: configure Master LiveKit ingress`

### Task 6: Make Master Publishing Session-Aware in the Existing Watchdog

**Files:**
- Modify: `scripts/robot-stream-bridge.mjs`
- Modify: `scripts/robot-stream-bridge.test.mjs`
- Modify: `scripts/install-robot-stream-watchdog.ps1`

**Interfaces:**
- Consumes: normalized robot model `master` without changing existing `aegis`/`navi` branches.
- Produces: OBS scene selection `Master Live Program` only for active Master sessions.

- [ ] **Step 1: Write failing model-isolation tests**

Assert Master sessions select the Master scene and do not launch Aegies SSH or Navi SDK runners. Assert all existing Aegies/Navi fixtures produce byte-for-byte equivalent action plans and scene decisions.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:robot-stream-bridge`

- [ ] **Step 3: Add the minimal Master branch**

Recognize `master`, activate `Master Live Program`, start OBS only inside the booking window, and stop it at session end. Keep existing Aegies/Navi branches unchanged.

- [ ] **Step 4: Persist only required gateway variables**

Extend the installer allowlist with `MASTER_CAMERA_GATEWAY_URL`, `MASTER_CAMERA_GATEWAY_SECRET`, and the LiveKit ingress variables. Do not print their values.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:robot-stream-bridge && npm test`

Commit: `feat: publish Master sessions through LiveKit`

### Task 7: Production Website and Vercel Configuration

**Files:**
- Modify: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/live-robot-camera.tsx`
- Modify: `scripts/master-live-camera-ui.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: the existing `/api/livekit-token` response and one remote LiveKit video track.
- Produces: Master wall/focus controls synchronized from `GET /api/master-live-camera`.

- [ ] **Step 1: Write failing production UI tests**

Assert direct coBridge canvases remain development-preview-only, production Master uses the existing single `<video>`, controls load server selection on session change, and Aegies/Navi copy and rendering remain unchanged.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm run test:master-live-camera`

- [ ] **Step 3: Synchronize control state**

Fetch the current selection when an active Master session begins, retain optimistic POST behavior with rollback, and do not expose relay URLs in production bundles.

- [ ] **Step 4: Configure Vercel secrets**

Set `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_ROOM_NAME=master-live-1`, and `MASTER_CAMERA_GATEWAY_SECRET` for Preview and Production. Use the linked Vercel project and never write values to `.env` files tracked by Git.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck && npm run build`

Commit: `feat: enable production Master LiveKit viewing`

### Task 8: Install, Deploy, and Verify End-to-End

**Files:**
- Modify: `docs/operations/master-livekit-production.md`

**Interfaces:**
- Produces: boot-persistent AGENTECH01 relay/publisher and a verified Vercel production deployment.

- [ ] **Step 1: Install the tested SDK build on AGENTECH01**

Back up the current Master Vision application directory, install the committed build, preserve the existing wired relay scheduled task, and start the updated relay. Verify `GET /health` and `/gateway-state` without exposing secrets.

- [ ] **Step 2: Configure OBS and boot recovery**

Run the idempotent OBS configuration script and watchdog installer. Reboot-recovery acceptance requires the relay, state poller, OBS, and publisher to recover without the developer laptop.

- [ ] **Step 3: Create a Vercel preview deployment**

Link to the existing project, pull Preview settings, build locally, deploy the prebuilt artifact, and record the immutable preview URL.

- [ ] **Step 4: Run preview acceptance tests**

Verify sign-in/session gating, four approved wall views, every focus selection, one LiveKit track, no rear/depth/LiDAR, bounded reconnect, and unchanged Aegies/Navi pages. Confirm no browser console errors.

- [ ] **Step 5: Promote the verified artifact to production**

Use `vercel promote <verified-preview-url>`, then inspect the production deployment and scan runtime logs for errors.

- [ ] **Step 6: Verify physical disconnect boundaries**

Confirm the developer laptop can be shut down without affecting the stream. Confirm disconnecting Master-to-AGENTECH01 Ethernet changes the Master panel to unavailable and reconnecting restores it automatically.

- [ ] **Step 7: Final commit and operational handoff**

Update the operations document with the verified project name, room name, task names, health endpoints, restart commands, and rollback steps, excluding all secrets.

Commit: `docs: document Master production streaming operations`
