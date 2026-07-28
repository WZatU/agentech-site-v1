"""Structured translation issues and internal control-flow exceptions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


ERROR_CODES = {
    "SYNTAX_ERROR",
    "FORBIDDEN_IMPORT",
    "FORBIDDEN_CALL",
    "FORBIDDEN_ATTRIBUTE",
    "DYNAMIC_IMPORT",
    "DYNAMIC_ARGUMENT_UNRESOLVED",
    "DYNAMIC_CONTROL_FLOW_UNRESOLVED",
    "UNSUPPORTED_AST_NODE",
    "SDK_IMPORT_NOT_FOUND",
    "SDK_CLASS_NOT_FOUND",
    "SDK_OBJECT_NOT_FOUND",
    "UNKNOWN_SDK_METHOD",
    "LEGACY_METHOD_NOT_PUBLIC",
    "POSITIONAL_ARGUMENT_OVERFLOW",
    "DUPLICATE_ARGUMENT",
    "UNKNOWN_KEYWORD_ARGUMENT",
    "MISSING_REQUIRED_ARGUMENT",
    "INVALID_ARGUMENT_TYPE",
    "ARGUMENT_OUT_OF_RANGE",
    "INVALID_ENUM_VALUE",
    "UNRESOLVED_DEFAULT_VALUE",
    "UNRESOLVED_PARAMETER_SEMANTICS",
    "UNRESOLVED_METHOD_SEMANTICS",
    "MAX_COMMAND_COUNT_EXCEEDED",
    "MAX_LOOP_ITERATIONS_EXCEEDED",
    "MAX_SIMULATION_TIME_EXCEEDED",
    "RECURSION_NOT_SUPPORTED",
    "CALL_GRAPH_CYCLE",
    "QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION",
    "INTERNAL_TRANSLATION_ERROR",
    "GROUND_TRUTH_CONFLICT",
    "APPROXIMATE_SCHEDULING",
}


@dataclass(frozen=True)
class TranslationIssue:
    severity: str
    error_code: str
    message: str
    file: str | None = None
    line: int | None = None
    column: int | None = None
    method: str | None = None
    parameter: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.error_code not in ERROR_CODES:
            raise ValueError(f"Unknown translation error code: {self.error_code}")
        if self.severity not in {"error", "warning"}:
            raise ValueError(f"Invalid issue severity: {self.severity}")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class TranslationAbort(Exception):
    """Internal exception used to stop one translation path safely."""

    def __init__(self, issue: TranslationIssue):
        super().__init__(issue.message)
        self.issue = issue


class StaticEvaluationError(Exception):
    def __init__(self, code: str, message: str, *, parameter: str | None = None):
        super().__init__(message)
        self.code = code
        self.parameter = parameter
