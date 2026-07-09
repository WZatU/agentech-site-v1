from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RuntimeConfig:
    xml_path: str
    steps: int = 100
    output_path: str = "simulation_output.json"
    sample_every: int = 10
    fail_on_nan: bool = True

