# Master High-Resolution Focus Design

**Date:** 2026-08-11

## Goal

Keep Master's four-camera wall in its proven low-latency mode while making a selected camera substantially clearer. Wall mode continues to show the approved Front Main, Front Left, Front Right, and RGB-D Color views at 480x360 and up to 30 FPS. Focus mode subscribes to only the selected camera and uses a higher-resolution optimized stream.

Rear remains excluded. Aegis and Navi behavior and configuration remain unchanged.

## Selected Quality Targets

| Camera | Wall mode | Focus mode |
| --- | --- | --- |
| Front Main | 480x360, JPEG quality 25, up to 30 FPS | 1440x1080, JPEG quality 50, up to 30 FPS |
| Front Left | 480x360, JPEG quality 25, up to 30 FPS | 1440x1080, JPEG quality 50, up to 30 FPS |
| Front Right | 480x360, JPEG quality 25, up to 30 FPS | 1440x1080, JPEG quality 50, up to 30 FPS |
| RGB-D Color | 480x360, JPEG quality 25, up to 30 FPS | Native 640x480, JPEG quality 50, up to 30 FPS |

The 1440x1080 target preserves the cameras' 4:3 aspect ratio. It is nine times the pixel count of 480x360 without sending the much larger native JPEG payloads. RGB-D Color cannot be raised to 1080p because its robot-native color stream is 640x480.

## Architecture

The existing four low-latency optimizer processes and topics remain unchanged. Four additional focus topics are exposed by the Master robot camera service:

- `/agentech/web/focus/front_main/compressed`
- `/agentech/web/focus/front_left/compressed`
- `/agentech/web/focus/front_right/compressed`
- `/agentech/web/focus/rgbd_color/compressed`

Each focus optimizer subscribes to the same robot-native source as its wall counterpart. It checks whether its output publisher has a downstream subscriber before decoding and re-encoding frames. With no focus subscriber, the process stays alive for immediate switching but does not perform high-resolution image conversion. Only the currently selected focus topic consumes material conversion CPU and relay bandwidth.

The AGENTECH01 Master Robot Vision relay already supports preview and focus subscription modes. No relay protocol change is required. Wall mode subscribes to the four existing wall topics with `masterRobotMode: "preview"`. Focus mode subscribes to one focus topic with `masterRobotMode: "focus"`, which suppresses the other three camera routes for that client.

## Website Data Model and Switching

Each entry in `MASTER_LIVE_CAMERAS` gains explicit wall and focus stream metadata:

- wall topic and wall resolution label;
- focus topic and focus resolution label.

`MasterDirectCameraWall` chooses the wall topic for wall selection and the focus topic for a selected camera. The component continues to keep only the newest pending frame, decode at most one frame per camera at a time, and render into a canvas.

Changing between wall and focus recreates the WebSocket connection through the existing selection-dependent effect. This guarantees that stale wall subscriptions are closed before the focus subscription is created, and vice versa.

The displayed resolution badge is selection-aware. It shows `480x360 low latency` in wall mode, `1440x1080 high resolution` for the three front focus cameras, and `640x480 native` for RGB-D Color focus.

## Fallback and Error Handling

When the relay advertises the preferred focus topic, the website subscribes to it. If the focus topic is absent, the website subscribes to that camera's existing wall topic instead and labels the stream as a 480x360 fallback. A missing focus publisher therefore does not create a blank focus page.

If neither the focus nor wall topic is advertised, the existing unavailable/waiting state remains. WebSocket connection failures continue to use the existing reconnect loop.

The robot launcher keeps the four current wall processes as required services. A focus process failure must be restartable by the existing user service recovery behavior and must not terminate the wall publishers. The launcher must supervise focus publishers independently so one optional high-resolution failure does not remove the four-camera wall.

## Resource and Bandwidth Behavior

Wall bandwidth and conversion load remain the same as the current 480x360 configuration. In focus mode, only one high-resolution topic is subscribed and forwarded. The subscriber-aware focus optimizer prevents the other three high-resolution conversions from running when they are not selected.

The first implementation target remains JPEG over the existing relay so the behavior can be tested immediately. H.264/WebRTC/LiveKit remains a separate production transport improvement and is not part of this change.

## Testing and Verification

Automated tests must prove:

1. The approved camera allowlist contains the same four cameras and excludes Rear.
2. Every camera has distinct wall and focus topic metadata with the approved resolution labels.
3. Wall selection requests all four wall topics in preview mode.
4. Focus selection requests exactly one preferred focus topic in focus mode.
5. Focus mode falls back to the selected wall topic when the focus topic is not advertised.
6. The robot launcher preserves all four 480x360 wall publishers and defines four subscriber-aware focus publishers with the approved dimensions, quality, and FPS.
7. A focus publisher with no subscribers skips frame decoding and encoding.
8. Existing Master selection normalization, Aegis, and Navi tests continue to pass.

Hardware verification must confirm:

- Camera Wall receives all four 480x360 streams.
- Each focus button produces only one visible camera.
- Front Main, Front Left, and Front Right canvases report 1440x1080.
- RGB-D Color focus reports 640x480.
- Returning to Camera Wall restores all four low-latency streams.
- The relay remains connected and frames continue increasing after repeated wall/focus switching.

## Deployment Scope

Implementation changes are limited to the Master website camera configuration/component, the Master robot optimizer/launcher, their tests, and the deployed Master robot user service files. No Aegis or Navi settings are modified. The local preview remains development-only; production LiveKit publishing is outside this change.
