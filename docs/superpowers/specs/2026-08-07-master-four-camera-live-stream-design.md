# Master Four-Camera Live Stream Design

## Goal

Show Master's three front RGB cameras and RGB-D Color camera in the website's existing Live Stream area during an active scheduled Master session. The free viewing experience must never exceed one 4K output: users may watch a 2x2 wall made from four 1080p views or focus on one camera at up to its native 4K resolution.

The existing Aegies and Navi Live Stream behavior must remain unchanged.

## Camera Scope

Use only these Master Robot Vision sources:

| Website label | Master Robot Vision sensor ID | Robot topic |
| --- | --- | --- |
| Front Main | `front-main` | `/aima/hal/sensor/rgb_head_front_center/rgb_image/compressed` |
| Front Left | `front-left` | `/aima/hal/sensor/stereo_head_front_left/rgb_image/compressed` |
| Front Right | `front-right` | `/aima/hal/sensor/stereo_head_front_right/rgb_image/compressed` |
| RGB-D Color | `rgbd-color` | `/aima/hal/sensor/rgbd_head_front/rgb_image/compressed` |

Do not include Rear View, Depth Map, or LiDAR 3D.

## User Experience

The existing live-session response already identifies the active robot model. `LiveRobotCamera` will preserve its current rendering and behavior for Aegies and Navi. When and only when the active model is `Master`, the live-camera area will render Master-specific controls and status.

Master provides two mutually exclusive modes:

- **Camera Wall:** a single 3840x2160 output containing four labeled 1920x1080 camera allocations.
- **Focus View:** a single selected color camera fills the 3840x2160 output. The user may select Front Main, Front Left, Front Right, or RGB-D Color. The other three camera subscriptions stop while focus mode is active.

The initial Master mode is Camera Wall. Changing modes does not create additional LiveKit tracks. The interface reports the actual incoming resolution. A source below 4K may be fitted into the output but must not be described as native 4K.

Master-only controls must not appear before a scheduled Master session starts, during an Aegies or Navi session, or after the Master session ends.

## Architecture

### Robot-connected gateway

The Windows computer connected to Master runs Master Robot Vision and the existing website robot-stream bridge. Master Robot Vision remains the sole owner of the robot's coBridge connection and retains its existing read-only `/robot` boundary.

A Master compositor module on that gateway consumes the four approved color feeds through the local Master Robot Vision relay. It produces exactly one video program:

- wall mode composites the latest four frames into one 3840x2160 canvas;
- focus mode subscribes only to the selected camera's native-resolution compressed topic and fits it into the same output canvas.

The compositor publishes that one program as the scheduled room's LiveKit video track. It must use latest-frame-only queues and discard superseded frames so latency cannot grow without bound. The robot should use its wired development connection for live operation because the Master Robot Vision documentation identifies the RGB set as exceeding the measured Wi-Fi link capacity.

For production, the gateway publishes to the existing LiveKit Cloud project named `agentech-robot-lab`. AGENTECH01 is the persistent gateway: Master remains connected to it through the wired `10.0.1.0/24` robot network, while AGENTECH01 reaches LiveKit Cloud through its normal internet connection. The developer laptop is not part of the production data path.

### Website

The website continues to obtain a viewer token from `/api/livekit-token` and subscribe to the scheduled room. The existing token response supplies `robotModel`, allowing the client to select the Master presentation without exposing robot addresses or credentials.

Master mode commands are sent through an authenticated, session-bound website API. The API accepts only:

- mode: `wall` or `focus`;
- camera ID: one of the four allowlisted color sensor IDs when mode is `focus`.

The gateway polls or receives the current session-bound selection through its authenticated control channel. The browser never connects directly to `127.0.0.1:4173`, the robot coBridge address, or the SDK endpoint.

The main website is deployed through its existing Vercel project. Vercel stores the LiveKit URL, API key, and API secret as environment variables; only `NEXT_PUBLIC_LIVEKIT_URL` is exposed to the browser. The API secret is never committed to Git, copied into client-side code, or exposed by the gateway's public interface.

### Free-tier enforcement

The browser controls are not the authority for bandwidth limits. The server and gateway validate every selection and always publish exactly one output track with a maximum frame size of 3840x2160.

- wall mode allows four 1920x1080 allocations;
- focus mode allows one camera at up to 3840x2160 and disables the other two subscriptions;
- malformed, unauthorized, expired-session, non-Master, and unsupported-camera requests are rejected without changing the current mode.

This design adds no paid-tier behavior. It establishes the requested free limit only.

## State and Data Flow

1. A scheduled session becomes active and identifies its robot model.
2. For Aegies or Navi, the current Live Stream flow continues unchanged.
3. For Master, the gateway starts the Master compositor in wall mode and publishes one LiveKit video track.
4. The website subscribes to the track and displays Master-only Wall/Focus controls.
5. A mode selection is authenticated against the signed-in account and active Master session.
6. The gateway applies the validated selection, changes robot subscriptions, and keeps publishing on the same LiveKit track.
7. At session end, the gateway stops the compositor and camera subscriptions; the website returns to its existing waiting state.

The production path is therefore `Master -> Ethernet -> AGENTECH01 -> LiveKit Cloud -> Vercel website`. Reboot recovery on AGENTECH01 must start both the robot relay and the LiveKit publisher automatically without requiring the developer laptop.

## Failure Handling

- If one wall camera is unavailable, its quadrant shows a labeled `Camera unavailable` placeholder while the remaining feeds continue.
- If a requested focus camera is unavailable, the gateway retains the last safe viewing mode and reports the failure.
- Robot, relay, gateway, and LiveKit interruptions use bounded automatic reconnection and latest-frame-only recovery.
- A mode request cannot extend a booking, grant LiveKit access, expose SDK control, or move the robot.
- Session end overrides every viewing selection and closes Master camera subscriptions.

## Testing and Acceptance

Offline automated tests must verify:

- the four-camera allowlist and exclusion of rear, depth, and LiDAR;
- four 1080p allocations in a 4K canvas;
- focus mode disables the three non-selected subscriptions;
- one output track is used in both modes;
- invalid camera IDs and non-Master sessions are rejected;
- Aegies and Navi rendering, capture behavior, and stream lifecycle are unchanged;
- Master controls appear only during an active Master session;
- individual camera failure produces the correct labeled placeholder;
- session termination closes the compositor and subscriptions.

A supervised hardware acceptance test is required after offline verification. Connect the gateway to Master through the robot's wired network, run Master Robot Vision, confirm all four approved color feeds, switch repeatedly between wall and every focus camera, record actual source/output resolutions, verify latency does not accumulate, and confirm Aegies and Navi still follow their existing paths in non-Master test sessions.

## Out of Scope

- Changing Aegies or Navi Live Stream behavior.
- Publishing Rear View, Depth Map, or LiDAR.
- Publicly exposing the Master Robot Vision dashboard or local relay.
- Adding a paid streaming tier.
- Robot motion or SDK-command changes.
