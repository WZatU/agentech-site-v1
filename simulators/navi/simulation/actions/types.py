"""Action profile and internal handle types."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ActionPhase:
    name: str
    duration_s: float
    joint_offsets_rad: dict[str, float]


@dataclass(frozen=True)
class ActionProfile:
    name: str
    method: str
    phases: tuple[ActionPhase, ...]
    source: str = "configured_profile"

    @property
    def duration_s(self) -> float:
        return sum(phase.duration_s for phase in self.phases)


@dataclass(frozen=True)
class SimulationActionHandle:
    """Internal-only handle; not asserted to be the SDK return contract."""

    command_id: str
    method: str
    started_at: float
    expected_end_at: float
    internal_simulation_type: str = "SimulationActionHandle"
    not_confirmed_sdk_contract: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "command_id": self.command_id,
            "method": self.method,
            "started_at": self.started_at,
            "expected_end_at": self.expected_end_at,
            "internal_simulation_type": self.internal_simulation_type,
            "not_confirmed_sdk_contract": self.not_confirmed_sdk_contract,
        }

