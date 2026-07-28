# Versioned Result Schemas

Release v1.0.0 defines:

- `schemas/result.schema.json`;
- `schemas/capability.schema.json`;
- `schemas/trace.schema.json`;
- `schemas/sdk_method_matrix.schema.json`.

New `result.json` files include tool/schema version, four-axis status,
execution, safety, limitations, artifacts, timestamp, seed and SHA-256 hashes
for input, configuration and model resources.

Historical acceptance/audit results remain immutable and are not retroactively
rewritten. The release gate validates newly generated canonical results and
matrix rows against the v1.0.0 schemas.

Schema changes that remove or redefine fields require a new schema version.
Additive optional fields may be introduced only with compatibility tests.
