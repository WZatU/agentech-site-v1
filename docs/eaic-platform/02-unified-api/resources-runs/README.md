# Resources and Runs API

## Owns

- Robot, cell, bay, and arena inventory.
- Capabilities, availability, and operational state.
- Scheduling and reservations.
- Deployment authorization binding.
- Run identity, lifecycle state, and audit timeline.

## Contract rules

- A run uses one stable Run ID across cloud, edge, robot, and delivery systems.
- Reservations bind an approved package to resources and a time window.
- Overlapping reservations are rejected atomically.
- Cloud state never bypasses local safety or emergency controls.
