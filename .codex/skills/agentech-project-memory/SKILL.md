---
name: agentech-project-memory
description: Load the compact Agentech project history, current state, design decisions, routes, safety boundaries, and verification commands across the five EAIC layers. Use when a new agent continues work in this repository or must decide which layer owns a change.
---

# Agentech Project Memory

Use this as a low-token handoff, not as a substitute for the current source code.

## Thirty-second startup

1. Run `git status --short`. Preserve every existing change.
2. Identify the owning EAIC layer below.
3. Read only that layer's reference file. Read a second file only for a real cross-layer dependency.
4. Inspect the named source files before editing; this memory records intent and verified patterns, not immutable implementation.

Snapshot context: 2026-09-03, branch `main`, HEAD `c98fd40`. At snapshot time the tree had 40 modified tracked files and 15 untracked files. Most of that unfinished delta is Layer 01 website/UI work and is not necessarily published.

## Committed milestone map

- `72d8686` is the grafted repository baseline containing the site, EAIC Hub, APIs, schemas, validators, simulators, trusted runners, live delivery, and initial five-layer organization.
- `25aaf4c` unified website/CLI Supabase authentication; `868e841` added the secure short-lived CLI-to-live-page handoff; `bb575df` locked trusted Navi CLI routing with tests.
- `43579e0` through `67f90c7` built the Master heartbeat contract, authenticated receiver, Hub display, production persistence, isolated credentials/storage, private bucket, and missing-bucket recovery.
- `4d0e5fe` delivered the major website/EAIC UI refresh: theme system, typography responsibilities, page scopes, navigation/history patterns, Talents/education experiences, Hub redesign, local-auth behavior, and Master web-model tooling.
- `c9b4c99` refined EAIC light/dark state handling; `753fe89` restored robust sign-in and fail-closed auth synchronization; `acfc854` unified site themes, Account workspace styling, About/News themes, and robotics visuals. `origin/main` pointed to `acfc854` at snapshot time.
- Local commits `406341e` through `c98fd40` added and refined the Coming Soon robot scene; the final commit reverted only the attempted raster-to-animated-SVG replacement.
- `a7566c7` updated the Victoria Chen team profile. Treat personnel copy as content that may change; verify current `app/about/page.tsx` before editing.

## Five-layer router

| Layer | Read when the task concerns | Reference |
| --- | --- | --- |
| 01 Clients | Public website, header, themes, mobile, Talents/Education/Robotics/News/Login, EAIC Hub UI | [`references/01-clients.md`](references/01-clients.md) |
| 02 Unified API | Auth, account contracts, validation, SDK references, submissions, robot slots, stable errors | [`references/02-unified-api.md`](references/02-unified-api.md) |
| 03 Cloud Core | Supabase business state, credits, reservations, authorization, AI review, billing, audit | [`references/03-cloud-core.md`](references/03-cloud-core.md) |
| 04 Edge Runtime | Translators, trusted runners, simulators, robot adapters, safety, operator runbooks | [`references/04-edge-runtime.md`](references/04-edge-runtime.md) |
| 05 Delivery | LiveKit/H.264, camera views, telemetry, captures, heartbeat, device/execution results | [`references/05-delivery.md`](references/05-delivery.md) |

## Shared decisions that must survive handoff

- The operating loop is `Clients -> Unified API -> Cloud authorization -> Edge execution -> Delivery -> Unified API -> Clients`.
- Next.js route files stay under `app/`; `features/eaic/` expresses ownership. One-line `lib/` exports preserve old import paths.
- Never execute or send raw customer Python to a robot. Translate accepted literal SDK calls into an inert, hashed plan and revalidate it at the trusted runner.
- Passing offline tests proves software behavior only. It does not prove physical safety, calibration, live media availability, or a successful robot run.
- Server APIs enforce identity, entitlements, credits, hashes, reservations, and state. Browser visibility is never authorization.
- Do not put credentials, private robot-network details, vendor SDK internals, production secrets, or translated real-robot code in public UI or documentation.
- Light canvases use warm off-white `#f5f4f1` unless the user explicitly requests another color.
- Typography is responsibility-based: Oxanium = Display/brand/headings; Manrope = Interface/body/navigation; IBM Plex Mono = Technical/code/measurements/IDs. Only IBM Plex Mono 400/500 are loaded.
- Scope theme changes to the page and prefer stable `data-*` hooks. Check source image opacity/overlays before replacing a good asset.
- Preserve the dirty worktree. Do not reset, overwrite unrelated changes, create/merge a PR, or push unless explicitly requested.
- The user's collaboration preference: if a request is long or imprecise, first restate it as a short professional requirement. Execute directly unless there are multiple materially different product choices.

## Short prompt to give another agent

```text
Continue the Agentech project from the current working tree. Read AGENTS.md and .codex/skills/agentech-project-memory/SKILL.md, then load only the relevant one of its five reference files. Preserve all existing changes and verify current source before acting.
```

## Verification baseline

Start focused, then expand in proportion to risk:

```bash
pnpm test:site-header-visibility
pnpm test:theme
pnpm test:talents-page
node --experimental-strip-types --test lib/mobile-priority-ui.test.ts lib/mobile-medium-priority-ui.test.ts lib/robotics-product-browser.test.ts
pnpm typecheck
pnpm build
```

Robot, auth, billing, or delivery changes require their layer-specific tests in addition to the baseline.

If a Codex desktop shell reports `node: command not found` or `python: command not found`, load the workspace dependency paths and prepend the returned Node/Python directories before rerunning. Do not misreport a missing runtime on `PATH` as a failing test.

Run `pnpm typecheck` and `pnpm build` sequentially. Next.js rebuilds `.next/types`; running both concurrently can produce transient TS6053 “file not found” errors even when the production build succeeds.
