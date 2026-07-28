"""Stable JSON-serializable intermediate representation."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


COMMAND_TYPES = {
    "STATE_CHANGE",
    "VELOCITY_MOTION",
    "POSITION_MOTION",
    "ROTATION",
    "BODY_POSE",
    "BODY_HEIGHT",
    "PREDEFINED_ACTION",
    "SAFETY",
    "CONFIGURATION",
    "WAIT",
    "STATE_QUERY",
    "UNKNOWN_SEMANTICS",
}


@dataclass(frozen=True)
class SourceLocation:
    file: str
    line: int
    column: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SimulationCommand:
    command_id: str
    sequence_index: int
    source_method: str
    canonical_method: str
    category: str
    command_type: str
    parameters: dict[str, Any]
    raw_arguments: dict[str, Any]
    defaults_applied: tuple[str, ...]
    start_time: float | None
    duration: float | None
    blocking: bool | None
    coordinate_frame: str | None
    expected_end_state: str | None
    ground_truth_reference: dict[str, Any] | None
    unresolved_metadata: tuple[str, ...]
    warnings: tuple[dict[str, Any], ...]
    source_location: SourceLocation
    sdk_semantics: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.command_type not in COMMAND_TYPES:
            raise ValueError(f"Unknown IR command type: {self.command_type}")

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["defaults_applied"] = list(self.defaults_applied)
        value["unresolved_metadata"] = list(self.unresolved_metadata)
        value["warnings"] = list(self.warnings)
        return value


def command_type_for(category: str, canonical_method: str) -> str:
    if category == "movement":
        if canonical_method == "turn":
            return "ROTATION"
        if canonical_method == "return_to_home":
            return "POSITION_MOTION"
        return "VELOCITY_MOTION"
    if category == "athletics" or category == "actions":
        return "PREDEFINED_ACTION"
    if category == "posture":
        if canonical_method == "stand_high":
            return "BODY_HEIGHT"
        if canonical_method == "stand":
            return "STATE_CHANGE"
        return "BODY_POSE"
    if category == "safety":
        return "SAFETY"
    if category == "configuration":
        return "CONFIGURATION"
    if category == "sensing":
        return "STATE_QUERY"
    return "UNKNOWN_SEMANTICS"
