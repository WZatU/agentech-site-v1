"""Complete, validated backend capability registry for all canonical methods."""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from translator.schema_validation import validate_capabilities


class BackendCapabilityStatus(str, Enum):
    IMPLEMENTED = "IMPLEMENTED"
    SIMULATED = "SIMULATED"
    APPROXIMATE = "APPROXIMATE"
    UNAVAILABLE_IN_MUJOCO = "UNAVAILABLE_IN_MUJOCO"
    BLOCKED_BY_MODEL = "BLOCKED_BY_MODEL"
    BLOCKED_BY_UNRESOLVED_SPEC = "BLOCKED_BY_UNRESOLVED_SPEC"
    HARDWARE_ONLY = "HARDWARE_ONLY"
    UNSAFE_TO_SIMULATE = "UNSAFE_TO_SIMULATE"
    FAILED = "FAILED"


class BackendBehaviorStatus(str, Enum):
    PHYSICALLY_IMPLEMENTED = "PHYSICALLY_IMPLEMENTED"
    SIMULATED = "SIMULATED"
    APPROXIMATE = "APPROXIMATE"
    NO_MEANINGFUL_MOTION = "NO_MEANINGFUL_MOTION"
    BLOCKED_BY_MODEL = "BLOCKED_BY_MODEL"
    HARDWARE_ONLY = "HARDWARE_ONLY"
    UNAVAILABLE = "UNAVAILABLE"
    UNSAFE_PROVEN = "UNSAFE_PROVEN"
    FAILED = "FAILED"


class SdkContractStatus(str, Enum):
    RESOLVED = "RESOLVED"
    PARTIALLY_RESOLVED = "PARTIALLY_RESOLVED"
    RETURN_UNRESOLVED = "RETURN_UNRESOLVED"
    BLOCKING_UNRESOLVED = "BLOCKING_UNRESOLVED"
    ASYNC_UNRESOLVED = "ASYNC_UNRESOLVED"
    MULTIPLE_UNRESOLVED = "MULTIPLE_UNRESOLVED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class GroundTruthStatus(str, Enum):
    DIRECT_CONFIRMED = "DIRECT_CONFIRMED"
    LEGACY_CONFIRMED = "LEGACY_CONFIRMED"
    INFERRED = "INFERRED"
    AMBIGUOUS = "AMBIGUOUS"
    CONFLICT = "CONFLICT"
    UNMATCHED = "UNMATCHED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class EvidenceStatus(str, Enum):
    VERIFIED = "VERIFIED"
    VERIFIED_WITH_LIMITATIONS = "VERIFIED_WITH_LIMITATIONS"
    INSUFFICIENT = "INSUFFICIENT"
    CONTRADICTED = "CONTRADICTED"


EXECUTABLE_CAPABILITY_STATUSES = {
    BackendCapabilityStatus.IMPLEMENTED,
    BackendCapabilityStatus.SIMULATED,
    BackendCapabilityStatus.APPROXIMATE,
}

CAPABILITY_ERROR_CODES = {
    BackendCapabilityStatus.UNAVAILABLE_IN_MUJOCO: "BACKEND_METHOD_UNAVAILABLE",
    BackendCapabilityStatus.BLOCKED_BY_MODEL: "BACKEND_METHOD_BLOCKED_BY_MODEL",
    BackendCapabilityStatus.BLOCKED_BY_UNRESOLVED_SPEC: "BACKEND_METHOD_BLOCKED_BY_SPEC",
    BackendCapabilityStatus.HARDWARE_ONLY: "BACKEND_METHOD_HARDWARE_ONLY",
    BackendCapabilityStatus.UNSAFE_TO_SIMULATE: "BACKEND_METHOD_UNSAFE",
    BackendCapabilityStatus.FAILED: "BACKEND_EXECUTION_FAILED",
}


