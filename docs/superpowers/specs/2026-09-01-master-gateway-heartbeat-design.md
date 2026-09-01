# Master Robot Gateway Heartbeat Design

**Date:** 2026-09-01
**Status:** Approved for implementation planning

## Goal

Show the real Master robot connection and battery condition on the local EAIC SDK Library page whenever AGENTECH01 can reach the Master at `192.168.4.136`.

The browser must not infer robot health by probing the Master directly. AGENTECH01 is the authoritative gateway because it owns the robot-side SDK/ROS connection.

## Scope

This feature is read-only. It reports:

- AGENTECH01 publisher health
- Master controller reachability and SDK status
- Master posture/mode, action, and state when available
- battery percentage, voltage, and charging state only when verified telemetry exists
- observation time and freshness

It does not send movement commands, change controller mode, or alter robot configuration.

## Architecture

1. A lightweight publisher runs on AGENTECH01 every five seconds.
2. It calls the existing Master SDK `status()` method against `192.168.4.136:21274`.
3. It reads a configured and verified ROS/coBridge power telemetry source.
4. It sends one authenticated JSON observation to the website's `POST /api/master-heartbeat` endpoint.
5. The local website validates and stores the latest observation in a runtime file.
6. The SDK Library UI polls `GET /api/master-heartbeat` and renders the latest sanitized observation.
7. An observation older than 15 seconds is displayed as stale/offline.

There is deliberately no website-to-Master fallback. A green state therefore means the complete path AGENTECH01 → Master is working.

## AGENTECH01 Publisher

The publisher belongs with the existing AGENTECH01 SDK scripts and is supervised using the same operational mechanism as the other robot-side services.

Configuration:

- `MASTER_HOST=192.168.4.136`
- `MASTER_PORT=21274`
- `MASTER_HEARTBEAT_URL=http://<local-site-host>:3000/api/master-heartbeat`
- `ROBOT_RUNNER_SECRET=<shared secret>`
- `MASTER_BATTERY_TOPIC=<verified topic>` when battery telemetry is available

Each cycle has bounded connection and HTTP timeouts. A failed cycle is logged locally and retried on the next interval; failures never block the robot controller.

## Battery Telemetry

The current Master SDK exposes controller status but does not expose a battery API. Implementation must therefore inspect the live ROS/coBridge topic graph on AGENTECH01 and validate the actual power message schema before configuring `MASTER_BATTERY_TOPIC`.

The publisher must not guess or derive a percentage from an unverified field. Until a source is confirmed, it publishes:

```json
{"available":false,"percent":null,"voltage":null,"charging":null,"sourceTopic":null}
```

After verification, values are normalized and validated: percentage is 0–100, voltage is finite and positive, and charging is boolean or null.

## HTTP Contract

Example authenticated observation:

```json
{
  "schemaVersion": 1,
  "gatewayId": "agentech01",
  "observedAt": "2026-09-01T19:00:00.000Z",
  "master": {
    "host": "192.168.4.136",
    "controllerResponsive": true,
    "connection": "connected",
    "posture": "standard",
    "action": null,
    "state": null
  },
  "battery": {
    "available": true,
    "percent": 82,
    "voltage": 51.6,
    "charging": false,
    "sourceTopic": "/verified/power/topic"
  }
}
```

`POST /api/master-heartbeat` accepts `x-robot-runner-secret` or a Bearer token and compares it with `ROBOT_RUNNER_SECRET` using the site's existing timing-safe comparison pattern. Production has no default secret. Requests fail with 401 when unauthorized and 400 when the schema, timestamp, or ranges are invalid.

`GET /api/master-heartbeat` is read-only and returns the latest sanitized status plus server-derived `ageMs`, `fresh`, and `receivedAt`. It never returns the secret or internal file paths.

## Storage and Freshness

For the requested local-site phase, the endpoint atomically writes the latest valid observation to `.master-heartbeat-runtime/latest.json`; this directory is gitignored. Atomic replacement prevents readers from seeing partial JSON during a write.

Freshness is calculated from the server receipt time, not solely from the publisher clock:

- `fresh`: received within 15 seconds
- `stale`: older than 15 seconds
- `unavailable`: no valid observation has ever been received

The posted observation timestamp may differ from server time by at most 30 seconds. This catches broken gateway clocks and replayed payloads while receipt time remains authoritative for UI freshness.

A durable shared store is required before multi-instance production deployment. The API contract and UI remain unchanged when that storage adapter is added.

## SDK Library UI

The existing Master Robot card gains a compact “Live heartbeat” panel without changing the front/back joint artwork.

It displays:

- Gateway: AGENTECH01 online, stale, or unavailable
- Master controller: connected or unreachable
- Battery: percentage and charging state, or “Unavailable”
- Mode/posture when supplied by the SDK
- Last update as a relative time with the exact timestamp available on hover

Color is supplementary: every state has a text label and accessible status semantics. The UI polls every five seconds, stops cleanly on unmount, and treats fetch errors as unavailable without clearing the last known reading.

## Failure Behavior

- AGENTECH01 cannot reach Master: publish `controllerResponsive: false`; battery is unavailable unless its source independently remains valid.
- Website cannot be reached: retain no queue; retry the newest live state next cycle.
- Publisher stops: website marks the last reading stale after 15 seconds.
- Battery source disappears or becomes invalid: publish battery unavailable and keep controller status independent.
- Corrupt runtime storage: return unavailable, log the error, and accept the next valid POST.

## Verification and Acceptance

Automated tests cover authentication, strict payload validation, range checks, timestamp skew, atomic persistence, freshness transitions, and UI rendering for online, stale, unreachable, and battery-unavailable states.

Local acceptance requires:

