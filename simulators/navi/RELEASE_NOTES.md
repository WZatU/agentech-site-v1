# Release Notes — Navi MuJoCo SDK Translator v1.0.0

Release date: 2026-07-27

## Scope

This is the first reproducible source/evidence release of the restricted Navi
SDK-to-MuJoCo translator.

- 117/117 canonical methods have structured handling.
- 80/80 physical-behavior claims have evidence.
- 52/52 correction-audit `APPROXIMATE` findings were processed: 26 behavior
  corrections and 26 explicit retained limitations.
- Behavior clusters improved from 42 to 66; duplicate/near-duplicate members
  decreased from 54 to 25.
- Cross-artifact inconsistencies decreased from 7 to 0.

These numbers do not mean that all methods are complete hardware equivalents.

## Safety and integrity

- generic fallback: 0;
- silent success: 0;
- direct action-time state injection: 0;
- fatal safety findings in final acceptance: 0;
- correction and independent audit evidence preserved.

## Validation

- Correction: 23/23;
- Full SDK: 40/40;
- Audit: 18/18;
- Translation Core: 64/64;
- MuJoCo Backend: 25/25;
- quick: 15/15;
- model validation: 20/20;
- fresh full physics regression: 67/67;
- canonical CLI acceptance: 117/117.

The release gate reruns and records these results.

## Packaging and interfaces

- standard `pyproject.toml` installation;
- console scripts: `navi-sim`, `navi-sdk-acceptance`,
  `navi-sim-smoke-test`;
- centralized `VERSION`;
- versioned JSON result/capability/trace/matrix schemas;
- unique default output and explicit overwrite policy;
- path-portability, deterministic replay, clean-install and ZIP checks.

## Model and physics

No robot XML, scene XML, mesh, mass, inertia, gravity, friction, joint limit,
actuator limit or audit threshold was changed for this release.

## Known limitations

Official return/blocking/async contracts, exact vendor trajectories, missing
head/camera/perception/planning capabilities, water simulation, real hardware
state and some high-dynamic actions remain unresolved or unavailable.

See `docs/known_limitations.md`.

## Compatibility

The legacy capability `status` field remains for compatibility but is
deprecated and mechanically derived from the four-axis model. New result JSON
uses schema version 1.0.0 and adds release/provenance fields.

## Install or upgrade

```bash
python -m pip install .
```

For development and video:

```bash
python -m pip install -e ".[dev,video]"
```

Review the capability matrix and known limitations before relying on a method.

This release does not claim exact reproduction of every action, all Ground
Truth videos, the complete official SDK contract, or autonomous robot behavior.