@dataclass(frozen=True)
class BackendCapabilityEntry:
    method: str
    category: str
    status: BackendCapabilityStatus
    backend_behavior_status: BackendBehaviorStatus
    sdk_contract_status: SdkContractStatus
    ground_truth_status: GroundTruthStatus
    evidence_status: EvidenceStatus
    reason: str
    implementation: str
    ground_truth: tuple[str, ...]
    video_status: str
    limitations: tuple[str, ...]
    test_ids: tuple[str, ...]
    batch: str
    physical_execution: bool
    scenario_required: bool
    hardware_dependency: tuple[str, ...]
    model_dependency: tuple[str, ...]
    allowed_start_states: tuple[str, ...]
    preparation_state: str
    active_state: str
    expected_end_state: str
    recovery_state: str
    interruptibility: str
    timeout: str

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "BackendCapabilityEntry":
        return cls(
            method=value["method"],
            category=value["category"],
            status=BackendCapabilityStatus(value["status"]),
            backend_behavior_status=BackendBehaviorStatus(
                value["backend_behavior_status"]
            ),
            sdk_contract_status=SdkContractStatus(value["sdk_contract_status"]),
            ground_truth_status=GroundTruthStatus(value["ground_truth_status"]),
            evidence_status=EvidenceStatus(value["evidence_status"]),
            reason=value["reason"],
            implementation=value["implementation"],
            ground_truth=tuple(value.get("ground_truth", ())),
            video_status=value.get("video_status", "NO_VIDEO"),
            limitations=tuple(value.get("limitations", ())),
            test_ids=tuple(value.get("test_ids", ())),
            batch=value["batch"],
            physical_execution=bool(value["physical_execution"]),
            scenario_required=bool(value["scenario_required"]),
            hardware_dependency=tuple(value.get("hardware_dependency", ())),
            model_dependency=tuple(value.get("model_dependency", ())),
            allowed_start_states=tuple(value.get("allowed_start_states", ())),
            preparation_state=value["preparation_state"],
            active_state=value["active_state"],
            expected_end_state=value["expected_end_state"],
            recovery_state=value["recovery_state"],
            interruptibility=value["interruptibility"],
            timeout=value["timeout"],
        )

    @property
    def executable(self) -> bool:
        return self.status in EXECUTABLE_CAPABILITY_STATUSES

    @property
    def derived_legacy_status(self) -> BackendCapabilityStatus:
        behavior = self.backend_behavior_status
        evidence = self.evidence_status
        if behavior is BackendBehaviorStatus.PHYSICALLY_IMPLEMENTED:
            if (
                self.sdk_contract_status is SdkContractStatus.RESOLVED
                and evidence is EvidenceStatus.VERIFIED
            ):
                return BackendCapabilityStatus.IMPLEMENTED
            return BackendCapabilityStatus.APPROXIMATE
        if behavior is BackendBehaviorStatus.SIMULATED:
            return BackendCapabilityStatus.SIMULATED
        if behavior is BackendBehaviorStatus.APPROXIMATE:
            if evidence in {
                EvidenceStatus.INSUFFICIENT,
                EvidenceStatus.CONTRADICTED,
            }:
                return BackendCapabilityStatus.BLOCKED_BY_UNRESOLVED_SPEC
            return BackendCapabilityStatus.APPROXIMATE
        if behavior is BackendBehaviorStatus.NO_MEANINGFUL_MOTION:
            return BackendCapabilityStatus.APPROXIMATE
        if behavior is BackendBehaviorStatus.BLOCKED_BY_MODEL:
            return BackendCapabilityStatus.BLOCKED_BY_MODEL
        if behavior is BackendBehaviorStatus.HARDWARE_ONLY:
            return BackendCapabilityStatus.HARDWARE_ONLY
        if behavior is BackendBehaviorStatus.UNAVAILABLE:
            if self.model_dependency:
                return BackendCapabilityStatus.UNAVAILABLE_IN_MUJOCO
            return BackendCapabilityStatus.BLOCKED_BY_UNRESOLVED_SPEC
        if behavior is BackendBehaviorStatus.UNSAFE_PROVEN:
            return BackendCapabilityStatus.UNSAFE_TO_SIMULATE
        return BackendCapabilityStatus.FAILED

    @property
    def error_code(self) -> str | None:
        return CAPABILITY_ERROR_CODES.get(self.status)

    def to_dict(self) -> dict[str, Any]:
        return {
            "method": self.method,
            "category": self.category,
            "status": self.status.value,
            "backend_behavior_status": self.backend_behavior_status.value,
            "sdk_contract_status": self.sdk_contract_status.value,
            "ground_truth_status": self.ground_truth_status.value,
            "evidence_status": self.evidence_status.value,
            "reason": self.reason,
            "implementation": self.implementation,
            "ground_truth": list(self.ground_truth),
            "video_status": self.video_status,
            "limitations": list(self.limitations),
            "test_ids": list(self.test_ids),
            "batch": self.batch,
            "physical_execution": self.physical_execution,
            "scenario_required": self.scenario_required,
            "hardware_dependency": list(self.hardware_dependency),
            "model_dependency": list(self.model_dependency),
            "allowed_start_states": list(self.allowed_start_states),
            "preparation_state": self.preparation_state,
            "active_state": self.active_state,
            "expected_end_state": self.expected_end_state,
            "recovery_state": self.recovery_state,
            "interruptibility": self.interruptibility,
            "timeout": self.timeout,
        }


class BackendCapabilityRegistry:
    def __init__(self, entries: tuple[BackendCapabilityEntry, ...]):
        self.entries = entries
        self._by_method = {entry.method: entry for entry in entries}
        if len(entries) != 117 or len(self._by_method) != 117:
            raise ValueError("Backend capability registry must contain 117 unique entries")
        mismatches = {
            entry.method: {
                "stored": entry.status.value,
                "derived": entry.derived_legacy_status.value,
            }
            for entry in entries
            if entry.status is not entry.derived_legacy_status
        }
        if mismatches:
            raise ValueError(
                "Legacy capability status must be derived from the four-axis "
                f"status model: {mismatches}"
            )

    @classmethod
    def load(cls, path: str | Path | None = None) -> "BackendCapabilityRegistry":
        source = (
            Path(path)
            if path is not None
            else Path(__file__).resolve().parents[1]
            / "config"
            / "backend_capabilities.json"
        )
        payload = json.loads(source.read_text(encoding="utf-8"))
        validate_capabilities(payload)
        entries = tuple(
            BackendCapabilityEntry.from_dict(value)
            for value in payload["entries"]
        )
        if payload.get("canonical_method_count") != len(entries):
            raise ValueError("Capability metadata count does not match entries")
        return cls(entries)

    def get(self, method: str) -> BackendCapabilityEntry:
        try:
            return self._by_method[method]
        except KeyError as exc:
            raise KeyError(f"No backend capability entry for {method!r}") from exc

    def __contains__(self, method: str) -> bool:
        return method in self._by_method

    def methods(self) -> tuple[str, ...]:
        return tuple(self._by_method)
