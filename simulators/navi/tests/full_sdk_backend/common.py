from __future__ import annotations

import json
from pathlib import Path

from backends.capabilities import BackendCapabilityRegistry
from tests.mujoco_translation.common import run_scenario


ROOT = Path(__file__).resolve().parents[2]
RAW_SPEC = json.loads((ROOT / "config" / "sdk_spec.json").read_text(encoding="utf-8"))
INVENTORY = json.loads(
    (
        ROOT
        / "outputs"
        / "new_simulation_translate"
        / "full_sdk_backend"
        / "full_method_inventory.json"
    ).read_text(encoding="utf-8")
)
VIDEO_MAPPING = json.loads(
    (
        ROOT
        / "outputs"
        / "new_simulation_translate"
        / "full_sdk_backend"
        / "full_video_mapping.json"
    ).read_text(encoding="utf-8")
)
CAPABILITIES = BackendCapabilityRegistry.load()


def run_method(call: str):
    return run_scenario(f"Agentech.{call}", max_time=60.0)

