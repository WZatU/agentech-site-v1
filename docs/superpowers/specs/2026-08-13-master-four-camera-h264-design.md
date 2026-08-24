# Master Four-Camera H.264 Streaming Design

Date: 2026-08-13

## Goal

Replace every JPEG stage in the Master website live-stream path with H.264 for the four approved color cameras. Camera Wall displays four independent H.264 streams, each targeting 1920x1080 at 30 FPS. Focus View stops the other three streams and sends only the selected camera at its native resolution and highest sustainable cadence, capped at 30 FPS.

This change applies only to Master. It must not change Aegis, Navi, Rear View, Depth Map, LiDAR, robot motion, or SDK command behavior.

## Approved camera scope

| Website label | Camera ID | Raw ROS 2 topic |
| --- | --- | --- |
| Front Main | `front-main` | `/aima/hal/sensor/rgb_head_front_center/rgb_image` |
| Front Left | `front-left` | `/aima/hal/sensor/stereo_head_front_left/rgb_image` |
| Front Right | `front-right` | `/aima/hal/sensor/stereo_head_front_right/rgb_image` |
| RGB-D Color | `rgbd-color` | `/aima/hal/sensor/rgbd_head_front/rgb_image` |

Rear View is explicitly excluded. The RGB-D depth image is also excluded; only its color image is allowed.

The encoder discovers and validates each raw topic's width, height, encoding, stride, and cadence at runtime. The UI reports measured values rather than claiming a resolution or FPS that the source does not provide.

## Current verified baseline

- Front Right raw RGB is `2064x1552` RGB8 and has produced approximately 23.5 to 29 FPS.
- The robot exposes NVIDIA's `nvv4l2h264enc` hardware encoder.
- The existing isolated Front Right H.264 prototype sends Annex B access units in a versioned `AH26` envelope through TCP port `22164` and AGENTECH01 `/h264/front-right`.
- A local AGENTECH01 sample delivered about 21.1 FPS at about 18.3 Mbps with no transport sequence drops. Longer probing showed source-side timing stalls even though network delivery remained healthy.
- Four legacy JPEG optimizer processes plus the focus service consume substantial robot CPU while the H.264 prototype is running. They must not compete with the new H.264 manager.
- The measured robot-to-AGENTECH01 network path has considerably more capacity than the observed camera bitrates. The current bottleneck is source/processing cadence, not the Wi-Fi or Ethernet link alone.

## User experience

### Camera Wall

- Display four separate live tiles: Front Main, Front Left, Front Right, and RGB-D Color.
- Each camera is a separate H.264 stream and a separate LiveKit video track from one gateway participant.
- Each encoder targets 1920x1080 at 30 FPS when the raw source can supply it.
- A source larger than 1920x1080 is aspect-fitted using GPU scaling. Letterboxing is allowed; stretching is not.
- A source smaller than 1920x1080, including a lower-resolution RGB-D source, remains at its true native resolution. The system does not upscale it and label it as genuine 1080p.
- A failed camera shows a labeled unavailable tile while the remaining cameras continue.

### Focus View

- Selecting a camera sends a session-bound `focus` command to the gateway.
- The browser unsubscribes the other three LiveKit tracks immediately.
- The gateway unpublishes the other three tracks and tells the robot H.264 manager to stop their raw subscriptions and encoders.
- The selected camera is restarted or reconfigured at its validated native resolution with no intermediate resizing, capped at 30 FPS.
- AGENTECH01 packetizes and forwards the robot's H.264 access units without decoding, scaling, or transcoding them.
- Returning to Camera Wall restores the four wall profiles.

A short decoder restart of up to three seconds is acceptable while switching profiles. Old frames must never be queued to hide the transition.

### Visible telemetry

Every tile or focused view reports:

- actual encoded width and height;
- measured source, encoded, and receiver FPS when available;
- current bitrate;
- connecting, live, stale, unavailable, and error states.

The interface may display `target 30 FPS`, but it must never display `30 FPS` as the measured result unless the measurement supports it.

## Architecture

### 1. Robot H.264 manager

Replace the Front-Right-specific encoder service with one mode-aware Master H.264 manager. The service owns the four allowlisted raw subscriptions and is the only active encoder path used by the website.

For each active camera it:

1. subscribes to the raw ROS 2 `Image` topic with best-effort, keep-last QoS;
2. validates the source format and converts supported RGB/BGR variants to NVIDIA NV12 surfaces;
3. scales only when applying the wall profile;
4. encodes with `nvv4l2h264enc` using low-latency H.264;
5. emits complete Annex B access units with SPS/PPS repeated on keyframes;
6. keeps only the newest unread raw frame so processing can never build latency;
7. exposes measured source FPS, encoded FPS, dropped-frame counters, bitrate, dimensions, and last-frame age.

Initial encoder settings are:

