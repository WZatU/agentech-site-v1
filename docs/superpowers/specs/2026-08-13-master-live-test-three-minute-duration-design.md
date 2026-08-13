# Master Live Test Three-Minute Duration Design

## Goal

Reduce only the internal Master view-only test session from 30 minutes to 3 minutes. Customer-booked Master sessions, Aegies sessions, Navi sessions, and LiveKit connection behavior remain unchanged.

## Design

The existing `MASTER_LIVE_TEST_DURATION_MINUTES` policy constant remains the single source of truth and changes from `30` to `3`. New internal Master test sessions therefore start immediately and receive a scheduled end exactly three minutes later. Existing sessions are not shortened retroactively.

All user-facing Master test copy and conflict messages will say three minutes. Operational documentation will describe the new test duration. Historical design and implementation-plan documents remain unchanged because they record the behavior that existed when those documents were written.

## Boundaries

- Do not change customer-selected robot-viewing durations or pricing.
- Do not change Master gateway, LiveKit publisher, viewer disconnect, or page-exit behavior.
- Do not change Aegies or Navi scheduling.
- Continue reusing an already-active internal Master test session without extending or rewriting its stored end time.

## Verification

Tests will assert that a newly created Master test window and session input end exactly three minutes after their start. Route, UI, conflict-message, and operational-document assertions will be updated where they intentionally describe the internal Master test duration. The focused Master live-test suites and the project verification commands will be run before pushing.
