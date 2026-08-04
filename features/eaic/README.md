# EAIC workflow modules

This directory groups EAIC implementation code by the product workflow shown in the architecture diagram.

1. `01-clients` — EAIC Hub client components and contracts.
2. `02-unified-api` — shared project validation and resource/run contracts.
3. `03-cloud-core` — cloud orchestration ownership and route pointers.
4. `04-edge-runtime` — warehouse and robot execution ownership.
5. `05-delivery` — live streams, status, files, and results returned to clients.

Next.js route files remain under `app/` because their filesystem location defines public URLs. Existing `components/` and `lib/` import paths remain as compatibility exports so this reorganization does not change the rendered site.
