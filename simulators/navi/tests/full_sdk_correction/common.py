from __future__ import annotations

import json
from pathlib import Path

from backends.capabilities import BackendCapabilityRegistry


ROOT = Path(__file__).resolve().parents[2]
EXPECTED = json.loads(
    (ROOT / "tests" / "fixtures" / "full_sdk_expected_behavior.json").read_text(
        encoding="utf-8"
    )
)
CAPABILITIES = BackendCapabilityRegistry.load()
CORRECTION = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"
CORRECTION_RESULTS = ROOT / "results" / "full_sdk_correction"

