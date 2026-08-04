# 02 - Unified API Layer

This is the near-term integration priority. It provides a shared contract for all clients and routes work to the correct service without exposing service databases.

## Cross-cutting contract

- Versioned internal API and event contract.
- External MCP gateway, starting with the CLI.
- Authentication and authorization on every protected operation.
- Trace ID propagation across services and runtime boundaries.
- Idempotency keys for mutations and execution requests.
- Stable error codes with safe, actionable messages.

## API domains

| Domain | Folder | Core resources |
| --- | --- | --- |
| Identity and access | `identity-access/` | Account, organization, role, credit, entitlement |
| Projects and validation | `projects-validation/` | Project, artifact, version, hash, check, result |
| Resources and runs | `resources-runs/` | Robot, cell, bay, arena, scheduler, reservation, run |
| Live and results | `live-results/` | Live stream, telemetry, storage, report, usage |