- H.264 8-bit 4:2:0 constrained-baseline or another browser-compatible profile proven by capability tests;
- no B-frames;
- one-second keyframe interval;
- rate control and bitrate configurable per camera;
- target 30 FPS, never exceeding the measured source cadence;
- wall target of 1920x1080 maximum;
- focus target of validated native resolution;
- SPS/PPS with every IDR for reconnect and profile switching.

The manager supports exactly two atomic states:

- `wall`: four wall encoders active;
- `focus:<camera-id>`: only the selected native encoder active.

Partial transitions are rolled back to a safe stopped state. A control request is rejected unless its camera ID is on the four-camera allowlist.

The current `AH26` envelope is generalized rather than replaced. It gains a camera identifier and stream-generation identifier while retaining sequence number, timestamp, dimensions, keyframe flag, and payload length. A generation change requires the receiver to discard the previous decoder state and wait for a new keyframe.

### 2. JPEG removal boundary

The following are removed from the active Master website pipeline:

- `/agentech/web/.../compressed` wall topics;
- `/agentech/web/focus/.../compressed` focus topics;
- native ROS `/compressed` topics used as a website fallback;
- browser JPEG decode and canvas re-encode stages;
- the four web JPEG optimizer processes and Master focus JPEG service while the H.264 manager is active.

The robot vendor's compressed-topic publishers are not deleted or modified because Master Robot Vision or other diagnostic tools may depend on them. They are simply never subscribed to by the new Master live-stream system. The old website JPEG implementation remains version-controlled for rollback but is unreachable during normal H.264 operation. There is no automatic JPEG fallback.

### 3. Robot-to-AGENTECH01 transport

Use one authenticated private-network control connection and either one multiplexed media connection or four fixed allowlisted media ports. The implementation plan will prefer a single multiplexed transport if it passes isolation and backpressure tests.

Transport requirements:

- complete access-unit framing;
- per-camera sequence and stream-generation validation;
- bounded payload sizes and validated dimensions;
- newest-frame/keyframe recovery under backpressure;
- reconnect waits for an IDR before forwarding deltas;
- no decode or transcode on AGENTECH01;
- private interface binding only;
- health output with per-camera byte rate, FPS, drops, and last-frame age.

The developer laptop is not part of the production media route. Production remains `Master -> AGENTECH01 -> LiveKit Cloud -> main website`.

### 4. AGENTECH01 gateway and LiveKit publisher

The current browser-compositor publisher is replaced for Master by a gateway publisher capable of writing pre-encoded H.264 samples to LiveKit. A server-side LiveKit/Pion-compatible H.264 sample track is preferred so AGENTECH01 packetizes the access units into RTP without a browser canvas encode.

The gateway joins each active room as one participant with a stable identity such as `master-gateway`. It publishes:

- wall mode: four H.264 tracks with stable names `master-front-main`, `master-front-left`, `master-front-right`, and `master-rgbd-color`;
- focus mode: only the selected track, republished with its native profile and a new stream generation.

Four tracks do not require four publisher participants. Viewer participants are still counted separately by LiveKit. Participant minutes remain the sum of each participant's connected duration, so stale browser tabs and duplicate publisher processes must be prevented.

The gateway forwards LiveKit PLI/keyframe requests to the corresponding robot encoder. It keeps a single publisher lock so a reboot or task restart cannot create duplicate gateway participants.

### 5. Website

Master-only rendering subscribes to the four named tracks in wall mode and only the selected named track in focus mode. Standard LiveKit video elements perform browser H.264 decoding on the production site; production does not depend on WebCodecs `VideoDecoder` support.

The existing direct local preview uses the same four H.264 endpoints and may use the existing WebCodecs decoder after a capability check. If WebCodecs is unavailable, it shows an explicit unsupported-browser error; it does not fall back to JPEG.

Mode commands are authenticated, tied to the active scheduled Master session, and allow only `wall` or `focus` plus one allowlisted camera ID. Session end overrides the selected mode, unsubscribes viewers, unpublishes tracks, and idles the robot H.264 manager.

Master controls remain hidden unless the active session identifies the robot model as Master. Aegis and Navi continue through their current rendering and media paths without importing the Master H.264 code.

## Load control and performance rules

- H.264 services stay idle when no authorized Master session or local test is active.
- Wall mode runs four 1080p-maximum encoders; focus mode runs exactly one native encoder.
- Queues are latest-frame-only or strictly bounded at every stage.
- The system drops superseded frames instead of increasing latency.
- It does not duplicate frames to fabricate 30 FPS.
- It does not silently lower resolution or return to JPEG. A profile that cannot be sustained is reported with its actual FPS and load evidence.
- Bitrate is tuned independently from resolution. Initial tests start with quality-preserving values, then reduce bitrate only if packet loss or LiveKit congestion is measured.
- Robot CPU, memory, NVIDIA encoder utilization, thermal throttling, and source FPS are acceptance evidence, not optional diagnostics.

If the robot cannot sustain four wall encoders after JPEG services are stopped and hardware conversion is verified, implementation pauses for measured capacity review. It must not hide the limitation by presenting upscaled low-resolution images or a false FPS label.

