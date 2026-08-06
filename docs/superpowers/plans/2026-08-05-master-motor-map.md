# Master Motor Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive, read-only 31-joint Master motor map with official movement limits to the EAIC Hub SDK Library.

**Architecture:** A client-safe shared joint-data module will preserve the existing server reference exports while allowing a pure TypeScript map model to join official and runtime limits with front-view marker coordinates. A small client component will render those markers over the existing Master image, provide hover/focus/tap details, and render the grouped official limit table. The existing workbench will render the component only for Master.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Node test runner.

## Global Constraints

- Download the official AimDK `joint_name_and_limit.png` into the site assets and display the complete diagram, including both front and back views and its yellow feet.
- Render exactly 31 markers: 14 arm, 12 leg, 3 waist, and 2 head.
- Keep `lib/master-robot-joint-reference.ts` as a stable server-only re-export; use a client-safe shared data module for official degree ranges, runtime radians, and the AimDK source URL.
- Present limits as reference information only; do not add controls, simulator authoring, router changes, or physical Master execution.
- Ensure hover, keyboard focus, click/tap, and a visible focus ring expose the same joint details.
- Preserve the current Master command cards and all other robot views.

---

### Task 1: Define and verify the 31-joint map model

**Files:**
- Create: `lib/master-robot-joint-data.ts`
- Modify: `lib/master-robot-joint-reference.ts`
- Create: `lib/master-motor-map.ts`
- Create: `scripts/master-motor-map.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `OFFICIAL_X2_LIMIT_GROUPS`, `RUNTIME_X2_LIMIT_GROUPS`, `X2_LIMITS_SOURCE_URL` from `lib/master-robot-joint-data.ts`.
- Produces: `MASTER_MOTOR_MARKERS: readonly MasterMotorMarker[]`, where every item has `runtimeJoint`, `displayName`, `group`, `jointNumber`, `xPercent`, `yPercent`, `officialLimit`, and `runtimeLimit`.

- [ ] **Step 1: Write a failing structural test**

Create `scripts/master-motor-map.test.mjs` using the existing TypeScript transpilation helper pattern. Assert that the map contains 31 entries, runtime joint keys are unique, marker coordinates stay inside 0–100, and its keys equal the flattened `RUNTIME_X2_LIMIT_GROUPS` key set.

```js
assert.equal(MASTER_MOTOR_MARKERS.length, 31);
assert.deepEqual(
  new Set(MASTER_MOTOR_MARKERS.map((marker) => marker.runtimeJoint)),
  new Set(RUNTIME_X2_LIMIT_GROUPS.flatMap((group) => group.joints.map((joint) => joint.joint)))
);
```

- [ ] **Step 2: Run the test and verify the missing module fails**

Run: `node --test scripts/master-motor-map.test.mjs`

Expected: FAIL because `lib/master-motor-map.ts` does not exist.

- [ ] **Step 3: Extract shared data and implement the map model**

Move the immutable official/runtime groups and source URL from `lib/master-robot-joint-reference.ts` into `lib/master-robot-joint-data.ts`; leave the server-only file as a re-export so its current imports remain valid. Create `lib/master-motor-map.ts`. Define `MasterMotorMarker` and derive each marker’s official and runtime records by matching side-specific runtime groups to the arm/leg manufacturer groups and direct waist/head groups. Supply ordered, slightly offset percentage coordinates for all 31 joints over the front-view asset. Throw during module initialization if a mapping cannot find exactly one official and one runtime joint.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test scripts/master-motor-map.test.mjs`

Expected: PASS with all 31 manufacturer/runtime mappings present.

- [ ] **Step 5: Add the test to the website test command and commit**

Add `test:master-motor-map` to `package.json` and include it in `npm test` after the existing Master preview test. Commit:

```bash
git add lib/master-robot-joint-data.ts lib/master-robot-joint-reference.ts lib/master-motor-map.ts scripts/master-motor-map.test.mjs package.json
git commit -m "feat: define Master motor map data"
```

### Task 2: Render the accessible Master motor map

**Files:**
- Create: `features/eaic/01-clients/eaic-hub/components/master-motor-map.tsx`

**Interfaces:**
- Consumes: `MASTER_MOTOR_MARKERS` and `X2_LIMITS_SOURCE_URL`.
- Produces: `MasterMotorMap`, a client component with no robot-command side effects.

- [ ] **Step 1: Add the component implementation**

Render the full official front-and-back diagram in a positioned container and place native motor buttons using diagram-relative percentages. Preserve the yellow feet from the source image. Keep `hoveredJoint` and `selectedJoint` state; display `selectedJoint ?? hoveredJoint ?? MASTER_MOTOR_MARKERS[0]` in the detail panel. Use `onMouseEnter`, `onFocus`, `onClick`, and `onBlur` so pointer, touch, and keyboard interaction expose the same details. Include the official degree range, runtime radian range, source link, and reference-only safety copy.

- [ ] **Step 2: Validate the component type-checks**

Run: `node node_modules/typescript/bin/tsc --noEmit`

Expected: PASS with no TypeScript diagnostics.

- [ ] **Step 3: Commit the component**

```bash
git add features/eaic/01-clients/eaic-hub/components/master-motor-map.tsx
git commit -m "feat: render Master motor map"
```

### Task 3: Integrate and verify the SDK Library surface

**Files:**
- Modify: `features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx`
- Test: `scripts/master-motor-map.test.mjs`

**Interfaces:**
- Consumes: `MasterMotorMap`.
- Produces: the Master-only Motor Map above Master’s command-category cards.

- [ ] **Step 1: Insert the Master-only map**

Import `MasterMotorMap` into `agentech-library-workbench.tsx`. Between the tutorial/safety row and the command-category grid, render:

```tsx
{selectedRobot === "master" ? <MasterMotorMap /> : null}
```

- [ ] **Step 2: Run the relevant automated checks**

Run:

```bash
node --test scripts/master-motor-map.test.mjs scripts/sdk-reference-consistency.test.mjs scripts/master-simulation-previews.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 3: Verify the local page**

Open `http://localhost:3000/agentech-products/eaic-hub/view-sdk#function-actions`, select Master, and verify the 31-marker image, a joint detail panel, official source link, and grouped limit table. Switch to Aegis and Navi and confirm the map is absent.

- [ ] **Step 4: Commit the integration**

```bash
git add features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx
git commit -m "feat: show Master motor limits in SDK Library"
```
