# Master Four-Camera Live Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Master-only three-front-camera wall/focus experience to the existing Live Stream delivery layer while preserving Aegies and Navi behavior.

**Architecture:** Extend the shared robot-model normalizer so delivery APIs can identify an externally provisioned Master session. Store the active Master's validated view preference through a session-bound API, render one existing LiveKit program track with Master-only controls, and provide a gateway contract that maps wall/focus preferences to the one-4K-output compositor. A development-only preview flag makes the UI reviewable without robot hardware.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, LiveKit client, Node test runner, Supabase REST, Tailwind CSS.

## Global Constraints

- Aegies and Navi Live Stream behavior must remain unchanged.
- Use only Front Main, Front Left, and Front Right; exclude Rear View, RGB-D Color, Depth Map, and LiDAR 3D.
- Publish exactly one output track with a maximum 3840x2160 frame size.
- Wall mode allocates 1920x1080 to each of three quadrants; focus mode enables one camera at up to native 3840x2160.
- Master controls appear only for an active Master session, except under an explicit development-only local preview flag.
- Do not enable public Master booking, code execution, or robot motion.

---

### Task 1: Master camera domain contract

**Files:**
- Create: `lib/master-live-camera.ts`
- Create: `scripts/master-live-camera.test.mjs`
- Modify: `features/eaic/02-unified-api/resources-runs/agentech-robot-model.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `MASTER_LIVE_CAMERAS`, `normalizeMasterCameraId(value)`, `normalizeMasterViewSelection(value)`, `MasterCameraId`, and `MasterViewSelection`.
- Produces: `normalizeAgentechRobotModel("Master") === "Master"` without changing Aegies/Navi aliases.

- [ ] **Step 1: Write failing Node tests** for the three-item allowlist, excluded sensor IDs, wall/focus validation, invalid fallback to wall, and robot-model normalization.
- [ ] **Step 2: Run `node --test scripts/master-live-camera.test.mjs`** and confirm missing-module or failed-assertion output.
- [ ] **Step 3: Implement the immutable camera metadata and normalization functions** with `wall` as the safe fallback and an allowlisted camera required for `focus`.
- [ ] **Step 4: Add `test:master-live-camera` to `package.json` and the aggregate `test` script.**
- [ ] **Step 5: Run the focused test and `npm run typecheck`.**
- [ ] **Step 6: Commit the domain contract.**

### Task 2: Session-bound Master viewing state API

**Files:**
- Create: `lib/master-live-camera-state.ts`
- Create: `app/api/master-live-camera/route.ts`
- Create: `scripts/master-live-camera-api.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `MasterViewSelection`, `normalizeMasterViewSelection`, signed-in account cookies, and `getActiveRobotViewingSession(email)`.
- Produces: authenticated `GET` and `POST /api/master-live-camera`; POST accepts `{ mode: "wall" }` or `{ mode: "focus", cameraId: MasterCameraId }`.
- Produces: process-local state keyed by active session ID, suitable for local gateway polling; state expires when the active session no longer matches.

- [ ] **Step 1: Write failing policy tests** proving non-Master sessions, invalid cameras, missing authentication, and expired session IDs cannot mutate state.
- [ ] **Step 2: Run the API policy test and confirm failure.**
- [ ] **Step 3: Implement a small state module** with `getMasterViewSelection(sessionId)` and `setMasterViewSelection(sessionId, selection)`; default to `{ mode: "wall" }`.
- [ ] **Step 4: Implement the route** using the same account/session authentication boundaries as the LiveKit token route and return 403 for non-Master sessions.
- [ ] **Step 5: Run focused tests, lint, and typecheck.**
- [ ] **Step 6: Commit the authenticated state API.**

### Task 3: Master-only website controls

**Files:**
- Create: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Create: `scripts/master-live-camera-ui.test.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/live-robot-camera.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: active robot model and the API from Task 2.
- Produces: `MasterLiveCameraControls` with Wall and three Focus choices, actual-output labeling, pending/error status, and no additional video element or LiveKit connection.

- [ ] **Step 1: Write failing source-contract tests** asserting Master-only gating, all three labels, exclusions, one shared `<video>`, and unchanged Aegies/Navi copy branches.
- [ ] **Step 2: Run the UI contract test and confirm failure.**
- [ ] **Step 3: Implement the focused controls component** with accessible pressed states, POST selection, safe rollback/error copy, and responsive layout.
- [ ] **Step 4: Integrate it only when `activeRobotModel === "Master"`; keep the existing video lifecycle and Aegies capture/Navi paths intact.**
- [ ] **Step 5: Add `NEXT_PUBLIC_MASTER_CAMERA_PREVIEW=1` support only when `NODE_ENV === "development"`; this may preview controls locally but must not mint tokens or claim a live feed.**
- [ ] **Step 6: Run focused tests, lint, typecheck, and build.**
- [ ] **Step 7: Commit the Master-only UI.**

### Task 4: Gateway compositor contract and operator documentation

**Files:**
- Create: `scripts/master-camera-program.mjs`
- Create: `scripts/master-camera-program.test.mjs`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: local Master Robot Vision `/robot` relay, authenticated Master selection API, and the three domain camera topics.
- Produces: one local 3840x2160 browser-program page for OBS: three-view labeled wall or selected-camera focus; uses newest frames only and shows labeled unavailable placeholders.

- [ ] **Step 1: Write failing tests** for canvas geometry, three-topic allowlist, focus subscription set, unavailable placeholders, and rejection of rear/RGB-D/depth/LiDAR.
- [ ] **Step 2: Run the focused test and confirm failure.**
- [ ] **Step 3: Implement pure program-layout and subscription-selection functions** exported by the script without starting hardware during import.
- [ ] **Step 4: Implement the supervised local HTTP/browser program** behind an explicit start command; connect only to the loopback Master Vision relay, keep latest frames, and expose no SDK endpoint.
- [ ] **Step 5: Document environment variables, OBS browser-source setup, wired robot requirement, and the later supervised hardware acceptance checklist.**
- [ ] **Step 6: Run gateway tests and the full offline verification suite.**
- [ ] **Step 7: Commit the gateway program and documentation.**

### Task 5: Local visual verification

**Files:**
- Modify only if verification reveals a defect in Task 3 files.

**Interfaces:**
- Consumes: the development-only preview flag.
- Produces: a running local Next.js URL showing the Master controls and a verified clean browser console.

- [ ] **Step 1: Start Next.js with `NEXT_PUBLIC_MASTER_CAMERA_PREVIEW=1` on an available local port.**
- [ ] **Step 2: Open the Live Stream route in the in-app browser.**
- [ ] **Step 3: Verify desktop and narrow layouts, all three camera choices, wall/focus interaction, waiting-state honesty, and no console errors.**
- [ ] **Step 4: Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`; record exact results.**
- [ ] **Step 5: Leave the local server running and provide the URL for user review.**
