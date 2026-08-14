# Master Hybrid JPEG Wall and H.264 Focus Design

## Goal

Keep the existing low-latency four-camera Master wall for general monitoring, but switch to one native-resolution H.264 camera when the viewer opens a camera. The focused path must stop the other three camera subscriptions and avoid JPEG decoding, canvas scaling, and browser re-encoding.

This change applies only to Master. Aegis and Navi behavior, rooms, publishers, and controls remain unchanged.

## Confirmed camera capabilities

The focused H.264 stream uses each configured raw ROS color topic at its native dimensions without upscaling:

| Camera | Focus resolution | Encoding target |
| --- | ---: | --- |
| Front Main | 1920x1080 | H.264, up to 30 FPS |
| Front Left | 2064x1552 | H.264, up to 30 FPS |
| Front Right | 2064x1552 | H.264, up to 30 FPS |
| RGB-D Color | 640x480 | H.264, up to 30 FPS |

The target is 30 FPS, but the website must report measured FPS rather than promise 30 FPS. Current robot measurements are approximately 16-21 FPS for the high-resolution side cameras. RGB-D Color cannot become 2K because its raw source is 640x480.

## Modes

### Wall mode

- Preserve the established four-camera wall appearance and controls.
- Read the existing compressed/JPEG color topics at the established preview resolution.
- Compose the four views into the existing `master-program` canvas.
- Publish one LiveKit video track named `master-program`.
- Do not run or publish the native H.264 focus pipeline in wall mode.

This retains the smoother wall behavior and keeps LiveKit publisher/track count low.

### Focus mode

- The selected camera fills the viewing area.
- Stop and unpublish `master-program` before the focused track becomes authoritative.
- Stop all JPEG wall subscriptions.
- Stop the other three raw camera subscriptions and H.264 encoders.
- Subscribe only to the selected camera's raw ROS color topic.
- Encode on the Master robot with the NVIDIA H.264 path at native resolution.
- Forward the existing H.264 access units through AGENTECH01 without resizing or re-encoding.
- Publish only the selected camera's LiveKit track:
  - `master-front-main`
  - `master-front-left`
  - `master-front-right`
  - `master-rgbd-color`
- The website subscribes only to the selected track.

Returning to wall mode unpublishes the focused track, stops the raw H.264 subscription, and restores the JPEG wall publisher.

## Ownership and transition rules

The JPEG wall publisher and native H.264 gateway are mutually exclusive owners of a Master session:

| Session state | JPEG wall publisher | Native H.264 gateway | Viewer subscription |
| --- | --- | --- | --- |
| Inactive | disconnected | disconnected | none |
| Wall | one `master-program` track | idle | `master-program` only |
| Focus | disconnected | one selected camera track | selected camera only |

Both publishers read the same server-side Master selection, but each is allowed to connect only for its own mode. A mode change must first stop the previous publisher and then start the new publisher. A short transition overlap must not be used because duplicate LiveKit participants increase billed participant minutes and can cause identity replacement or flashing.

The UI shows a neutral `Switching camera...` state while waiting for the first decodable H.264 keyframe. A 1-2 second switch is acceptable. The current wall or focused frame may remain visible until the replacement track is ready, but it must be labeled as switching and must not continue consuming the old camera subscriptions.

## Website behavior

- The existing Master controls remain the only way to change wall/focus selection.
- Master connects with `autoSubscribe: false`.
- In wall mode, only `master-program` is subscribed.
- In focus mode, only the chosen `master-*` track is subscribed.
- Stale or unexpected Master tracks are explicitly unsubscribed and never rendered.
- Track labels show actual decoded dimensions and measured FPS.
- If the native H.264 focus track does not arrive within the timeout, the UI reports the failure and offers a return to wall mode; it does not silently start three extra streams.
- The local `masterCameraPreview=1` page continues to use the direct H.264 preview for diagnostics and is not the production wall transport.

## AGENTECH01 and robot behavior

- The existing hidden scheduled tasks remain the service mechanism; no visible terminal window is introduced.
- The headless Master wall publisher publishes only in wall mode.
- `master-h264-gateway.exe` publishes only in focus mode.
- The primary relay forwards H.264 access units unchanged.
- The robot mode manager maintains exactly one encoder in focus mode and requests a keyframe when the focused viewer connects or reconnects.
- Session expiry, robot disconnect, or gateway authorization failure stops both publishers and all robot subscriptions.

## Security and billing constraints

- Publisher tokens continue to come from the authenticated Master gateway endpoint and remain scoped to the scheduled Master room.
- The gateway secret is never sent to the browser.
- At most one Master publisher participant is active for a scheduled session.
- A wall uses one composite LiveKit track; focus uses one native H.264 LiveKit track.
- Viewer participant accounting remains unchanged.

## Testing

Automated coverage must verify:

1. Wall selection subscribes to `master-program` and rejects all native camera tracks.
2. Focus selection subscribes to exactly the requested native camera track.
3. Changing focus unsubscribes the prior camera before subscribing to the next camera.
4. The wall publisher disconnects in focus mode and the H.264 gateway disconnects in wall mode.
5. The robot manager runs exactly one raw subscription/encoder in focus mode.
6. Front Main, Front Left, Front Right, and RGB-D Color retain their configured native focus dimensions.
7. Aegis and Navi tests remain unchanged and pass.
8. Session expiry and connection failures clean up publishers and subscriptions.

End-to-end verification must cover wall to focus, focus to another camera, and focus back to wall on the local site before production deployment. LiveKit must show no more than one Master publisher participant during steady wall or focus operation.

## Rollout and rollback

Deploy in this order:

1. Robot mode manager and encoder service.
2. AGENTECH01 relay, mutually exclusive publishers, and gateway.
3. Website hybrid subscription/rendering logic.
4. Local scheduled-session verification.
5. Production deployment and one short scheduled-session verification.

Rollback restores the current JPEG wall publisher and website deployment. A rollback must stop the native H.264 gateway so the two publishers cannot compete.

## Out of scope

- Changing Aegis or Navi streaming.
- Upscaling any camera beyond its raw source dimensions.
- Running four native high-resolution H.264 streams in wall mode.
- Changing LiveKit billing, the Master room name, or the session scheduling model.
- Adding rear, depth, or LiDAR views.