## Failure handling

- Missing raw topic: mark only that wall tile unavailable; focus shows a specific source error.
- Stale source: stop publishing repeated frames and expose last-frame age.
- Encoder failure: restart that encoder once, require a new keyframe, then surface the error.
- Transport corruption or oversized envelope: close the connection and record the reason.
- Gateway disconnect: reconnect with bounded backoff, reacquire the single-publisher lock, and request keyframes.
- LiveKit congestion: discard stale access units and recover at the next IDR.
- Mode switch failure: stop affected streams, report the failure, and require an explicit retry; never mix wall and focus generations.
- Session expiry: unpublish all tracks and release all robot camera subscriptions regardless of browser state.

## Security and lifecycle

- Robot media and control listeners bind only to the private Master/AGENTECH01 network.
- Browser clients never receive robot IP addresses, ROS topic access, relay tokens, or LiveKit API secrets.
- Production LiveKit credentials remain server-side on AGENTECH01/Vercel as applicable.
- Gateway mode requests require the existing signed-in account and active Master session authorization.
- Services start automatically after AGENTECH01 and Master reboot, but encoders remain idle until authorized use.
- Deployment scripts back up the current preview and production services and verify port/process ownership before replacement.
- Rollback affects only Master camera services; it does not restart motion services or Aegis/Navi media services.

## Testing strategy

### Offline tests

- The camera allowlist contains exactly the four approved IDs and raw topics.
- No active Master mapping contains `/compressed`, `/agentech/web`, or a JPEG decoder/fallback.
- Wall state activates exactly four 1080p-maximum profiles.
- Every focus state activates exactly one native profile and stops the other three.
- Invalid camera IDs and illegal state transitions are rejected.
- Envelope parsing handles split/combined reads and rejects bad versions, camera IDs, generations, lengths, and dimensions.
- Backpressure drops stale access units and resumes only from a valid keyframe.
- AGENTECH01 publishes four named tracks from one participant in wall mode and one track in focus mode.
- Duplicate gateway startup cannot create a second publisher.
- Website wall/focus subscription rules are exact and never select a JPEG route.
- Non-Master sessions cannot render or control Master tracks.
- Existing Aegis and Navi regression suites remain unchanged and pass.

### Robot and gateway tests

For each camera independently:

- record raw source format and cadence;
- encode a 30-second native sample and confirm it decodes without black frames;
- verify SPS/PPS, keyframe interval, timestamps, and measured FPS;
- compare source FPS with encoded and AGENTECH01-received FPS;
- verify no transport sequence loss on the local link.

For wall mode:

- stop the legacy JPEG optimizer/focus services;
- run all four H.264 wall profiles for at least five minutes;
- verify requested and actual dimensions for every camera;
- verify received FPS stays close to each camera's measured source cadence without accumulating latency;
- record CPU, memory, encoder utilization, temperature, bitrate, drops, and reconnect behavior.

For focus mode:

- cycle through all four cameras repeatedly;
- prove the other three encoders, transport streams, and LiveKit tracks stop;
- verify the selected native dimensions and measured FPS;
- verify returning to wall restores exactly four tracks.

### End-to-end acceptance

- Local preview and the main website display live motion from the same H.264 source.
- Camera Wall shows four independent H.264 views with no JPEG subscriptions.
- Focus View sends only the selected camera and preserves its validated native resolution.
- Front Right focus preserves `2064x1552` when the source still reports that format.
- Receiver FPS is consistent with source FPS; configured target and measured FPS are shown separately.
- Motion does not jump because of an accumulating queue.
- Main-site playback survives a viewer refresh and an AGENTECH01 gateway restart.
- A scheduled Master session starts and stops publishing automatically without the developer laptop.
- One gateway participant appears in LiveKit, with four tracks in wall mode rather than four publisher participants.
- Rear, Aegis, and Navi behavior is unchanged.

## Rollout

1. Generalize and test the robot encoder/transport offline without changing enabled services.
2. Deploy the H.264 manager disabled and test each camera manually on the private network.
3. Validate four-camera wall capacity with JPEG optimizers stopped.
4. Deploy the local AGENTECH01 relay and website preview; obtain visual acceptance.
5. Deploy the single-participant LiveKit H.264 publisher to a test room and measure receiver telemetry.
6. Update the production Master website path and run a scheduled-session acceptance test.
7. Enable reboot recovery and verify operation without the developer laptop.

Each stage has its own rollback checkpoint. Production is not promoted if four-camera capacity, focus exclusivity, session shutdown, or Aegis/Navi regression checks fail.

## Rollback

Stop and disable the multi-camera H.264 manager and H.264 gateway publisher, restore the backed-up AGENTECH01 preview/production service definitions, and restore the previous website deployment. The legacy JPEG implementation can then be re-enabled deliberately for Master only. Rollback never changes the robot vendor camera publishers, motion services, Aegis, or Navi.

