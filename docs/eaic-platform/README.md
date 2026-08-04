# EAIC Platform Workflow

This directory organizes team ownership and delivery work around the EAIC operating loop. It is documentation-only: application routes, components, APIs, and runtime behavior remain in their existing locations.

## Folder map

```text
docs/eaic-platform/
|-- 01-clients/
|-- 02-unified-api/
|   |-- identity-access/
|   |-- projects-validation/
|   |-- resources-runs/
|   `-- live-results/
|-- 03-cloud-core/
|-- 04-edge-runtime/
`-- 05-delivery/
```

## Operating loop

```text
Clients
  -> Unified API
  -> Cloud validation, reservation, and deployment authorization
  -> Repository edge and robot execution
  -> Livestream, telemetry, files, reports, and usage
  -> Unified API
  -> Clients
```

## Team workflow

Each work item should identify:

- Layer and API domain.
- Owner and reviewers.
- Current state: current, near-term, or future.
- Contract or event changes.
- Dependencies and rollout order.
- Test, audit, safety, and rollback requirements.

Do not place credentials, robot network details, vendor SDK internals, or production secrets in this directory.
