# 05 — Live Data, Media, Results, and Delivery

## Ownership and current state

This layer returns live video, telemetry, logs, captures, files, reports, execution results, and usage through the Unified API. Every artifact should resolve to the same run/session/submission/correlation identity tuple.

Primary locations:

- `features/eaic/05-delivery/live-results/components/` — live robot camera, Master direct preview, camera controls, LiveKit grid/tile, and browser H.264 decoder.
- `app/api/livekit-token`, `app/api/agentech-capture`, `app/api/master-live-camera*`, `app/api/master-heartbeat`.
- `lib/master-live-camera*`, `lib/master-h264-view-plan.ts`, `lib/master-livekit-track-state.ts`, `lib/device-results.ts`.
- `scripts/master-camera-*`, `scripts/robot-session-device-results.mjs`, `scripts/robot-session-execution-result.mjs`.
- `docs/operations/master-livekit-production.md` and related design/operation plans.

## Implemented delivery behavior

- Normal Aegis/Navi live viewing remains behind an active scheduled session and LiveKit token flow.
- The secure CLI handoff opens the existing web live page with a short-lived signed browser session; it does not put a long-lived credential in the URL.
- Captures are session-managed and can be returned to the Hub with display-credit policy. Customer-requested filenames are replaced with safe session filenames.
- Device results and authoritative execution results are parsed/sanitized before being patched into the robot session. A compilation result cannot mark the run completed.
- Master gateway heartbeat accepts a bounded authenticated payload, validates/sanitizes it, stores the latest observation, derives freshness server-side, and reports unavailable for missing/corrupt state.

## Master H.264 architecture

```text
Master raw color topics
-> robot-side NVIDIA H.264 service
-> AGENTECH01 primary relay
-> one LiveKit publisher
-> website
```

The approved cameras are exactly Front Main, Front Left, Front Right, and RGB-D Color. Rear, depth, and LiDAR are excluded.

- Camera Wall displays four named H.264 tracks.
- Focus displays only the selected camera and stops/unsubscribes the other media work according to the production plan.
- The relay forwards H.264 access units without JPEG fallback, resizing, or re-encoding.
- The browser reports decoded resolution and measured FPS; a 30 FPS label is a target, never a fabricated measurement.
- The local preview proxy must reuse the primary connection rather than create a second robot media owner.
- Background tabs pause direct decoders and resume cleanly on visibility return.
- A media failure must not weaken account, session, model, or duration authorization.

Production measurement cells are still explicitly pending in the operations document. Do not describe the Master stream as physically accepted until the required capacity run and real measurements are recorded.

## Heartbeat history

The heartbeat evolved from a typed contract to an authenticated route, Hub panel, production persistence, local/production isolation, dedicated credential preference, private storage, and missing-bucket recovery. Keep these properties together:

- Dedicated `MASTER_HEARTBEAT_SECRET` is preferred; the runner secret is only the compatibility fallback.
- Payload is at most 16 KiB and comparisons are timing-safe.
- Local writes are atomic and mode `0600`; production uses a private `robot-heartbeats` Supabase Storage bucket.
- Storage errors are sanitized and telemetry is never invented.

## Relevant tests

```bash
pnpm test:master-live-camera
pnpm test:master-live-camera-gateway
pnpm test:master-live-test
pnpm test:master-heartbeat
pnpm test:session-device-results
pnpm test:aegis-runner
pnpm test:robot-stream-bridge
node --test scripts/master-h264-preview.test.mjs scripts/master-h264-view-plan.test.mjs
```

For live media changes also verify: authorization, expected track names, unknown/rear rejection, wall/focus subscription state, cleanup, visibility changes, no duplicate publisher/process, and a real browser console. Hardware acceptance requires recorded resolution/FPS/bitrate and synchronized evidence.

## Common failure modes

- Diagnosing a blank camera by widening authorization instead of checking the media chain.
- Starting a second relay/publisher/robot camera owner from local preview.
- Reporting target FPS as measured FPS.
- Subscribing unexpected or excluded tracks.
- Leaking relay secrets, signed tokens, or internal network data to logs/evidence.
- Losing the Run ID when delivering files/reports/results.
- Treating a stream connection as evidence that robot commands completed.
