# Quickstart

## 1. Create an environment

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,video]"
```

Linux or WSL2:

```bash
source .venv/bin/activate
python -m pip install -e ".[dev,video]"
```

## 2. Check the installed commands

```bash
navi-sim --version
navi-sim --help
navi-sdk-acceptance --version
navi-sdk-acceptance --help
```

## 3. Run a headless example

```bash
navi-sim examples/movement/turn_then_forward.py \
  --allow-unresolved \
  --headless \
  --seed 0 \
  --output results/example \
  --pretty
```

Add `--overwrite` only when deliberately reusing a non-empty output directory.

## 4. Inspect results

- `result.json`: version, statuses, execution, safety, limitations, hashes.
- `state_trace.csv`: MuJoCo state trace.
- `command_metrics.json`: per-command physical metrics.
- `backend_mapping.json`: SDK-to-backend mapping and approximations.
- `video.mp4`: present only when `--record-video` is requested and supported.

Validate `result.json` against `schemas/result.schema.json`.

## 5. Viewer and video

```bash
navi-sim examples/basic/stand.py --allow-unresolved --viewer
navi-sim examples/actions/wave_hand.py --allow-unresolved --headless --record-video
```

The viewer needs a display/OpenGL environment. Video support is installed with
`.[video]`.

## 6. Run one method

Create `one_method.py`:

```python
from agentech import Agentech

Agentech.wave_hand()
```

Run:

```bash
navi-sim one_method.py --allow-unresolved --headless --pretty
```

## 7. Query and limitations

```bash
navi-sim examples/sensing/query_state.py --allow-unresolved --headless
navi-sim examples/limitations/hardware_only.py --allow-unresolved --headless
navi-sim examples/limitations/blocked_by_model.py --allow-unresolved --headless
```

Hardware-only and blocked examples intentionally return structured limitations;
they do not fabricate success.

## 8. Run all 117 canonical methods

```bash
navi-sdk-acceptance \
  --all \
  --allow-unresolved \
  --continue-on-failure \
  --headless \
  --no-video \
  --seed 0 \
  --output results/full_sdk_acceptance
```

## 9. Read capability status

Use:

- `docs/sdk_capabilities.md` for people;
- `docs/sdk_capabilities.csv` for tooling;
- `config/backend_capabilities.json` as the canonical registry.

The compatibility `status` field is deprecated and derived. Use the four-axis
fields for new integrations.

## 10. Validate the release

```bash
navi-sim-smoke-test --output results/smoke
python tools/run_release_validation.py
```
