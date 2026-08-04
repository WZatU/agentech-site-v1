# Live and Results API

## Owns

- Livestream discovery and access metadata.
- Telemetry and run events.
- Video, image, and file storage references.
- Result packages and reports.
- Runtime, streaming, storage, and validation usage.

## Contract rules

- Results and telemetry reference the stable Run ID.
- Clients receive signed or authorized references, not storage credentials.
- Usage records are append-only audit evidence.
- Delivery failures do not rewrite the authoritative run state.
