# 03 - Cloud Core

The cloud core owns business state and authorization. It coordinates work but does not perform hard real-time robot control.

## Workflow

1. Receive a versioned project package and hash.
2. Run cloud validation against local-validation contracts.
3. Run AI/language review when required.
4. Reserve and bind robot, venue, time, and support resources.
5. Issue deployment authorization for the exact approved package and reservation.

## Supporting records

- Accounts, organizations, permissions, credits, and entitlements.
- Robot and venue directory with capabilities and availability.
- Run state, events, anomalies, usage, and audit evidence.

Cloud services must never bypass robot-side safety or venue operators.
