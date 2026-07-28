# Release Cleanup Plan

## Preserve

- original Full SDK acceptance;
- independent Full SDK audit;
- correction and post-correction audit;
- fresh 67-test physics regression;
- correction/release manifests;
- correction videos and release validation evidence.

## Regenerable and excluded from release packages

- `__pycache__/` and `*.pyc`;
- `.pytest_cache/`;
- local `.venv/`, `venv/` and build environments;
- `build/`, `*.egg-info/` and temporary wheel staging;
- temporary render frames and empty scratch outputs.

## Cleanup policy

Only cache/build entries under this project root may be removed. Historical
`outputs/` and `results/` are evidence and are never recursively cleaned.
Release ZIP creation applies exclusions without mutating the evidence tree.

The final report records any cache/build directories actually removed.
