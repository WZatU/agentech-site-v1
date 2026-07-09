from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class RuntimeErrorRecord:
    code: str
    message: str
    suggestion: str = ""
    detail: Any | None = None

    def to_dict(self) -> dict[str, Any]:
        data = {
            "code": self.code,
            "message": self.message,
            "suggestion": self.suggestion,
        }
        if self.detail is not None:
            data["detail"] = str(self.detail)
        return data


class MuJoCoRuntimeError(Exception):
    def __init__(self, record: RuntimeErrorRecord):
        super().__init__(record.message)
        self.record = record


def not_installed_error(detail: Any | None = None) -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_NOT_INSTALLED",
        message="The Python package 'mujoco' is not installed.",
        suggestion="Install it with: pip install mujoco",
        detail=detail,
    )


def xml_not_found_error(xml_path: str) -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_XML_NOT_FOUND",
        message=f"MuJoCo XML file was not found: {xml_path}",
        suggestion="Check the XML path in project_manifest.json or pass a valid --xml path.",
    )


def load_failed_error(xml_path: str, detail: Any) -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_LOAD_FAILED",
        message=f"MuJoCo failed to load XML: {xml_path}",
        suggestion="Check XML syntax, include files, mesh paths, actuator definitions, and compiler settings.",
        detail=detail,
    )


def step_failed_error(detail: Any) -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_STEP_FAILED",
        message="MuJoCo failed while stepping the simulation.",
        suggestion="Check model stability, timestep, actuator controls, and invalid numeric states.",
        detail=detail,
    )


def invalid_control_shape_error(expected: int, actual: int) -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_INVALID_CONTROL_SHAPE",
        message=f"Control vector length mismatch. Expected {expected}, got {actual}.",
        suggestion="Pass one control value per actuator.",
    )


def nan_state_error() -> RuntimeErrorRecord:
    return RuntimeErrorRecord(
        code="MUJOCO_NAN_STATE",
        message="Simulation state contains NaN or infinite values.",
        suggestion="Check unstable joints, actuator limits, collision geometry, mass, inertia, and timestep.",
    )

