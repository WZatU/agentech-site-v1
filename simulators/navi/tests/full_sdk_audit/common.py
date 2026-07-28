from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_audit"
INDEPENDENT = ROOT / "results" / "full_sdk_independent_audit"


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def audit_execution() -> dict[str, Any]:
    return load_json(REPORT / "audit_execution_summary.json")


def capability_entries() -> list[dict[str, Any]]:
    return load_json(ROOT / "config" / "backend_capabilities.json")["entries"]


def truth(value: str) -> bool:
    return value.lower() == "true"
